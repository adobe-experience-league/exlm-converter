import {
  SCHEMA_ORG_CONTEXT,
  SOFTWARE_APPLICATION_TYPE,
  EXL_HOST,
  addIfPresent,
  extractCommonMetadata,
} from '../schema-helpers.js';
import { getMetadata } from '../../utils/dom-utils.js';
import { isMpcVideoUrl } from '../../../../common/utils/mpc-util.js';

const VIDEO_OBJECT_TYPE = 'VideoObject';
const PUBLISHER_ID = `${EXL_HOST}/#/publisher`;

// Compact publisher reference linked by @id (matches the playlist VideoObject shape).
const VIDEO_PUBLISHER = {
  '@type': 'Organization',
  '@id': PUBLISHER_ID,
};

// Preserves a full ISO 8601 datetime when the source includes time info,
// otherwise falls back to the date-only value already computed for the page.
const toUploadDate = (rawValue, datePublished) => {
  if (rawValue) {
    const date = new Date(rawValue);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return datePublished;
};

// Finds the primary MPC video URL (https://video.tv.adobe.com/v/{id}) embedded in the
// on-demand event page, scanning anchors and iframes. Returns the URL without a trailing
// slash or hash so callers can derive @id/embedUrl consistently.
const findVideoUrl = (document) => {
  const elements = document.querySelectorAll('a[href], iframe[src]');
  for (let i = 0; i < elements.length; i += 1) {
    const url =
      elements[i].getAttribute('href') || elements[i].getAttribute('src');
    if (url && isMpcVideoUrl(url)) {
      return url.split('#')[0].replace(/\/+$/, '');
    }
  }
  return undefined;
};

const getFirstAbout = (about = []) => {
  const name = about[0];
  if (!name) return undefined;
  return { '@type': SOFTWARE_APPLICATION_TYPE, name };
};

/**
 * Builds a schema.org VideoObject for an on-demand event page.
 *
 * On-demand events are single recorded videos, so the agreed mapping (EXLM-5756) is a
 * VideoObject rather than an Event. Data is read from the page metadata plus the embedded
 * MPC video URL; every field is emitted only when present so partial pages degrade
 * gracefully.
 *
 * @param {Document} document - the parsed on-demand event page
 * @param {string} path - request path (used to resolve the canonical URL / language)
 * @returns {Object|null} JSON-LD VideoObject, or null if required fields are missing
 */
export const buildOnDemandEventSchema = (document, path) => {
  const {
    canonicalUrl,
    headline,
    description,
    inLanguage,
    datePublished,
    image,
    about,
  } = extractCommonMetadata(document, path);

  if (!canonicalUrl || !headline || !description) return null;

  const videoUrl = findVideoUrl(document) || canonicalUrl;
  const uploadDate = toUploadDate(
    getMetadata(document, 'upload-date') ||
      getMetadata(document, 'published-time'),
    datePublished,
  );

  const schema = {};
  addIfPresent(schema, '@context', SCHEMA_ORG_CONTEXT);
  addIfPresent(schema, '@type', VIDEO_OBJECT_TYPE);
  addIfPresent(schema, '@id', `${videoUrl}#video`);
  addIfPresent(schema, 'name', headline);
  addIfPresent(schema, 'url', videoUrl);
  addIfPresent(schema, 'description', description);
  addIfPresent(schema, 'inLanguage', inLanguage);
  addIfPresent(schema, 'uploadDate', uploadDate);
  addIfPresent(schema, 'thumbnailUrl', image);
  addIfPresent(schema, 'duration', getMetadata(document, 'duration'));
  addIfPresent(schema, 'embedUrl', `${videoUrl}/`);
  addIfPresent(schema, 'publisher', VIDEO_PUBLISHER);
  addIfPresent(schema, 'about', getFirstAbout(about));

  return schema;
};
