import Logger from '@adobe/aio-lib-core-logging';
import { addExtension, removeExtension } from './utils/path-utils.js';
import { getMatchLanguage } from '../../common/utils/language-utils.js';
import stateLib from '../../common/utils/state-lib-util.js';
import { placeholderPlaylist } from './placeholder-playlist.js';
import { paramMemoryStore } from './utils/param-memory-store.js';

export const aioLogger = Logger('ExlClient');

export const EXL_LABEL_ENDPOINTS = {
  LABELS: 'labels',
  LEVELS: 'levels',
  FEATURES: 'features',
  ROLES: 'roles',
  TOPIS: 'topics',
};

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
 * @property {string} host
 * @property {StateStore} state
 */

export default class ExlClient {
  /**
   *
   * @param {ExlClientOptions} options
   */
  constructor({ host = 'https://experienceleague.adobe.com', state } = {}) {
    this.host = host;
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
   * @param {string} endpoint - EXL_LABEL_ENDPOINTS
   * @param {string} id
   * @param {string} lang
   * @returns {string}
   */
  async getLabelFromEndpoint(endpoint, id, lang = 'en') {
    if (lang === 'en') {
      return id;
    }

    const key = `${endpoint}-${lang}`;
    const labelState = await this.state.get(key);

    if (labelState && labelState.value) {
      aioLogger.debug(`Using cached value for ${key}`);
      return JSON.parse(labelState.value)[id];
    }

    aioLogger.debug(`Fetching ${key} from API`);

    let next = `api/${endpoint}?lang=${lang}&page_size=2000`;
    const results = {};

    do {
      /* eslint-disable-next-line no-await-in-loop */
      const response = await this.doFetch(next);

      if (response.error) {
        aioLogger.error(response.error);
      } else {
        const raw = response?.data;

        if (raw === undefined || raw.length <= 0) {
          aioLogger.error(`${endpoint} request returned no labels for ${lang}`);
        }

        raw.forEach((item) => {
          results[item.Name_en] = item.Name;
        });
      }

      // "Next" is always used when page size < remaining items, "Last" is used when page size > items remaining
      const nextUriObject =
        response?.links.find((link) => link.rel === 'next') ||
        response?.links.find((link) => link.rel === 'last');
      next = nextUriObject?.uri;
    } while (next !== undefined);

    if (Object.keys(results).length > 0) {
      // store for 24 hours (86400 seconds)
      await this.state.put(key, JSON.stringify(results), {
        ttl: 86400,
      });
    }

    return results[id] || id;
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
    let url = new URL(finalPath, 'https://experienceleague.adobe.com');
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
    const apiUrl = new URL('/api/landing-pages', this.host);
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
    const url = new URL(path, this.host);
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
  const params = paramMemoryStore.get();
  const { exlApiHost } = params;
  const state = await stateLib.init();
  return new ExlClient({
    host: exlApiHost,
    state,
  });
};
