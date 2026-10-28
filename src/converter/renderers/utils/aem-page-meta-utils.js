import jsdom from 'jsdom';
import crypto from 'crypto';
import { getMetadata, setMetadata } from '../../modules/utils/dom-utils.js';
import {
  createExliaTaxonomyLabelResolver,
  extractTqUuid,
} from '../../modules/exlia-taxonomy-client.js';

/**
 * Generates a unique immutable hash for a given input string and truncates it under 50 characters.
 */
export function generateHash(input) {
  return Object.freeze(
    crypto.createHash('sha256').update(input).digest('hex').substring(0, 49),
  );
}

/**
 * Decodes base64 strings
 */
export function decodeBase64(encodedString) {
  return Buffer.from(encodedString, 'base64').toString('utf-8');
}

/**
 * @typedef {Object} AuthorBioData
 * @property {string} authorName
 * @property {string} authorType
 */

/**
 * @param {string} authorBioHtml author bio html
 * @returns {AuthorBioData}
 */
export function getAuthorBioData(authorBioHtml) {
  const {
    window: { document },
  } = new jsdom.JSDOM(authorBioHtml);
  const authorBioDiv = document.querySelector('.author-bio');
  const getNthRowText = (n) =>
    authorBioDiv.querySelector(`div:nth-child(${n})`).textContent.trim();
  if (authorBioDiv) {
    const authorName = getNthRowText(2);
    const authorType = getNthRowText(4);
    return { authorName, authorType };
  }
  return {};
}

/**
 * Decode cq-meta metadata in AEM Page properties
 * @param {Document} document
 * @param {string} metaName
 * @returns
 */
export function decodeCQMetadata(document, metaName) {
  const metaValues = getMetadata(document, metaName);
  if (!metaValues || metaValues.length === 0) return;
  const decodedCQTags = metaValues.split(', ').map((segment) => {
    const parts = segment.split('/');
    return parts
      .map((part, index) => (index > 0 ? decodeBase64(part) : part))
      .join('/');
  });
  setMetadata(document, metaName, decodedCQTags.join(', '));
}

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str;

  const { JSDOM } = jsdom;
  const dom = new JSDOM();
  const textarea = dom.window.document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function englishLabelFromTqItem(item) {
  if (!item || typeof item !== 'object') return '';
  const label = item.displayLabel ?? item.prefLabel ?? '';
  return typeof label === 'string' ? label.trim() : '';
}

/**
 * Converts JSON TQ metadata to standard label-only metadata.
 * @param {Document} document
 */
export function updateTQTagsMetadata(document) {
  const keyMapping = {
    'tq-roles': 'role',
    'tq-levels': 'level',
    'tq-products': 'coveo-solution',
    'tq-features': 'feature',
    'tq-subfeatures': 'sub-feature',
    'tq-industries': 'industry',
    'tq-topics': 'topic',
  };

  Object.entries(keyMapping).forEach(([key, newKey]) => {
    const metaTag = getMetadata(document, key);
    if (!metaTag) return;

    try {
      const decoded = decodeHtmlEntities(metaTag);
      const parsed = JSON.parse(decoded);

      if (Array.isArray(parsed)) {
        const labels = parsed.map((item) => item?.label).filter(Boolean);

        if (labels.length) {
          setMetadata(
            document,
            newKey,
            labels.join(key === 'tq-products' ? ';' : ', '),
          );
          if (key === 'tq-products') {
            const products = [...new Set(labels)];
            setMetadata(document, 'solution', products.join(','));
            setMetadata(document, 'original-solution', products.join(', '));
          }
        }
      }
    } catch (e) {
      console.error(`Failed to parse metadata for ${key}:`, e, metaTag);
    }
  });
}

/**
 * Exlia/localized TQ metadata: JSON tq-* -> target meta keys from TQ_KEY_TO_META.
 *
 * @param {Document} document
 * @param {string} pathLang First URL segment locale (e.g. fr).
 * @returns {Promise<void>}
 */
export async function createTranslatedV2TQMetadata(document, pathLang) {
  const TQ_KEY_TO_META = {
    'tq-roles': 'loc-v2-role',
    'tq-levels': 'loc-v2-level',
    'tq-features': 'loc-v2-feature',
    'tq-subfeatures': 'loc-v2-sub-feature',
    'tq-industries': 'loc-v2-industry',
    'tq-topics': 'loc-v2-topic',
  };
  const resolver = await createExliaTaxonomyLabelResolver();
  const localize =
    resolver.isEnabled() &&
    typeof pathLang === 'string' &&
    pathLang.toLowerCase() !== 'en';

  const inFlightLabels = new Map();

  const getLocalizedOrNull = async (tagId) => {
    if (!localize || !tagId) return null;

    // Extract UUID from tag ID if it's a full URI
    const uuid = extractTqUuid(tagId);
    if (!uuid) return null;

    const existing = inFlightLabels.get(uuid);
    if (existing) return existing;

    const p = resolver.getDisplayLabel(uuid, pathLang);
    inFlightLabels.set(uuid, p);
    return p;
  };

  await Promise.all(
    Object.entries(TQ_KEY_TO_META).map(async ([key, targetKey]) => {
      const metaTag = getMetadata(document, key);
      if (!metaTag) return;

      try {
        const decoded = decodeHtmlEntities(metaTag);
        const parsed = JSON.parse(decoded);

        if (!Array.isArray(parsed)) return;

        const displayLabels = await Promise.all(
          parsed.map(async (item) => {
            if (!item || typeof item !== 'object') return null;

            const en = englishLabelFromTqItem(item);
            const tagId = item.id || item.uri || item.tag || null;

            if (!localize || !tagId) return en || null;

            const loc = await getLocalizedOrNull(tagId);
            return loc || en || null;
          }),
        );

        const joined = displayLabels.filter(Boolean).join(', ');
        if (!joined) return;

        setMetadata(document, targetKey, joined);
      } catch (e) {
        console.error(`Failed to parse metadata for ${key}:`, e, metaTag);
      }
    }),
  );
}

/**
 * Gets the module count from the course-breakdown block
 * @param {Document} document - The DOM document
 * @returns {number} - The module count value
 */
export function getModuleCount(document) {
  const moduleCount = document.querySelectorAll(
    '[data-aue-model="course-breakdown-item"]',
  )?.length;

  return moduleCount;
}

/**
 * Gets the course duration from the 2nd child div of the course-breakdown block
 * @param {Document} document - The DOM document
 * @returns {string} - The course duration value
 */
export function getCourseDuration(document) {
  const courseDuration = document
    .querySelector('.course-breakdown div:nth-child(2)')
    ?.textContent?.trim();

  return courseDuration || '';
}

/**
 * Derives the hashed ids of direct child course pages (modules under a course,
 * or steps under a module) that are already linked from the current page's
 * own DOM, so no extra network fetches are needed to compute them. Matches
 * on path structure (one segment deeper than the given prefix) rather than a
 * specific block/component, since not all step-like pages (e.g. key-takeaways,
 * quiz) are tagged with the same data-aue-model.
 * @param {Document} document - The DOM document
 * @param {string[]} prefixSegments - Path segments (after '/courses/') identifying the current course/module
 * @returns {string[]} - Unique, hashed ids for each linked direct child page
 */
export function getChildPageIds(document, prefixSegments) {
  const ids = new Set();
  const prefixPath = prefixSegments.join('/');

  document.querySelectorAll('a[href*="/courses/"]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    const afterCourses = href.split('/courses/')[1];
    if (!afterCourses) return;

    const segments = afterCourses.split('/').filter(Boolean);
    if (segments.length !== prefixSegments.length + 1) return;
    if (segments.slice(0, prefixSegments.length).join('/') !== prefixPath)
      return;

    ids.add(generateHash(`/courses/${segments.join('/')}`));
  });

  return [...ids];
}
