import {
  SCHEMA_ORG_CONTEXT,
  SOFTWARE_APPLICATION_TYPE,
  ADOBE_PUBLISHER,
  addIfPresent,
  toIsoDate,
  dedupeStrings,
  EXL_HOST,
} from '../schema-helpers.js';
import { getThumbnail } from '../../../renderers/playlists/create-playlist.js';

const getFirstProductAbout = (products = []) => {
  const id = products[0]?.id;
  if (!id) return undefined;
  return { '@type': SOFTWARE_APPLICATION_TYPE, name: id };
};

const buildKeywords = (products = [], features = []) =>
  dedupeStrings([...products.map((p) => p.id).filter(Boolean), ...features]);

const safeGetThumbnail = (thumbnailUrls) => {
  if (!Array.isArray(thumbnailUrls) || thumbnailUrls.length === 0)
    return undefined;
  try {
    return getThumbnail(thumbnailUrls);
  } catch {
    return undefined;
  }
};

// Strips zero-value hour/minute designators from ISO 8601 duration strings.
// PT0H1M35S → PT1M35S, PT0H0M35S → PT35S, PT1H0M0S → PT1H0M0S
const normalizeDuration = (duration) => {
  if (!duration || typeof duration !== 'string') return duration;
  const match = duration.match(/^PT(\d+)H(\d+)M(\d+)S$/);
  if (!match) return duration;
  const [h, m, s] = match.slice(1).map(Number);
  if (h > 0) return `PT${h}H${m}M${s}S`;
  if (m > 0) return `PT${m}M${s}S`;
  return `PT${s}S`;
};

// Preserves full ISO 8601 datetime if the value is a valid date-time string,
// otherwise falls back to date-only via toIsoDate.
const toUploadDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Keep the full timestamp when the source includes time info
  return typeof value === 'string' && value.includes('T')
    ? date.toISOString()
    : toIsoDate(value);
};

const buildVideoObject = (video, itemListId, lang, publisher, about) => {
  const jld = video.jsonLinkedData || {};
  const obj = { '@type': 'VideoObject' };
  addIfPresent(obj, '@id', video.url ? `${video.url}#video` : undefined);
  addIfPresent(obj, 'name', jld.name);
  addIfPresent(obj, 'url', video.url);
  addIfPresent(obj, 'description', jld.description);
  addIfPresent(obj, 'inLanguage', lang);
  addIfPresent(obj, 'uploadDate', toUploadDate(jld.uploadDate));
  addIfPresent(obj, 'thumbnailUrl', safeGetThumbnail(jld.thumbnailUrl));
  addIfPresent(obj, 'duration', normalizeDuration(jld.duration));
  addIfPresent(obj, 'embedUrl', jld.embedUrl);
  addIfPresent(obj, 'publisher', publisher);
  addIfPresent(obj, 'about', about);
  addIfPresent(obj, 'isPartOf', { '@id': itemListId });
  return obj;
};

/**
 * Builds a schema.org @graph for a playlist page from the raw API JSON payload.
 *
 * @param {Object} data - The `data` field from the playlist API JSON response
 * @param {string} lang - BCP-47 language code (e.g. "en")
 * @returns {Object|null} JSON-LD schema object, or null if required fields are missing
 */
export const buildPlaylistSchema = (data, lang) => {
  if (!data || !data.path || !data.title) return null;

  const canonicalUrl = `${EXL_HOST}${data.path}`;
  const itemListId = `${canonicalUrl}#/itemlist`;
  const videos = data.videos || [];
  const products = data.product || [];
  const features = data.frontmatter?.feature || [];

  const about = getFirstProductAbout(products);
  const keywords = buildKeywords(products, features);
  const primaryImageUrl = safeGetThumbnail(
    videos[0]?.jsonLinkedData?.thumbnailUrl,
  );

  const webPage = { '@type': 'WebPage' };
  addIfPresent(webPage, '@id', canonicalUrl);
  addIfPresent(webPage, 'url', canonicalUrl);
  addIfPresent(webPage, 'name', data.title);
  addIfPresent(webPage, 'description', data.description);
  addIfPresent(webPage, 'inLanguage', lang);
  addIfPresent(webPage, 'datePublished', toIsoDate(data.git?.created));
  addIfPresent(webPage, 'dateModified', toIsoDate(data.git?.updated));
  addIfPresent(webPage, 'publisher', ADOBE_PUBLISHER);
  addIfPresent(webPage, 'about', about);
  addIfPresent(webPage, 'keywords', keywords.length > 0 ? keywords : undefined);
  if (primaryImageUrl) {
    webPage.primaryImageOfPage = {
      '@type': 'ImageObject',
      '@id': primaryImageUrl,
      url: primaryImageUrl,
    };
  }
  webPage.mainEntity = { '@id': itemListId };

  const itemList = { '@type': 'ItemList', '@id': itemListId };
  addIfPresent(itemList, 'url', canonicalUrl);
  addIfPresent(itemList, 'name', data.title);
  addIfPresent(itemList, 'description', data.description);
  addIfPresent(itemList, 'numberOfItems', videos.length);
  addIfPresent(itemList, 'isPartOf', { '@id': canonicalUrl });
  itemList.itemListOrder = 'https://schema.org/ItemListOrderAscending';
  itemList.itemListElement = videos.map((video, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: video.url,
    ...(video.url && { item: { '@id': `${video.url}#video` } }),
  }));

  const videoObjects = videos.map((video) =>
    buildVideoObject(video, itemListId, lang, ADOBE_PUBLISHER, about),
  );

  return {
    '@context': SCHEMA_ORG_CONTEXT,
    '@graph': [webPage, itemList, ...videoObjects],
  };
};
