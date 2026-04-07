import { getMetadata } from '../../utils/dom-utils.js';
import {
  SCHEMA_ORG_CONTEXT,
  WEB_PAGE_TYPE,
  AUDIENCE_TYPE,
  SOFTWARE_APPLICATION_TYPE,
  ADOBE_PUBLISHER,
  toIsoDate,
  addIfPresent,
  extractCommonMetadata,
} from '../schema-helpers.js';

const EVENT_TYPE = 'Event';

export const buildEventSchema = (document, path) => {
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

  const eventStartDate =
    toIsoDate(getMetadata(document, 'event-start-date')) ||
    toIsoDate(getMetadata(document, 'start-date'));

  const schema = {};

  addIfPresent(schema, '@context', SCHEMA_ORG_CONTEXT);
  addIfPresent(schema, '@type', EVENT_TYPE);
  addIfPresent(schema, '@id', `${canonicalUrl}#/schema`);
  addIfPresent(schema, 'url', canonicalUrl);
  addIfPresent(schema, 'headline', headline);
  addIfPresent(schema, 'description', description);
  addIfPresent(schema, 'inLanguage', inLanguage);
  addIfPresent(schema, 'dateCreated', dateCreated);
  addIfPresent(schema, 'datePublished', datePublished);
  addIfPresent(schema, 'dateModified', dateModified);
  addIfPresent(schema, 'image', image);
  addIfPresent(schema, 'startDate', eventStartDate);
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
