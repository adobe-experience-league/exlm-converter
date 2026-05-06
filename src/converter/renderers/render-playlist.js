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
import { upsertJsonLdScript } from '../modules/schemas/json-ld-util.js';
import { buildPlaylistSchema } from '../modules/schemas/builders/playlist-schema.js';

const SCHEMA_SCRIPT_ID = 'exl-schema-org-jsonld';

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

  const [playlistHtmlResponse, playlistJsonResponse] = await Promise.all([
    defaultExlClientv2.getPlaylistHtmlById(playlistId, lang, {
      headers: {
        ...(authorization && { authorization }),
      },
    }),
    paramMemoryStore.hasFeatureFlag('schema-org')
      ? defaultExlClientv2.getPlaylistJsonById(playlistId, lang)
      : Promise.resolve(null),
  ]);

  if (!playlistHtmlResponse.ok) {
    return {
      statusCode: playlistHtmlResponse.status,
      error: new Error(
        `Failed to fetch playlist HTML: ${playlistHtmlResponse.statusText}`,
      ),
    };
  }

  let html = await playlistHtmlResponse.text();

  if (playlistJsonResponse?.ok) {
    try {
      const { data } = await playlistJsonResponse.json();
      const schema = buildPlaylistSchema(data, lang);
      if (schema) {
        const dom = new jsdom.JSDOM(html);
        upsertJsonLdScript(dom.window.document, schema, SCHEMA_SCRIPT_ID);
        html = dom.serialize();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[schema-org] Failed to inject playlist schema:', e);
    }
  }

  return {
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: html,
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
