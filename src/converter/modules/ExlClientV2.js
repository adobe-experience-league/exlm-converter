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
   * @param {RequestInit} requestOptions
   * @returns {Promise<string>}
   */
  // eslint-disable-next-line class-methods-use-this
  async getPlaylistHtmlById(id, lang = 'en', requestOptions = {}) {
    const path = `api/v2/playlists/${id}?lang=${lang}`;
    return this.doFetchHtml(path, requestOptions);
  }

  /**
   * Get Slide By ID
   * @param {string} id
   * @param {string} lang
   * @param {RequestInit} requestOptions
   * @returns {Promise<Response>}
   */
  // eslint-disable-next-line class-methods-use-this
  async getSlideHtmlById(id, lang = 'en', requestOptions = {}) {
    const path = `api/v2/slides/${id}?lang=${lang}`;
    return this.doFetchHtml(path, requestOptions);
  }

  async getArticleHtmlByPath(path, lang = 'en', requestOptions = {}) {
    const searchParams = new URLSearchParams({
      field: 'path',
      value: path,
      lang,
    });
    const searchPath = `api/v2/articles/search?${searchParams.toString()}`;
    return this.doFetchHtml(searchPath, requestOptions);
  }

  async getTocHtmlById(id, lang = 'en', requestOptions = {}) {
    const path = `api/v2/tocs/${id}?lang=${lang}`;
    return this.doFetchHtml(path, requestOptions);
  }

  /**
   * Get Landing Page By ID
   * @param {string} id
   * @param {string} lang
   * @param {RequestInit} requestOptions
   * @returns {Promise<Response>}
   */
  async getLandingPageById(id, lang = 'en', requestOptions = {}) {
    if (!id) {
      throw new Error('landing id is required');
    }
    const path = `api/v2/landing/${id}?lang=${lang}`;
    return this.doFetchHtml(path, requestOptions);
  }

  /**
   * Get On Demand Event By ID
   * @param {string} id
   * @param {string} lang
   * @param {RequestInit} requestOptions
   * @returns {Promise<Response>}
   */
  async getOnDemandEventById(id, lang = 'en', requestOptions = {}) {
    const path = `api/v2/on-demand-events/${id}?lang=${lang}`;
    return this.doFetchHtml(path, requestOptions);
  }

  async doFetchHtml(path, requestOptions = {}) {
    const url = new URL(path, this.host);
    console.log(`[FETCH] ${url.toString()}`);
    return fetch(url, {
      ...requestOptions,
      headers: {
        Accept: 'text/html',
        ...requestOptions.headers,
      },
    });
  }
}

export const createDefaultExlClientV2 = async () => {
  const params = paramMemoryStore.get();
  const { exlApiHostV2 } = params;
  const state = await stateLib.init();
  return new ExlClientV2({
    host: exlApiHostV2,
    state,
  });
};
