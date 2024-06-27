import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
import { createDefaultExlClient } from '../modules/ExlClient.js';
import { matchPlaylistPath } from '../modules/utils/path-match-utils.js';
import { createMetaData } from '../modules/utils/metadata-util.js';
import { htmlToElement, toBlock } from '../modules/utils/dom-utils.js';
import { DOCPAGETYPE } from '../../common/utils/doc-page-types.js';

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
  const thumbnailUrl =
    thumbnailUrls.find((url) => url.includes('960x540')) || '';
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

function createPlaylistBrowse(document, playlist) {
  const firstSection = document.querySelector('main > div:first-child');
  const { Title = '', Description = '' } = playlist;
  const newEl = htmlToElement(document);

  firstSection.append(
    toBlock(
      'playlist-browse',
      [
        [
          [
            newEl(`<img src="${playlist.FullMeta.image}">`),
            newEl(`<h1>${Title}</h1>`),
            newEl(`<p>${Description}</p>`),
          ],
        ],
      ],
      document,
    ),
  );
}

export default async function renderPlaylist(path) {
  const {
    params: { lang, playlistId },
  } = matchPlaylistPath(path);

  const defaultExlClient = await createDefaultExlClient();

  let playlist;

  if (!playlistId) {
    // TODO: Get Index page details from the API
    playlist = {
      Title: 'Courses from Adobe experts, designed just for you.',
      Description:
        'In Experience League, a course is an expertly curated collection of lessons designed to quickly help you gain the skills and knowledge you seek. Get personalized course recommendations by completing your profile.',
      FullMeta: {
        title: 'Courses from Adobe experts, designed just for you.',
        description:
          'In Experience League, a course is an expertly curated collection of lessons designed to quickly help you gain the skills and knowledge you seek. Get personalized course recommendations by completing your profile.',
        image:
          'https://experienceleague.adobe.com/assets/img/courses/courses-marquee-right.png',
      },
    };
  } else {
    const { data } = await defaultExlClient.getPlaylistById(playlistId, lang);
    playlist = data;
  }

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
      DOCPAGETYPE.DOC_PLAYLIST,
      solutions,
    );

    if (playlistId) {
      createPlaylist(document, playlist);
    } else {
      createPlaylistBrowse(document, playlist);
    }

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
