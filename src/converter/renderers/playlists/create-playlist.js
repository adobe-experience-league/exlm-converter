import { htmlToElement, toBlock } from '../../modules/utils/dom-utils.js';

function removeDashUnderscore(str) {
  return str?.replace(/[-_]/g, '') || '';
}

/**
 * Thumbnail urls are expecte to have -<number>x<number> OR _<number>x<number>
 * Example: https://images-tv.adobe.com/<long hash>-960x491.jpg
 * which means the image is 960px width and 491px height
 * This function will get the thumbnail url with the matcing provided widths
 * @param {string[]} thumbnailUrls
 * @param {number[]} widths the widths whose order is the preference of desired widths
 * @returns {string} the thumbnail url with the best matching width
 */
function getThumbnail(thumbnailUrls, widths = [960, 1920, 720, 666, 640]) {
  const sizes =
    thumbnailUrls
      .map((url) => url.match(/[-_]\d+x\d+/g))
      .filter((matchArray) => matchArray?.length > 0)
      .map((matchArray) =>
        matchArray.length ? removeDashUnderscore(matchArray[0]) : '',
      )
      .filter((size) => size && size.length > 0)
      // parse sizes to width and height
      .map((size) => size.split('x').map(Number))
      // sort by width
      .sort((a, b) => a[0] - b[0]) || [];

  // Find matching thumbnails with the provided widths array
  const potentialSizes = widths
    .map((w) => sizes.find((s) => s[0] === w))
    .filter((t) => t);
  // add largest tsize to potentialSizes
  potentialSizes.push(sizes[sizes.length - 1]);

  // the first in the array is the target size
  const targetSize = potentialSizes[0];

  // find the thumbnail with the target size
  return thumbnailUrls.find((url) => url.includes(targetSize.join('x')));
}

/**
 * Creates a video row for playlist block
 * @param {Document} document
 * @param {Video} Video
 * @returns
 */
function videoRow(document, Video) {
  const {
    URL = '#',
    TranscriptURL = '#',
    jsonLinkedData,
    Title = '',
    Description = '',
    Duration = 0,
  } = Video;

  const thumbnailUrls = jsonLinkedData.thumbnailUrl || [];

  const newEl = htmlToElement(document);
  const newPLink = (u) => newEl(`<p><a href="${u}">${u}</a></p>`);

  const videoP = newPLink(URL);
  const videoTranscriptP = newPLink(TranscriptURL);

  const thumbnailUrl = getThumbnail(thumbnailUrls);

  const thumbnail = newEl(`<img src="${thumbnailUrl}" alt="${Title}">`);
  const title = newEl(`<h3>${Title}</h3>`);
  const desc = newEl(`<p>${Description}</p>`);

  const duration = document.createElement('p');
  duration.innerHTML = Duration;

  const jsonLd = document.createElement('code');
  jsonLd.innerHTML = JSON.stringify(jsonLinkedData, null, 2);

  return [
    [videoP, thumbnail],
    [title, desc, duration, videoTranscriptP],
    [jsonLd],
  ];
}

export function createPlaylistBlock(document, Videos) {
  const rows = Videos.map((video) => videoRow(document, video));
  return toBlock('playlist', rows, document);
}

/**
 *
 * @param {Document} document
 * @param {Playlist} playlist
 */
export function createPlaylist(document, playlist) {
  const firstSection = document.querySelector('main > div:first-child');
  const { Title = '', Description = '', Videos = [] } = playlist;
  const newEl = htmlToElement(document);

  firstSection.append(newEl(`<h3>${Title}</h3>`));
  firstSection.append(newEl(`<p>${Description}</p>`));
  firstSection.append(createPlaylistBlock(document, Videos));
}
