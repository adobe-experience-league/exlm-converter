import { getMetadata } from '../../utils/dom-utils.js';
import {
  SCHEMA_ORG_CONTEXT,
  WEB_PAGE_TYPE,
  AUDIENCE_TYPE,
  SOFTWARE_APPLICATION_TYPE,
  ADOBE_PUBLISHER,
  PERSON_TYPE,
  addIfPresent,
  extractCommonMetadata,
  toSingleOrArray,
  toIsoDate,
  laterIsoDate,
  toAbsoluteExlUrl,
  getCsvValues,
} from '../schema-helpers.js';

const PERSPECTIVE_TYPE = 'BlogPosting';

const buildAuthor = (document) => {
  const names = getCsvValues(getMetadata(document, 'author-name'));
  if (names.length === 0) return undefined;

  const urls = getCsvValues(getMetadata(document, 'author-bio-page')).map(
    (url) => toAbsoluteExlUrl(url),
  );
  const people = names.map((name, index) => {
    const person = { '@type': PERSON_TYPE, name };
    if (urls[index]) person.url = urls[index];
    return person;
  });
  return people.length === 1 ? people[0] : people;
};

/**
 * BlogPosting for a Perspectives article.
 * Same fields as a docs article, with the Perspectives exceptions: no product
 * suffix on the headline, Person author, about as an array, and dateModified
 * = the later of modified-time and published-time (not last-update).
 * about, keywords, and description come from the shared metadata read.
 * description is the authored meta description. Pages with no description
 * need one in AEM. about is the deduped solution list. keywords prefer the
 * V1 tags (solution, feature, sub-feature, topic) and that read already
 * caps them at 10.
 */
export const buildPerspectiveSchema = (document, path) => {
  const {
    canonicalUrl,
    headline,
    description,
    inLanguage,
    audienceType,
    about: productLabels,
    keywords,
  } = extractCommonMetadata(document, path);
  if (!canonicalUrl || !headline || !description) return null;

  const datePublished = toIsoDate(getMetadata(document, 'published-time'));
  const dateModified = laterIsoDate(
    getMetadata(document, 'modified-time'),
    getMetadata(document, 'published-time'),
  );
  const published = datePublished || dateModified;

  const schema = {};

  addIfPresent(schema, '@context', SCHEMA_ORG_CONTEXT);
  addIfPresent(schema, '@type', PERSPECTIVE_TYPE);
  addIfPresent(schema, '@id', `${canonicalUrl}#/schema`);
  addIfPresent(schema, 'url', canonicalUrl);
  addIfPresent(schema, 'headline', headline);
  addIfPresent(schema, 'description', description);
  addIfPresent(schema, 'inLanguage', inLanguage);
  // dateCreated matches docs: the published day. There is no separate created meta.
  addIfPresent(schema, 'dateCreated', published);
  addIfPresent(schema, 'datePublished', published);
  addIfPresent(schema, 'dateModified', dateModified || published);
  addIfPresent(schema, 'author', buildAuthor(document));
  addIfPresent(schema, 'publisher', ADOBE_PUBLISHER);

  if (audienceType.length > 0) {
    addIfPresent(schema, 'audience', {
      '@type': AUDIENCE_TYPE,
      audienceType: toSingleOrArray(audienceType),
    });
  }

  if (productLabels.length > 0) {
    addIfPresent(
      schema,
      'about',
      productLabels.map((name) => ({
        '@type': SOFTWARE_APPLICATION_TYPE,
        name,
      })),
    );
  }

  addIfPresent(schema, 'keywords', keywords);
  addIfPresent(schema, 'mainEntityOfPage', {
    '@type': WEB_PAGE_TYPE,
    '@id': canonicalUrl,
    name: headline,
    description,
    headline,
    url: canonicalUrl,
  });

  return schema;
};
