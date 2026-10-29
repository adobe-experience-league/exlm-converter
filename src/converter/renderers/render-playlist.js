import jsdom from 'jsdom';
import { matchPlaylistPath } from '../modules/utils/path-match-utils.js';
import { paramMemoryStore } from '../modules/utils/param-memory-store.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';
import { upsertJsonLdScript } from '../modules/schemas/json-ld-util.js';
import { buildPlaylistSchema } from '../modules/schemas/builders/playlist-schema.js';

const SCHEMA_SCRIPT_ID = 'exl-schema-org-jsonld';

async function renderPlaylistV2({ playlistId, lang, authorization }) {
  const defaultExlClientv2 = await createDefaultExlClientV2();

  const [playlistHtmlResponse, playlistJsonResponse] = await Promise.all([
    defaultExlClientv2.getPlaylistHtmlById(playlistId, lang, {
      headers: {
        ...(authorization && { authorization }),
      },
    }),
    paramMemoryStore.hasFeatureFlag('schema-org-playlist')
      ? defaultExlClientv2.getPlaylistJsonById(playlistId, lang, {
          headers: {
            ...(authorization && { authorization }),
          },
        })
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
        const { document } = dom.window;
        document
          .querySelectorAll('script[type="application/ld+json"]')
          .forEach((el) => el.remove());
        upsertJsonLdScript(document, schema, SCHEMA_SCRIPT_ID);
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

  return renderPlaylistV2({ playlistId, lang, authorization });
}
