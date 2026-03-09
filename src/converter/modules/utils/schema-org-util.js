import jsdom from 'jsdom';
import { getMetadata } from './dom-utils.js';
import { upsertJsonLdScript } from './json-ld-util.js';

const EXL_HOST = 'https://experienceleague.adobe.com';
const SCHEMA_SCRIPT_ID = 'exl-schema-org-jsonld';

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

const getCanonicalUrl = (path, metadataUrl = '') => {
  const rawUrl = metadataUrl || `${EXL_HOST}${path}`;
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
  if (path.includes('/on-demand-events/')) return 'Event';
  if (path.includes('/playlists/')) return 'ItemList';
  if (path.includes('/courses/')) return 'Course';
  if (path.includes('/docs/')) return 'Article';
  return 'WebPage';
};

const buildSchemaFromMeta = (document, path) => {
  const publishUrl = getMetadata(document, 'publish-url');
  const canonicalUrl = getCanonicalUrl(path, publishUrl);
  const headline = getMetadata(document, 'title');
  const description = getMetadata(document, 'description');
  const type = inferSchemaType(path);
  const inLanguage = getLanguageFromPath(path);

  if (!canonicalUrl || !headline || !description) {
    return null;
  }

  const dateModified = toIsoDate(
    getMetadata(document, 'last-update') ||
      getMetadata(document, 'published-time'),
  );
  const datePublished = toIsoDate(
    getMetadata(document, 'published-time') || dateModified,
  );
  const dateCreated = toIsoDate(
    getMetadata(document, 'build-date') || datePublished,
  );

  const audienceType = dedupeStrings(
    getCsvValues(getMetadata(document, 'role')),
  );
  const about = dedupeStrings(
    getCsvValues(getMetadata(document, 'solution')).concat(
      getCsvValues(getMetadata(document, 'product')),
    ),
  );
  const keywords = dedupeStrings(
    getCsvValues(getMetadata(document, 'keywords'))
      .concat(getCsvValues(getMetadata(document, 'feature')))
      .concat(getCsvValues(getMetadata(document, 'topic'))),
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${canonicalUrl}#/schema`,
    url: canonicalUrl,
    headline,
    description,
    inLanguage,
    publisher: {
      '@type': 'Organization',
      name: 'Adobe',
      url: EXL_HOST,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
      url: canonicalUrl,
      name: headline,
      description,
    },
  };

  if (dateCreated) schema.dateCreated = dateCreated;
  if (datePublished) schema.datePublished = datePublished;
  if (dateModified) schema.dateModified = dateModified;
  if (audienceType.length > 0) {
    schema.audience = {
      '@type': 'Audience',
      audienceType,
    };
  }
  if (about.length > 0) {
    schema.about = about.map((name) => ({
      '@type': 'SoftwareApplication',
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
