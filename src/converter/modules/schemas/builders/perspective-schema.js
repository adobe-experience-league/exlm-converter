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
  resolvePerspectiveDescription,
  getTqProductLabels,
  getCsvValues,
  dedupeStrings,
} from '../schema-helpers.js';

const PERSPECTIVE_TYPE = 'BlogPosting';
// Docs keywords are capped at 10. Perspectives keep that cap.
const KEYWORD_LIMIT = 10;

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
 * suffix on the headline, Person author, about/keywords from tq-products, and
 * dateModified = the later of modified-time and published-time (not last-update).
 */
export const buildPerspectiveSchema = (document, path) => {
  const {
    canonicalUrl,
    headline,
    inLanguage,
    audienceType,
    about: solutionAbout,
  } = extractCommonMetadata(document, path);

  const description = resolvePerspectiveDescription(document, headline);
  if (!canonicalUrl || !headline || !description) return null;

  const datePublished = toIsoDate(getMetadata(document, 'published-time'));
  const dateModified = laterIsoDate(
    getMetadata(document, 'modified-time'),
    getMetadata(document, 'published-time'),
  );
  const published = datePublished || dateModified;

  const tqLabels = getTqProductLabels(document);
  const productLabels = tqLabels.length > 0 ? tqLabels : solutionAbout;
  const featureLabels = dedupeStrings(
    getCsvValues(getMetadata(document, 'feature')),
  );
  const keywords = dedupeStrings([...productLabels, ...featureLabels]).slice(
    0,
    KEYWORD_LIMIT,
  );

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
    url: canonicalUrl,
    name: headline,
    description,
  });

  return schema;
};
