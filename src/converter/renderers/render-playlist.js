import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
import { createDefaultExlClient } from '../modules/ExlClient.js';
import { matchPlaylistPath } from '../modules/utils/path-match-utils.js';
import { createMetaData } from '../modules/utils/metadata-util.js';
import { DOCPAGETYPE } from '../../common/utils/doc-page-types.js';
import { createPlaylist } from './playlists/create-playlist.js';
import { paramMemoryStore } from '../modules/utils/param-memory-store.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';

async function renderPlaylistV1({ path, playlistId, lang }) {
  const defaultExlClient = await createDefaultExlClient();

  const { data: playlist } = await defaultExlClient.getPlaylistById(
    playlistId,
    lang,
  );

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

async function renderPlaylistV2({ playlistId, lang, authorization }) {
  const defaultExlClientv2 = await createDefaultExlClientV2();

  const playlistHtml = await defaultExlClientv2.getPlaylistHtmlById(
    playlistId,
    lang,
    {
      headers: {
        ...(authorization && { authorization }),
      },
    },
  );

  return {
    body: playlistHtml,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: playlistHtml,
  };
}

export default async function renderPlaylist(path, authorization) {
  const match = matchPlaylistPath(path);
  const {
    params: { lang, playlistId },
  } = match;

  if (!playlistId) {
    return {
      error: new Error(`playlist id is required but none was provided`),
    };
  }

  if (paramMemoryStore.hasFeatureFlag('playlists-v2')) {
    return renderPlaylistV2({ path, playlistId, lang, authorization });
  }
  return renderPlaylistV1({ path, playlistId, lang });
}
