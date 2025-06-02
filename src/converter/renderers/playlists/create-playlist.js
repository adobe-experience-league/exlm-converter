import { htmlToElement, toBlock } from '../../modules/utils/dom-utils.js';

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

  const newEl = htmlToElement(document);
  const newPLink = (u) => newEl(`<p><a href="${u}">${u}</a></p>`);

  const videoP = newPLink(URL);
  const videoTranscriptP = newPLink(TranscriptURL);

  const title = newEl(`<h3>${Title}</h3>`);
  const desc = newEl(`<p>${Description}</p>`);

  const duration = document.createElement('p');
  duration.innerHTML = Duration;

  const jsonLd = document.createElement('code');
  jsonLd.innerHTML = JSON.stringify(jsonLinkedData, null, 2);

  return [[videoP], [title, desc, duration, videoTranscriptP], [jsonLd]];
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
