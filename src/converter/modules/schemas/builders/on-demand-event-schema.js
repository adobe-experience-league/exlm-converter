import {
  SCHEMA_ORG_CONTEXT,
  SOFTWARE_APPLICATION_TYPE,
  EXL_HOST,
  addIfPresent,
  extractCommonMetadata,
  getCsvValues,
  getFirstNonEmpty,
  dedupeStrings,
  toSingleOrArray,
} from '../schema-helpers.js';
import { getMetadata } from '../../utils/dom-utils.js';
import {
  isMpcVideoUrl,
  fetchMpcVideoData,
} from '../../../../common/utils/mpc-util.js';

const VIDEO_OBJECT_TYPE = 'VideoObject';
const PUBLISHER_ID = `${EXL_HOST}/#/publisher`;

// Compact publisher reference linked by @id (matches the playlist VideoObject shape).
const VIDEO_PUBLISHER = {
  '@type': 'Organization',
  '@id': PUBLISHER_ID,
};

// Normalizes a raw date value to a full ISO 8601 datetime; returns undefined when the
// value is missing or unparseable so the field is omitted.
const toUploadDate = (rawValue) => {
  if (rawValue) {
    const date = new Date(rawValue);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
};

// MPC posters are protocol-relative (`//images-tv.adobe.com/...`); make them absolute.
const toAbsoluteUrl = (url) => {
  if (!url) return undefined;
  return url.startsWith('//') ? `https:${url}` : url;
};

// The page's `duration` metadata is a plain seconds count (e.g. "1934"), but schema.org's
// VideoObject.duration must be an ISO 8601 duration (e.g. "PT32M14S"); convert it here so
// validators don't reject the field.
const toIso8601Duration = (rawSeconds) => {
  if (!rawSeconds) return undefined;
  const totalSeconds = Number(rawSeconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return undefined;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${
    seconds || (!hours && !minutes) ? `${seconds}S` : ''
  }`;
};

// On-demand events don't carry the `solution` tag the common keyword extraction looks for;
// they use `product` instead, alongside `feature`/`sub-feature`/`topic`. Each falls back to
// its `_v2` counterpart since that's the only variant some event pages emit (e.g. `topic_v2`).
const KEYWORD_METADATA_KEYS = [
  ['product', 'product_v2'],
  ['feature', 'feature_v2'],
  ['sub-feature', 'subfeature_v2'],
  ['topic', 'topic_v2'],
];

const getKeywords = (document) =>
  dedupeStrings(
    KEYWORD_METADATA_KEYS.flatMap(([primaryKey, fallbackKey]) =>
      getCsvValues(
        getFirstNonEmpty(
          getMetadata(document, primaryKey),
          getMetadata(document, fallbackKey),
        ),
      ),
    ),
  ).slice(0, 10);

// Finds the primary MPC video URL (https://video.tv.adobe.com/v/{id}) embedded in the
// on-demand event page, scanning anchors and iframes. Returns the URL without a trailing
// slash, query, or hash so callers can derive @id/embedUrl/thumbnail consistently.
const findVideoUrl = (document) => {
  const elements = document.querySelectorAll('a[href], iframe[src]');
  for (let i = 0; i < elements.length; i += 1) {
    const url =
      elements[i].getAttribute('href') || elements[i].getAttribute('src');
    if (url && isMpcVideoUrl(url)) {
      return url.split('#')[0].split('?')[0].replace(/\/+$/, '');
    }
  }
  return undefined;
};

/**
 * Builds a schema.org VideoObject for an on-demand event page.
 *
 * On-demand events are single recorded videos, so the agreed mapping (EXLM-5756) is a
 * VideoObject rather than an Event. The embedded MPC video's metadata JSON
 * (`{videoUrl}?format=json`) is the primary source for uploadDate, thumbnail (poster) and
 * product/about, falling back to page metadata when it is unavailable. Every field is
 * emitted only when present so partial pages degrade gracefully.
 *
 * @param {Document} document - the parsed on-demand event page
 * @param {string} path - request path (used to resolve the canonical URL / language)
 * @returns {Promise<Object|null>} JSON-LD VideoObject, or null if required fields are missing
 */
export const buildOnDemandEventSchema = async (document, path) => {
  const { canonicalUrl, headline, description, inLanguage, image, about } =
    extractCommonMetadata(document, path);

  if (!canonicalUrl || !headline || !description) return null;

  const mpcVideoUrl = findVideoUrl(document);
  const videoUrl = mpcVideoUrl || canonicalUrl;

  // Pull uploadDate and poster from the MPC video metadata; fall back to page metadata and
  // a `?format=jpeg` thumbnail derivation when the JSON is unavailable.
  const mpcData = mpcVideoUrl ? await fetchMpcVideoData(mpcVideoUrl) : null;
  const mpcVideo = mpcData?.video || {};

  const thumbnailUrl =
    toAbsoluteUrl(mpcVideo.poster) ||
    (mpcVideoUrl ? `${mpcVideoUrl}?format=jpeg` : image);
  const uploadDate = toUploadDate(
    mpcVideo.uploadDate || getMetadata(document, 'last-substantial-update'),
  );
  // Products come from the page's `product` metadata (comma-separated), falling back to
  // the common `solution` metadata (`about`) when `product` is absent.
  const productNames = getCsvValues(getMetadata(document, 'product'));
  const aboutNames = productNames.length > 0 ? productNames : about;

  const keywordValues = getKeywords(document);

  const schema = {};
  addIfPresent(schema, '@context', SCHEMA_ORG_CONTEXT);
  addIfPresent(schema, '@type', VIDEO_OBJECT_TYPE);
  addIfPresent(schema, '@id', `${videoUrl}#video`);
  addIfPresent(schema, 'name', headline);
  addIfPresent(schema, 'url', videoUrl);
  addIfPresent(schema, 'description', description);
  addIfPresent(schema, 'inLanguage', inLanguage);
  addIfPresent(schema, 'uploadDate', uploadDate);
  addIfPresent(schema, 'thumbnailUrl', thumbnailUrl);
  addIfPresent(
    schema,
    'duration',
    toIso8601Duration(getMetadata(document, 'duration')),
  );
  addIfPresent(schema, 'embedUrl', `${videoUrl}/`);
  addIfPresent(schema, 'publisher', VIDEO_PUBLISHER);
  addIfPresent(schema, 'keywords', keywordValues);
  if (aboutNames.length > 0) {
    const aboutObjects = aboutNames.map((name) => ({
      '@type': SOFTWARE_APPLICATION_TYPE,
      name,
    }));
    addIfPresent(schema, 'about', toSingleOrArray(aboutObjects));
  }

  return schema;
};
