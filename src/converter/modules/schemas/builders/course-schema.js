import {
  SCHEMA_ORG_CONTEXT,
  WEB_PAGE_TYPE,
  AUDIENCE_TYPE,
  SOFTWARE_APPLICATION_TYPE,
  ADOBE_PUBLISHER,
  addIfPresent,
  extractCommonMetadata,
  toSingleOrArray,
} from '../schema-helpers.js';

const COURSE_TYPE = 'Course';
const EDUCATIONAL_CREDENTIAL = 'Course completion credential';

export const buildCourseSchema = (document, path) => {
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
  addIfPresent(schema, '@type', COURSE_TYPE);
  addIfPresent(schema, '@id', `${canonicalUrl}#/schema`);
  addIfPresent(schema, 'url', canonicalUrl);
  addIfPresent(schema, 'headline', headline);
  addIfPresent(schema, 'description', description);
  addIfPresent(schema, 'inLanguage', inLanguage);
  addIfPresent(schema, 'dateCreated', dateCreated);
  addIfPresent(schema, 'datePublished', datePublished);
  addIfPresent(schema, 'dateModified', dateModified);
  addIfPresent(schema, 'publisher', ADOBE_PUBLISHER);

  if (audienceType.length > 0) {
    addIfPresent(schema, 'audience', {
      '@type': AUDIENCE_TYPE,
      audienceType: toSingleOrArray(audienceType),
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
  addIfPresent(schema, 'educationalCredentialAwarded', EDUCATIONAL_CREDENTIAL);
  addIfPresent(schema, 'mainEntityOfPage', {
    '@type': WEB_PAGE_TYPE,
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: headline,
    description,
  });

  return schema;
};
