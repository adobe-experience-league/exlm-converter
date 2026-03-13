import jsdom from 'jsdom';
import { getMetadata } from './dom-utils.js';
import { upsertJsonLdScript } from './json-ld-util.js';

const EXL_HOST = 'https://experienceleague.adobe.com';
const SCHEMA_ORG_CONTEXT = 'https://schema.org';
const SCHEMA_SCRIPT_ID = 'exl-schema-org-jsonld';
const WEB_PAGE_TYPE = 'WebPage';
const AUDIENCE_TYPE = 'Audience';
const SOFTWARE_APPLICATION_TYPE = 'SoftwareApplication';
const ADOBE_PUBLISHER = {
  '@type': 'Organization',
  name: 'Adobe',
  url: EXL_HOST,
};

const toIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getCsvValues = (value = '') =>
  String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const dedupeStrings = (values = []) => [...new Set(values)];

const getFirstNonEmpty = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const getPageTitle = (document) =>
  document.querySelector('title')?.textContent?.trim() || '';

const resolveCanonicalUrl = (document, path) => {
  const rawUrl = getFirstNonEmpty(
    `${EXL_HOST}${path}`,
    document.head
      ?.querySelector('link[rel="canonical"]')
      ?.getAttribute('href')
      ?.trim(),
    getMetadata(document, 'og:url'),
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

const getLanguageFromPath = (path = '') => {
  const lang = path.split('/')[1];
  return lang || 'en';
};

const inferSchemaType = (path = '') => {
  if (path.includes('/docs/')) return 'HowTo';
  return WEB_PAGE_TYPE;
};

const buildSchemaFromMeta = (document, path) => {
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
  const type = inferSchemaType(path);
  const inLanguage = getLanguageFromPath(path);

  if (!canonicalUrl || !headline || !description) {
    return null;
  }

  const dateModified = toIsoDate(
    getFirstNonEmpty(
      getMetadata(document, 'modified-time'),
      getMetadata(document, 'last-update'),
      getMetadata(document, 'published-time'),
    ),
  );
  const datePublished = toIsoDate(
    getFirstNonEmpty(getMetadata(document, 'published-time'), dateModified),
  );
  const dateCreated = toIsoDate(
    getFirstNonEmpty(getMetadata(document, 'build-date'), datePublished),
  );
  const image = getFirstNonEmpty(
    getMetadata(document, 'og:image:secure_url'),
    getMetadata(document, 'og:image'),
    getMetadata(document, 'twitter:image'),
  );

  const audienceType = dedupeStrings(
    getCsvValues(getMetadata(document, 'role')),
  );
  const about = dedupeStrings(getCsvValues(getMetadata(document, 'solution')));
  const keywords = dedupeStrings(
    getCsvValues(getMetadata(document, 'keywords')).concat(
      getCsvValues(getMetadata(document, 'feature')),
    ),
  );

  const schema = {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': type,
    '@id': `${canonicalUrl}#/schema`,
    url: canonicalUrl,
    headline,
    description,
    inLanguage,
    publisher: ADOBE_PUBLISHER,
    mainEntityOfPage: {
      '@type': WEB_PAGE_TYPE,
      '@id': canonicalUrl,
      url: canonicalUrl,
      name: headline,
      description,
    },
  };

  if (dateCreated) schema.dateCreated = dateCreated;
  if (datePublished) schema.datePublished = datePublished;
  if (dateModified) schema.dateModified = dateModified;
  if (image) schema.image = image;
  if (audienceType.length > 0) {
    schema.audience = {
      '@type': AUDIENCE_TYPE,
      audienceType,
    };
  }
  if (about.length > 0) {
    schema.about = about.map((name) => ({
      '@type': SOFTWARE_APPLICATION_TYPE,
      name,
    }));
  }
  if (keywords.length > 0) {
    schema.keywords = keywords;
  }
  if (type === 'Event') {
    const eventStartDate =
      toIsoDate(getMetadata(document, 'event-start-date')) ||
      toIsoDate(getMetadata(document, 'start-date'));
    if (eventStartDate) schema.startDate = eventStartDate;
  }

  return schema;
};

export const injectSchemaOrg = ({ path, body, headers = {} }) => {
  if (typeof body !== 'string' || !body.trim()) return body;
  const contentType = headers['Content-Type'] || headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('text/html')) return body;
  if (path.startsWith('/fragments/')) return body;

  const dom = new jsdom.JSDOM(body);
  const { document } = dom.window;
  const schema = buildSchemaFromMeta(document, path);
  if (!schema) return body;
  upsertJsonLdScript(document, schema, SCHEMA_SCRIPT_ID);
  return dom.serialize();
};
