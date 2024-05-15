import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
import { createDefaultExlClient } from '../modules/ExlClient.js';
import { matchPlaylistPath } from '../modules/utils/path-match-utils.js';
import { createMetaData } from '../modules/utils/metadata-util.js';
import { htmlToElement, toBlock } from '../modules/utils/dom-utils.js';

/**
 * @typedef {Object} Video
 * @property {string} Title
 * @property {string} Description
 * @property {string[]} Thumbnail
 * @property {string} URL
 * @property {number} Duration
 * @property {string} TranscriptURL
 */

/**
 * Create Video Row
 * @param {Document} document
 * @param {Video} Video
 * @returns {[]}
 */
function videoRow(document, Video) {
  const {
    URL = '#',
    TranscriptURL = '#',
    Thumbnail = [],
    Title = '',
    Description = '',
    Duration = 0,
  } = Video;

  const newEl = htmlToElement(document);
  const newPLink = (u) => newEl(`<p><a href="${u}">${u}</a></p>`);

  const videoP = newPLink(URL);
  const videoTranscriptP = newPLink(TranscriptURL);
  const thumbnailUrl = Thumbnail.find((url) => url.includes('420x236')) || '';
  const thumbnail = newEl(`<img src="${thumbnailUrl}" alt="${Title}">`);
  const title = newEl(`<h3>${Title}</h3>`);
  const desc = newEl(`<p>${Description}</p>`);

  const duration = document.createElement('p');
  duration.innerHTML = Duration;
  return [
    [videoP, thumbnail],
    [title, desc, duration, videoTranscriptP],
  ];
}

/**
 * @param {Video} Videos
 */
function createPlaylistBlock(document, Videos) {
  const rows = Videos.map((video) => videoRow(document, video));
  return toBlock('playlist', rows, document);
}

function createPlaylist(document, playlist) {
  const firstSection = document.querySelector('main > div:first-child');
  const { Title = '', Description = '', Videos = [] } = playlist;
  const newEl = htmlToElement(document);

  firstSection.append(newEl(`<h3>${Title}</h3>`));
  firstSection.append(newEl(`<p>${Description}</p>`));
  firstSection.append(createPlaylistBlock(document, Videos));
}

export default async function renderPlaylist(path) {
  const {
    params: { lang, playlistId },
  } = matchPlaylistPath(path);

  const defaultExlClient = await createDefaultExlClient();
  const playlist = await defaultExlClient.getPlaylistById(playlistId, lang);

  if (playlist) {
    const hast = h('html', [
      h('body', [h('header', []), h('main', [h('div')]), h('footer', [])]),
    ]);
    raw(hast);
    rehypeFormat()(hast);
    const html = toHtml(hast, { upperDoctype: true });

    const dom = new jsdom.JSDOM(html);
    const { document } = dom.window;
    const solutions = await defaultExlClient.getSolutions();
    createMetaData(
      document,
      playlist.FullMeta,
      playlist,
      'playlist',
      solutions,
    );
    createPlaylist(document, playlist);
    return {
      body: dom.serialize(),
      headers: {
        'Content-Type': 'text/html',
      },
      md: '',
      original: html,
    };
  }
  return {
    error: new Error(`No Page found for: ${path}`),
  };
}
