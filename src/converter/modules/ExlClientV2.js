import Logger from '@adobe/aio-lib-core-logging';
import stateLib from '../../common/utils/state-lib-util.js';
import { paramMemoryStore } from './utils/param-memory-store.js';

export const aioLogger = Logger('ExlClientV2');

export default class ExlClientV2 {
  /**
   *
   * @param {ExlClientOptions} options
   */
  constructor({ host = 'https://experienceleague.adobe.com', state } = {}) {
    this.host = host;
    this.state = state;
  }

  /**
   * Get Playlist By ID
   * @param {string} id
   * @param {string} lang
   * @returns {Promise<string>}
   */
  // eslint-disable-next-line class-methods-use-this
  async getPlaylistHtmlById(id, lang = 'en') {
    const path = `api/v2/playlists/${id}?lang=${lang}`;
    return this.doFetchHtml(path);
  }

  async doFetchHtml(path) {
    const url = new URL(path, this.host);
    console.log(`[FETCH] ${url.toString()}`);
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html',
      },
    });
    return response.text();
  }
}

export const createDefaultExlClientV2 = async () => {
  const params = paramMemoryStore.get();
  const { exlApiHost } = params;
  const state = await stateLib.init();
  return new ExlClientV2({
    host: exlApiHost,
    state,
  });
};
