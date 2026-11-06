import { getMetadata, setMetadata } from '../utils/dom-utils.js';

export const EXL_HOST = 'https://experienceleague.adobe.com';
export const SCHEMA_ORG_CONTEXT = 'https://schema.org';
export const WEB_PAGE_TYPE = 'WebPage';
export const AUDIENCE_TYPE = 'Audience';
export const SOFTWARE_APPLICATION_TYPE = 'SoftwareApplication';
export const PERSON_TYPE = 'Person';
const EPOCH_ISO_DATE = '1970-01-01';

export const ADOBE_PUBLISHER = {
  '@type': 'Organization',
  name: 'Adobe',
  url: EXL_HOST,
};

export const toIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const isoDate = date.toISOString().slice(0, 10);
  return isoDate === EPOCH_ISO_DATE ? '' : isoDate;
};

/** Latest YYYY-MM-DD among values. Empty and unparseable inputs are ignored. */
export const laterIsoDate = (...values) =>
  values
    .map((value) => toIsoDate(value))
    .filter(Boolean)
    .sort()
    .pop() || '';

/** Absolute Experience League URL. Relative paths resolve against EXL_HOST. */
export const toAbsoluteExlUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, EXL_HOST);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch (e) {
    return '';
  }
};

/**
 * Same rule as helix-html-pipeline extractDescription: the first div > p with at
 * least 10 words (or one long token), capped at 25 words. The pipeline writes
 * this into meta description when the page has no description of its own, and
 * Perspectives JSON-LD has to match that served meta value.
 */
export const extractPipelineDescription = (document) => {
  const paragraphs = document.querySelectorAll('div > p');
  for (let i = 0; i < paragraphs.length; i += 1) {
    const words = paragraphs[i].textContent.trim().split(/\s+/).filter(Boolean);
    const longEnough =
      words.length >= 10 ||
      words.some((word) => word.length > 25 && !word.startsWith('http'));
    if (longEnough) {
      const slice = words.slice(0, 25).join(' ');
      return words.length > 25 ? `${slice} ...` : slice;
    }
  }
  return '';
};

/**
 * Description that will show up in the served meta description.
 * A head description equal to the headline is the page title copied into the
 * meta tag; the pipeline replaces that with the article intro, so JSON-LD must
 * follow the intro too. A real blurb is kept and wins over the intro.
 */
export const resolvePerspectiveDescription = (document, headline) => {
  const metaDescription = getMetadata(document, 'description').trim();
  const ogDescription = getMetadata(document, 'og:description').trim();
  const explicit = [metaDescription, ogDescription].find(
    (value) => value && value !== headline,
  );
  if (explicit) return explicit;

  const fromArticle = extractPipelineDescription(document);
  if (fromArticle) {
    setMetadata(document, 'description', fromArticle);
    if (!ogDescription || ogDescription === headline) {
      setMetadata(document, 'og:description', fromArticle);
    }
    return fromArticle;
  }
  return metaDescription || ogDescription || headline;
};

export const getCsvValues = (value = '') =>
  String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const dedupeStrings = (values = []) => [...new Set(values)];

export const toSingleOrArray = (arr) => (arr.length === 1 ? arr[0] : arr);

export const getFirstNonEmpty = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

export const getPageTitle = (document) =>
  document.querySelector('title')?.textContent?.trim() || '';

export const resolveCanonicalUrl = (document, path) => {
  const rawUrl = getFirstNonEmpty(
    document.head
      ?.querySelector('link[rel="canonical"]')
      ?.getAttribute('href')
      ?.trim(),
    getMetadata(document, 'og:url'),
    `${EXL_HOST}${path}`,
    getMetadata(document, 'publish-url'),
  );

  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch (e) {
    return rawUrl;
  }
};

export const getLanguageFromPath = (path = '') => {
  const lang = path.split('/')[1];
  return lang || 'en';
};

export const addIfPresent = (target, key, value) => {
  if (value === '' || value === undefined || value === null) return;
  if (Array.isArray(value) && value.length === 0) return;
  target[key] = value;
};

/**
 * Extracts the common metadata fields shared by all schema builders.
 * Centralises metadata reads so individual builders stay focused on structure.
 *
 * @param {Document} document
 * @param {string} path
 * @returns {Object}
 */
export const extractCommonMetadata = (document, path) => {
  const canonicalUrl = resolveCanonicalUrl(document, path);
  const headline = getFirstNonEmpty(
    getMetadata(document, 'title'),
    getMetadata(document, 'og:title'),
    getMetadata(document, 'twitter:title'),
    getPageTitle(document),
  );
  const description = getFirstNonEmpty(
    getMetadata(document, 'description'),
    getMetadata(document, 'og:description'),
    getMetadata(document, 'twitter:description'),
    headline,
  );
  const inLanguage = getLanguageFromPath(path);
  const dateModified = toIsoDate(
    getFirstNonEmpty(
      getMetadata(document, 'last-update'),
      getMetadata(document, 'modified-time'),
      getMetadata(document, 'published-time'),
    ),
  );
  const datePublished = toIsoDate(
    getFirstNonEmpty(getMetadata(document, 'published-time'), dateModified),
  );
  // fallback to published date as created date in meta is not available
  const dateCreated = toIsoDate(getFirstNonEmpty(datePublished));
  const image = getFirstNonEmpty(
    getMetadata(document, 'og:image:secure_url'),
    getMetadata(document, 'og:image'),
    getMetadata(document, 'twitter:image'),
  );
  const audienceType = dedupeStrings(
    getCsvValues(getMetadata(document, 'role')),
  );
  const about = dedupeStrings(getCsvValues(getMetadata(document, 'solution')));
  const keywordMetadataKeys = [
    ['solution_v1', 'solution'],
    ['feature_v1', 'feature'],
    ['subfeature_v1', 'sub-feature'],
    ['topic_v1', 'topic'],
  ];

  const keywords = dedupeStrings(
    keywordMetadataKeys.flatMap(([primaryKey, fallbackKey]) =>
      getCsvValues(
        getFirstNonEmpty(
          getMetadata(document, primaryKey),
          getMetadata(document, fallbackKey),
        ),
      ),
    ),
  ).slice(0, 10);
  return {
    canonicalUrl,
    headline,
    description,
    inLanguage,
    dateCreated,
    datePublished,
    dateModified,
    image,
    audienceType,
    about,
    keywords,
  };
};
