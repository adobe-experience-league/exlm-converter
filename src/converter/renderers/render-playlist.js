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
import { createPlaylistBrowse } from './playlists/create-playlist-browse.js';

const INDEX_PLAYLIST_ID = 'index';

export default async function renderPlaylist(path) {
  const match = matchPlaylistPath(path);
  const {
    params: { lang, playlistId = INDEX_PLAYLIST_ID },
  } = match;

  const isIndex = playlistId === INDEX_PLAYLIST_ID;

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

    if (isIndex) {
      createPlaylistBrowse(document, playlist);
    } else {
      createPlaylist(document, playlist);
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
