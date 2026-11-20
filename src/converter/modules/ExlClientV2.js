import Logger from '@adobe/aio-lib-core-logging';
import stateLib from '../../common/utils/state-lib-util.js';
import { buildExlClientAuthOptions } from './exl-client-auth.js';
import { paramMemoryStore } from './utils/param-memory-store.js';

export const aioLogger = Logger('ExlClientV2');

export default class ExlClientV2 {
  /**
   *
   * @param {ExlClientOptions} options
   */
  constructor({
    host = 'https://experienceleague.adobe.com',
    state,
    isReview = false,
    reviewAuthHeaders,
  } = {}) {
    this.host = host;
    this.state = state;
    this.isReview = isReview;
    this.reviewAuthHeaders = reviewAuthHeaders;
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

  // eslint-disable-next-line class-methods-use-this
  articleSearchPath(path, lang = 'en') {
    const searchParams = new URLSearchParams({
      field: 'path',
      value: path,
      lang,
    });
    return `api/v2/articles/search?${searchParams.toString()}`;
  }

  async getArticleHtmlByPath(path, lang = 'en', requestOptions = {}) {
    return this.doFetchHtml(this.articleSearchPath(path, lang), requestOptions);
  }

  async getArticleJsonByPath(path, lang = 'en', requestOptions = {}) {
    return this.doFetchJson(this.articleSearchPath(path, lang), requestOptions);
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
    const headers = {
      Accept: 'text/html',
      ...requestOptions.headers,
    };
    if (this.isReview) {
      delete headers.authorization;
      Object.assign(headers, this.reviewAuthHeaders);
    }
    return fetch(url, {
      ...requestOptions,
      headers,
    });
  }

  /**
   * Get Playlist By ID as JSON
   * @param {string} id
   * @param {string} lang
   * @param {RequestInit} requestOptions
   * @returns {Promise<Response>}
   */
  async getPlaylistJsonById(id, lang = 'en', requestOptions = {}) {
    const path = `api/v2/playlists/${id}?lang=${lang}`;
    return this.doFetchJson(path, requestOptions);
  }

  async doFetchJson(path, requestOptions = {}) {
    const url = new URL(path, this.host);
    const headers = {
      Accept: 'application/json',
      ...requestOptions.headers,
    };
    if (this.isReview) {
      delete headers.authorization;
      Object.assign(headers, this.reviewAuthHeaders);
    }
    return fetch(url, {
      ...requestOptions,
      headers,
    });
  }
}

export const createDefaultExlClientV2 = async () => {
  const params = paramMemoryStore.get();
  const {
    exlApiHost,
    exlDeliveryApiImsOrigin,
    exlDeliveryApiClientId,
    exlDeliveryApiClientSecret,
    exlDeliveryApiClientCode,
  } = params;
  const state = await stateLib.init();
  return new ExlClientV2({
    host: exlApiHost,
    state,
    ...(await buildExlClientAuthOptions({
      exlDeliveryApiImsOrigin,
      exlDeliveryApiClientId,
      exlDeliveryApiClientSecret,
      exlDeliveryApiClientCode,
    })),
  });
};
