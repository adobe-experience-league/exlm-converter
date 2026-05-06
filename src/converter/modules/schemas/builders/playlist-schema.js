import {
  SCHEMA_ORG_CONTEXT,
  SOFTWARE_APPLICATION_TYPE,
  EXL_HOST,
  addIfPresent,
  extractCommonMetadata,
  toSingleOrArray,
} from '../schema-helpers.js';

const PUBLISHER_ID = `${EXL_HOST}/#/publisher`;
const ITEM_LIST_ORDER = 'https://schema.org/ItemListOrderAscending';

const ADOBE_PUBLISHER_FULL = {
  '@type': 'Organization',
  '@id': PUBLISHER_ID,
  name: 'Adobe',
  url: EXL_HOST,
};

const ADOBE_PUBLISHER_REF = {
  '@type': 'Organization',
  '@id': PUBLISHER_ID,
};

/**
 * Parses all VideoObject JSON-LD scripts already embedded by the API in the playlist HTML.
 * @param {Document} document
 * @returns {Object[]}
 */
function extractEmbeddedVideoObjects(document) {
  const videos = [];
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => {
      try {
        const json = JSON.parse(el.textContent);
        const types = [].concat(json['@type'] || []);
        if (types.includes('VideoObject')) {
          videos.push(json);
        }
      } catch {
        // skip unparseable scripts
      }
    });
  return videos;
}

/**
 * Builds a full @graph playlist schema (WebPage + ItemList + VideoObjects)
 * purely from the rendered HTML — meta tags for page-level data,
 * existing JSON-LD scripts for per-video data.
 *
 * @param {Document} document
 * @param {string} path
 * @returns {Object|null}
 */
export const buildPlaylistSchema = (document, path) => {
  const {
    canonicalUrl,
    headline,
    description,
    inLanguage,
    datePublished,
    dateModified,
    image,
    about,
    keywords,
  } = extractCommonMetadata(document, path);

  if (!canonicalUrl || !headline) return null;

  const itemListId = `${canonicalUrl}#/itemlist`;
  const embeddedVideos = extractEmbeddedVideoObjects(document);

  const aboutObjects =
    about.length > 0
      ? about.map((name) => ({ '@type': SOFTWARE_APPLICATION_TYPE, name }))
      : [];
  const aboutValue =
    aboutObjects.length > 0 ? toSingleOrArray(aboutObjects) : null;

  // Use first video thumbnail as page image fallback
  const primaryImageUrl = image || embeddedVideos[0]?.thumbnailUrl?.[0] || null;

  // --- WebPage node ---
  const webPage = {};
  addIfPresent(webPage, '@type', 'WebPage');
  addIfPresent(webPage, '@id', canonicalUrl);
  addIfPresent(webPage, 'url', canonicalUrl);
  addIfPresent(webPage, 'name', headline);
  addIfPresent(webPage, 'description', description);
  addIfPresent(webPage, 'inLanguage', inLanguage);
  addIfPresent(webPage, 'datePublished', datePublished);
  addIfPresent(webPage, 'dateModified', dateModified);
  addIfPresent(webPage, 'publisher', ADOBE_PUBLISHER_FULL);
  if (aboutValue) webPage.about = aboutValue;
  addIfPresent(webPage, 'keywords', keywords);
  if (primaryImageUrl) {
    webPage.primaryImageOfPage = {
      '@type': 'ImageObject',
      '@id': `${canonicalUrl}#hero`,
      url: primaryImageUrl,
    };
  }
  webPage.mainEntity = { '@id': itemListId };

  // --- ItemList node ---
  const itemList = {};
  addIfPresent(itemList, '@type', 'ItemList');
  addIfPresent(itemList, '@id', itemListId);
  addIfPresent(itemList, 'url', canonicalUrl);
  addIfPresent(itemList, 'name', headline);
  addIfPresent(itemList, 'description', description);
  addIfPresent(itemList, 'numberOfItems', embeddedVideos.length);
  addIfPresent(itemList, 'itemListOrder', ITEM_LIST_ORDER);
  itemList.itemListElement = embeddedVideos
    .map((v, i) => {
      const url = (v.embedUrl || '').replace(/\/$/, '') || v.url || '';
      if (!url) return null;
      return { '@type': 'ListItem', position: i + 1, url };
    })
    .filter(Boolean);

  // --- VideoObject nodes ---
  const videoObjects = embeddedVideos
    .map((v) => {
      const videoUrl = (v.embedUrl || '').replace(/\/$/, '') || v.url || '';
      if (!videoUrl) return null;
      const videoObj = {};
      addIfPresent(videoObj, '@type', 'VideoObject');
      addIfPresent(videoObj, '@id', `${videoUrl}#video`);
      addIfPresent(videoObj, 'name', v.name);
      addIfPresent(videoObj, 'url', videoUrl);
      addIfPresent(videoObj, 'description', v.description);
      addIfPresent(videoObj, 'uploadDate', v.uploadDate);
      addIfPresent(videoObj, 'thumbnailUrl', v.thumbnailUrl);
      addIfPresent(videoObj, 'duration', v.duration);
      addIfPresent(videoObj, 'embedUrl', v.embedUrl);
      addIfPresent(videoObj, 'inLanguage', inLanguage);
      addIfPresent(videoObj, 'publisher', ADOBE_PUBLISHER_REF);
      videoObj.isPartOf = { '@id': itemListId };
      if (aboutValue) videoObj.about = aboutValue;
      return videoObj;
    })
    .filter(Boolean);

  return {
    '@context': SCHEMA_ORG_CONTEXT,
    '@graph': [webPage, itemList, ...videoObjects],
  };
};
