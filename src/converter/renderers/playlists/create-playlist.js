import { htmlToElement, toBlock } from '../../modules/utils/dom-utils.js';

export function removeDashUnderscore(str) {
  return str?.replace(/[-_]/g, '') || '';
}

/**
 * Thumbnail urls are expected to have -<number>x<number> OR _<number>x<number>
 * Example: https://images-tv.adobe.com/<long hash>-960x491.jpg
 * which means the image is 960px width and 491px height
 * This function will get the thumbnail url with the matching provided widths
 * @param thumbnailUrls
 * @param widths the widths whose order is the preference of desired widths
 * @returns the thumbnail url with the best matching width
 */
export function getThumbnail(
  thumbnailUrls,
  widths = [960, 1920, 720, 666, 640],
) {
  const sizes = thumbnailUrls
    .map((url) => url.match(/[-_]\d+x\d+/g))
    .filter((matchArray) => matchArray?.length > 0)
    .map((matchArray) => removeDashUnderscore(matchArray[0]))
    .filter((size) => size && size.length > 0)
    // parse sizes to width and height
    .map((size) => size.split('x').map(Number))
    // sort by width
    .sort((a, b) => a[0] - b[0]);

  // Find matching thumbnails with the provided widths array
  const potentialSizes = widths
    .map((w) => sizes.find((s) => s[0] === w))
    .filter((t) => t);
  // add largest size to potentialSizes
  potentialSizes.push(sizes[sizes.length - 1]);

  // the first in the array is the target size
  const targetSize = potentialSizes[0];

  // find the thumbnail with the target size
  const targetThumbnail = thumbnailUrls.find((url) =>
    url.includes(targetSize.join('x')),
  );

  // return the target thumbnail if found, otherwise return the last thumbnail
  return targetThumbnail || thumbnailUrls[thumbnailUrls.length - 1];
}

/**
 *
 * @param {import('./types').Playlist[]} playlist
 * @returns
 */
function getPlaylistImage(playlist) {
  const firstVideo = playlist.Videos?.[0];
  const firstVideoThumbnailUrls = firstVideo?.jsonLinkedData?.thumbnailUrl;

  if (!firstVideoThumbnailUrls) {
    return '';
  }

  return getThumbnail(firstVideoThumbnailUrls);
}

/**
 * Creates a video row for playlist block
 * @param {Document} document
 * @param {import('./types').Video} Video
 * @returns
 */
function videoRow(document, Video) {
  const {
    URL = '#',
    TranscriptURL = '#',
    Title = '',
    Description = '',
    Duration = 0,
  } = Video;

  const newEl = htmlToElement(document);
  const newPLink = (u) => newEl(`<p><a href="${u}">${u}</a></p>`);

  const videoP = newPLink(URL);
  const videoTranscriptP = newPLink(TranscriptURL);

  const title = newEl(`<h3>${Title}</h3>`);
  const desc = newEl(`<p>${Description}</p>`);

  const duration = document.createElement('p');
  duration.innerHTML = Duration;

  return [[videoP], [title, desc, duration, videoTranscriptP]];
}

export function createPlaylistBlock(document, Videos) {
  const newEl = htmlToElement(document);
  const jsonData = Videos.filter((v) => v.jsonLinkedData).map(
    (v) => v.jsonLinkedData,
  );

  const jsonDivs = jsonData.map((jsonItem) =>
    newEl(`<code>${JSON.stringify(jsonItem, null, 2)}</code>`),
  );

  const jsonContainer = newEl('<div class="playlist-jsonld"></div>');
  jsonDivs.forEach((div) => jsonContainer.appendChild(div));
  const rows = Videos.map((video) => {
    const [videoCell, infoCell] = videoRow(document, video);
    return [videoCell, infoCell];
  });
  return toBlock('playlist', [[jsonContainer], ...rows], document);
}

/**
 *
 * @param {Document} document
 * @param {import('./types').Playlist} playlist
 */
export function createPlaylist(document, playlist) {
  const firstSection = document.querySelector('main > div:first-child');
  const { Title = '', Description = '', Videos = [] } = playlist;
  const newEl = htmlToElement(document);

  firstSection.append(newEl(`<h3>${Title}</h3>`));
  firstSection.append(newEl(`<p>${Description}</p>`));
  firstSection.append(createPlaylistBlock(document, Videos));

  const playlistImage = getPlaylistImage(playlist);
  if (playlistImage) {
    document.head.appendChild(
      newEl(`<meta name="image" content="${playlistImage}">`),
    );
  }
}
