import {
  SCHEMA_ORG_CONTEXT,
  WEB_PAGE_TYPE,
  AUDIENCE_TYPE,
  SOFTWARE_APPLICATION_TYPE,
  ADOBE_PUBLISHER,
  addIfPresent,
  extractCommonMetadata,
} from '../schema-helpers.js';

const PERSPECTIVE_TYPE = 'BlogPosting';

export const buildPerspectiveSchema = (document, path) => {
  const {
    canonicalUrl,
    headline,
    description,
    inLanguage,
    dateCreated,
    datePublished,
    dateModified,
    audienceType,
    about,
    keywords,
  } = extractCommonMetadata(document, path);

  if (!canonicalUrl || !headline || !description) return null;

  const schema = {};

  addIfPresent(schema, '@context', SCHEMA_ORG_CONTEXT);
  addIfPresent(schema, '@type', PERSPECTIVE_TYPE);
  addIfPresent(schema, '@id', `${canonicalUrl}#/schema`);
  addIfPresent(schema, 'url', canonicalUrl);

  // mainEntityOfPage appears early for BlogPosting and carries an extra headline field
  addIfPresent(schema, 'mainEntityOfPage', {
    '@type': WEB_PAGE_TYPE,
    '@id': canonicalUrl,
    name: headline,
    description,
    headline,
    url: canonicalUrl,
  });

  addIfPresent(schema, 'inLanguage', inLanguage);
  addIfPresent(schema, 'dateCreated', dateCreated);
  addIfPresent(schema, 'datePublished', datePublished);
  addIfPresent(schema, 'dateModified', dateModified);
  addIfPresent(schema, 'headline', headline);
  addIfPresent(schema, 'description', description);

  if (audienceType.length > 0) {
    addIfPresent(schema, 'audience', {
      '@type': AUDIENCE_TYPE,
      audienceType,
    });
  }

  addIfPresent(schema, 'publisher', ADOBE_PUBLISHER);

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

  return schema;
};
