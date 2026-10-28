import Logger from '@adobe/aio-lib-core-logging';
import stateLib from '../../common/utils/state-lib-util.js';
import { paramMemoryStore } from './utils/param-memory-store.js';

export const aioLogger = Logger('ExlClient');

// Published Browse cells still need legacy label lookup until they migrate to TQ.
export default class ExlClient {
  constructor({ host = 'https://experienceleague.adobe.com', state } = {}) {
    this.host = host;
    this.state = state;
  }

  async getLabelFromEndpoint(endpoint, id, lang = 'en') {
    if (lang === 'en') {
      return id;
    }

    const key = `${endpoint}-${lang}`;

    try {
      const labelState = await this.state.get(key);
      if (labelState && labelState.value) {
        aioLogger.debug(`Using cached value for ${key}`);
        return JSON.parse(labelState.value)[id] || id;
      }
    } catch (e) {
      aioLogger.error(`Failed to read cached labels for ${key}: ${e.message}`);
    }

    aioLogger.debug(`Fetching ${key} from API`);
    let next = `api/${endpoint}?lang=${lang}&page_size=2000`;
    const results = {};

    try {
      do {
        // eslint-disable-next-line no-await-in-loop
        const response = await this.doFetch(next);
        if (response.error) {
          aioLogger.error(response.error);
        } else {
          const raw = response?.data;
          if (!Array.isArray(raw) || raw.length <= 0) {
            aioLogger.error(
              `${endpoint} request returned no labels for ${lang}`,
            );
          } else {
            raw.forEach((item) => {
              results[item.Name_en] = item.Name;
            });
          }
        }

        const nextUriObject =
          response?.links?.find((link) => link.rel === 'next') ||
          response?.links?.find((link) => link.rel === 'last');
        next = nextUriObject?.uri;
      } while (next !== undefined);

      if (Object.keys(results).length > 0) {
        await this.state.put(key, JSON.stringify(results), { ttl: 86400 });
      }
    } catch (e) {
      aioLogger.error(
        `Failed to fetch labels for ${key}, falling back to id "${id}": ${e.message}`,
      );
    }

    return results[id] || id;
  }

  async doFetch(path) {
    const url = new URL(path, this.host);
    console.log(`[FETCH] ${url.toString()}`);
    const response = await fetch(url);
    return response.json();
  }
}

export const createDefaultExlClient = async () => {
  const { exlApiHost } = paramMemoryStore.get();
  const state = await stateLib.init();
  return new ExlClient({ host: exlApiHost, state });
};
