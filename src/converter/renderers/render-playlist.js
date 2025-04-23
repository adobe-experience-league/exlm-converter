import { createDefaultExlClient } from '../modules/ExlClient.js';
import { matchPlaylistPath } from '../modules/utils/path-match-utils.js';

export default async function renderPlaylist(path) {
  const match = matchPlaylistPath(path);
  const {
    params: { lang, playlistId },
  } = match;

  if (!playlistId) {
    return {
      error: new Error(`playlist id is required but none was provided`),
    };
  }

  const defaultExlClient = await createDefaultExlClient();

  const playlistHtml = await defaultExlClient.getPlaylistHtmlById(
    playlistId,
    lang,
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
