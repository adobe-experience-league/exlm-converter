import Logger from '@adobe/aio-lib-core-logging';
import stateLib from '../../common/utils/state-lib-util.js';
import { mapPathSegmentToExliaTaxonomyLang } from '../../common/utils/language-utils.js';
import { paramMemoryStore } from './utils/param-memory-store.js';

const aioLogger = Logger('exlia-taxonomy');

const UUID_PATTERN =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const FETCH_TIMEOUT_MS = 15000;
const CACHE_TTL_SEC = 86400;

/**
 * Extract a canonical lowercase TQ / taxonomy UUID from a URL fragment or bare id string.
 * @param {string} value
 * @returns {string|null}
 */
export function extractTqUuid(value) {
  if (value == null || typeof value !== 'string') return null;
  const match = value.trim().match(UUID_PATTERN);
  return match ? match[1].toLowerCase() : null;
}

/**
 * @typedef {object} TaxonomyLabelResolver
 * @property {() => boolean} isEnabled
 * @property {(uuid: string, pathLang: string) => Promise<string|null>} getDisplayLabel
 */

/**
 * @returns {Promise<TaxonomyLabelResolver>}
 */
export async function createExliaTaxonomyLabelResolver() {
  const params = paramMemoryStore.get();
  const rawBase =
    typeof params?.exliaTaxonomyBaseUrl === 'string'
      ? params.exliaTaxonomyBaseUrl.trim()
      : '';
  const baseUrl = rawBase.replace(/\/$/, '');

  if (!baseUrl) {
    return {
      isEnabled() {
        return false;
      },
      async getDisplayLabel() {
        return null;
      },
    };
  }

  const state = await stateLib.init();

  return {
    isEnabled() {
      return true;
    },
    /**
     * @param {string} uuid
     * @param {string} pathLang
     * @returns {Promise<string|null>}
     */
    async getDisplayLabel(uuid, pathLang) {
      const iaLang = mapPathSegmentToExliaTaxonomyLang(pathLang);
      if (!uuid || iaLang === 'en') return null;

      const cacheKey = `tq-taxonomy-${iaLang}-${uuid}`;
      const cached = await state.get(cacheKey);
      if (cached?.value) {
        try {
          return JSON.parse(String(cached.value));
        } catch {
          aioLogger.warn('Bad cache payload for taxonomy', cacheKey);
        }
      }

      const url = new URL(`${baseUrl}/getTaxonomy`);
      url.searchParams.set('uri', uuid);
      url.searchParams.set('lang', iaLang);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });
        if (!response.ok) {
          aioLogger.warn(
            `getTaxonomy HTTP ${response.status} for uuid=${uuid} lang=${iaLang}`,
          );
          return null;
        }

        const body = await response.json();
        if (
          body?.success !== true ||
          !Array.isArray(body.data) ||
          body.data.length < 1
        ) {
          return null;
        }

        const displayLabel = body.data[0]?.displayLabel;
        if (!displayLabel) return null;

        await state.put(cacheKey, JSON.stringify(displayLabel), {
          ttl: CACHE_TTL_SEC,
        });

        return displayLabel;
      } catch (e) {
        aioLogger.error('getTaxonomy request failed', e);
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
