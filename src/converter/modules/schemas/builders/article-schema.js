import {
  SCHEMA_ORG_CONTEXT,
  WEB_PAGE_TYPE,
  AUDIENCE_TYPE,
  SOFTWARE_APPLICATION_TYPE,
  ADOBE_PUBLISHER,
  addIfPresent,
  extractCommonMetadata,
} from '../schema-helpers.js';

const ARTICLE_TYPE_MAP = {
  Documentation: 'HowTo',
  Certification: 'HowTo',
  Tutorial: 'TechArticle',
  Troubleshooting: 'TechArticle',
};

const ARTICLE_ID_FRAGMENT_MAP = {
  Tutorial: 'techarticle',
};

const DEFAULT_TYPE = 'HowTo';
const DEFAULT_ID_FRAGMENT = '/schema';

export const buildArticleSchema = (document, path, contentType = '') => {
  const {
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
  } = extractCommonMetadata(document, path);

  if (!canonicalUrl || !headline || !description) return null;

  const type = ARTICLE_TYPE_MAP[contentType] || DEFAULT_TYPE;
  const idFragment =
    ARTICLE_ID_FRAGMENT_MAP[contentType] || DEFAULT_ID_FRAGMENT;

  const schema = {};

  addIfPresent(schema, '@context', SCHEMA_ORG_CONTEXT);
  addIfPresent(schema, '@type', type);
  addIfPresent(schema, '@id', `${canonicalUrl}#${idFragment}`);
  addIfPresent(schema, 'url', canonicalUrl);
  addIfPresent(schema, 'headline', headline);
  addIfPresent(schema, 'description', description);
  addIfPresent(schema, 'inLanguage', inLanguage);
  addIfPresent(schema, 'dateCreated', dateCreated);
  addIfPresent(schema, 'datePublished', datePublished);
  addIfPresent(schema, 'dateModified', dateModified);
  addIfPresent(schema, 'image', image);
  addIfPresent(schema, 'publisher', ADOBE_PUBLISHER);

  if (audienceType.length > 0) {
    addIfPresent(schema, 'audience', {
      '@type': AUDIENCE_TYPE,
      audienceType,
    });
  }

  if (about.length > 0) {
    addIfPresent(
      schema,
      'about',
      about.map((name) => ({
        '@type': SOFTWARE_APPLICATION_TYPE,
        name,
      })),
    );
  }

  addIfPresent(schema, 'keywords', keywords);
  addIfPresent(schema, 'mainEntityOfPage', {
    '@type': WEB_PAGE_TYPE,
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: headline,
    description,
  });

  return schema;
};
