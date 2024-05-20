import Logger from '@adobe/aio-lib-core-logging';
import { addExtension, removeExtension } from './utils/path-utils.js';
import { getMatchLanguage } from '../../common/utils/language-utils.js';
import stateLib from '../../common/utils/state-lib-util.js';
import { placeholderPlaylist } from './placeholder-playlist.js';

export const aioLogger = Logger('ExlClient');

/**
 * @typedef {object} ExlArticle
 * @property {string} ID
 * @property {string} URL
 * @property {string[]} Solution
 * @property {string[]} Level
 * @property {string} Title
 * @property {string[]} Type
 * @property {string} Description
 * @property {string} Thumbnail
 * @property {string[]} Role
 * @property {number} Order
 * @property {boolean} Publish
 * @property {boolean} Markdown
 * @property {string} FullBody
 * @property {string} File
 * @property {string} FullMeta
 * @property {string} OriginalURL
 * @property {string[]} Tags
 * @property {string} AddedUTC
 * @property {string} UpdatedUTC
 * @property {boolean} Archived
 * @property {boolean} Ignore
 * @property {number} timestamp
 * @property {boolean} Hide
 * @property {string} id
 * @property {string} Keywords
 */

/**
 * @typedef {Object} ExlArticleResponse
 * @property {ExlArticle} data
 * @property {string|null} error
 * @property {Array} links
 * @property {Number} status
 */

/**
 * @typedef {Object} ExlClientOptions
 * @property {string} domain
 * @property {StateStore} state
 */

const LABELS_FROM_ENDPOINTS = {};

export default class ExlClient {
  /**
   *
   * @param {ExlClientOptions} options
   */
  constructor({ domain = 'https://experienceleague.adobe.com', state } = {}) {
    this.domain = domain;
    this.state = state;
  }

  /**
   * Get Article By ID
   * @param {string} id
   * @param {string} lang
   * @returns {ExlArticleResponse}
   */
  async getArticleById(id, lang = 'en') {
    const path = `api/articles/${id}?lang=${lang}`;
    const response = await this.doFetch(path);

    if (response.error) {
      throw new Error(response.error);
    } else {
      return this.removeSpacesFromKeysRecursively(response);
    }
  }

  /**
   * Get Playlist By ID
   * @param {string} id
   * @param {string} lang
   * @returns
   */
  // eslint-disable-next-line class-methods-use-this
  async getPlaylistById(id, lang = 'en') {
    if (id === 'sample-playlist') {
      console.log(`fetching playlist with id: ${id} and lang: ${lang}`);
      return Promise.resolve(
        this.removeSpacesFromKeysRecursively(placeholderPlaylist),
      );
    }
    throw new Error(`Playlist with id: ${id} not found`);
  }

  /**
   * Get non-English labels from EXL Config populated endpoints
   * @param {string} api
   * @param {string} id
   * @param {string} lang
   * @returns {string}
   */
  async getLabelFromEndpoint(endpoint, id, lang = 'en') {
    if (LABELS_FROM_ENDPOINTS[endpoint] === undefined) {
      LABELS_FROM_ENDPOINTS[endpoint] = {};
    }

    if (LABELS_FROM_ENDPOINTS.endpoint?.lang === undefined) {
      const path = `api/${endpoint}?lang=${lang}`;
      const response = await this.doFetch(path);

      if (response.error) {
        throw new Error(response.error);
      } else {
        LABELS_FROM_ENDPOINTS[endpoint][lang] = response.json()?.data;

        if (LABELS_FROM_ENDPOINTS[endpoint][lang] === undefined) {
          throw new Error(
            `${endpoint} requested returned no labels for ${lang}`,
          );
        }
      }
    }

    return LABELS_FROM_ENDPOINTS[endpoint][lang].find(lbl => lbl.Name_en === undefined ? lbl.Name === id : lbl.Name_en === id) || '';
  }

  /**
   * Get an article by path
   * @param {string} path
   * @param {string} lang
   * @returns {ExlArticlesResponse}
   */
  async getArticlesByPath(path, lang = 'en') {
    const langForApi = getMatchLanguage(lang) || lang;
    // handle internal paths
    const finalPath = addExtension(path, '.html');
    let url = new URL(finalPath, this.domain);
    url.searchParams.set('lang', langForApi);
    url = encodeURIComponent(url.toString());
    url = url.toLowerCase(); // use lowercase when using `Search%20URL` query param
    const apiPath = `api/articles?Search%20URL=${url}&lang=${langForApi}`;
    console.log(`Fetching article from ${apiPath}`);
    const response = await this.doFetch(apiPath);

    if (response.error) {
      throw new Error(response.error);
    } else {
      return this.removeSpacesFromKeysRecursively(response);
    }
  }

  async getLandingPages(lang = 'en') {
    const apiUrl = new URL('/api/landing-pages', this.domain);
    apiUrl.searchParams.set('lang', lang);
    apiUrl.searchParams.set('page_size', '100');
    const json = await this.doFetch(apiUrl.toString());
    return json?.data;
  }

  async getSolutions() {
    const solutionsState = await this.state.get('solutions');
    if (solutionsState && solutionsState.value) {
      aioLogger.debug('Using cached solutions');
      return JSON.parse(solutionsState.value);
    }

    aioLogger.debug('Fetching solutions from API');
    const solutionsPath = '/api/solutions?page_size=1000&full=true';
    const data = await this.doFetch(solutionsPath);
    const solutions = data.data || [];
    aioLogger.debug(`Fetched ${solutions.length} solutions and caching them.`);
    if (solutions) {
      // store for 24 hours (86400 seconds)
      await this.state.put('solutions', JSON.stringify(solutions), {
        ttl: 86400,
      });
    }
    return solutions;
  }

  async getLandingPageByFileName(landingName, lang = 'en') {
    const langForAPI = getMatchLanguage(lang) || lang;
    if (!landingName) throw new Error('landingName is required');
    const landingPages = await this.getLandingPages(langForAPI);
    const landingPage = landingPages.find(
      (landing) =>
        removeExtension(landing.File) === removeExtension(landingName),
    );
    return this.removeSpacesFromKeysRecursively(landingPage);
  }

  async doFetch(path) {
    const url = new URL(path, this.domain);
    const response = await fetch(url);
    return response.json();
  }

  removeSpacesFromKeysRecursively(obj) {
    if (!obj) return obj;
    Object.entries(obj).forEach(([key]) => {
      if (key.includes(' ')) {
        const newKey = key.replace(/ /g, '');
        obj[newKey] = obj[key];
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        this.removeSpacesFromKeysRecursively(obj[key]);
      }
    });
    return obj;
  }
}

export const createDefaultExlClient = async () => {
  const state = await stateLib.init();
  return new ExlClient({
    domain: 'https://experienceleague.adobe.com',
    state,
  });
};
