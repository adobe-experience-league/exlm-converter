import { htmlToElement, toBlock } from '../../modules/utils/dom-utils.js';

/**
 * Thumbnail urls are expecte to have -<number>x<number>
 * Example: https://images-tv.adobe.com/<long hash>-960x491.jpg
 * which means the image is 960px width and 491px height
 * This function will get the thumbnail url that is just above 900px width
 * if there is no thumbnail above 900px width, it will get the largest thumbnail
 * @param {string[]} thumbnailUrls
 */
function getThumbnail(thumbnailUrls, minWidth = 900) {
  const sizes = thumbnailUrls
    .map((url) => url.match(/-\d+x\d+/g))
    .map((url) => (url[0] ? url[0].replace('-', '') : ''))
    .filter((size) => size)
    // parse sizes to width and height
    .map((size) => size.split('x').map(Number))
    // sort by width
    .sort((a, b) => a[0] - b[0]);

  // get the value just above 900 width
  const [width, height] =
    sizes.find((size) => size[0] > minWidth) || sizes.pop();

  return thumbnailUrls.find((url) => url.includes(`${width}x${height}`)) || '';
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
