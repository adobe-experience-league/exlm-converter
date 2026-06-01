import fetch from 'node-fetch';
import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('FranklinServletClient');

// Cache for jcr:content.json with 24-hour TTL
const jsonCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get cached data if valid
 * @param {string} key - Cache key
 * @returns {Object|null} Cached data or null if expired/not found
 */
function getCachedData(key) {
  const cached = jsonCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    // Cache expired, remove it
    jsonCache.delete(key);
    return null;
  }

  aioLogger.debug(`Cache hit for ${key}`);
  return cached.data;
}

/**
 * Store data in cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 */
function setCachedData(key, data) {
  jsonCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  aioLogger.debug(`Cached data for ${key}`);
}

/**
 * @typedef {Object} FranklinServletClientConfig
 * @property {string} aemAuthorUrl
 * @property {string} aemOwner
 * @property {string} aemRepo
 * @property {string} aemBranch
 * @property {string} authorization
 */

class FranklinServletClient {
  /** @type {FranklinServletClientConfig} */
  config = {};

  /**
   * @param {FranklinServletClientConfig} config
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * fetch from AEM servlet
   * @param {string} path
   * @param {string|undefined}} sourceLocation
   * @returns
   */
  async fetchFromServlet(path, sourceLocation) {
    const { aemAuthorUrl, aemOwner, aemRepo, aemBranch, authorization } =
      this.config;
    const aemURL = `${aemAuthorUrl}/bin/franklin.delivery/${aemOwner}/${aemRepo}/${aemBranch}${path}?wcmmode=disabled`;
    const url = new URL(aemURL);
    const headers = { 'cache-control': 'no-cache' };
    if (authorization) headers.authorization = authorization;
    if (sourceLocation) headers['x-content-source-location'] = sourceLocation;
    aioLogger.info('fetching AEM content', url);
    return fetch(url, { headers });
  }

  /**
   * Fetch jcr:content.json from AEM with 24-hour caching
   * @param {string} path - The content path
   * @returns {Promise<Object|null>} The parsed JSON or null if fetch fails
   */
  async fetchPageJcrJson(path) {
    const { aemAuthorUrl } = this.config;
    const cacheKey = `${path}/jcr:content.json`;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }

    // Cache miss or expired, fetch from AEM
    const { authorization } = this.config;
    // Example: https://author-p122525-e1200861.adobeaemcloud.com/content/exlm/global/de/browse/jcr:content.json
    const jsonUrl = `${aemAuthorUrl}/content/exlm/global/${path}/jcr:content.json`;
    const headers = { 'cache-control': 'no-cache' };
    if (authorization) headers.authorization = authorization;

    try {
      aioLogger.info('fetching jcr:content.json', jsonUrl);
      const response = await fetch(jsonUrl, { headers });

      if (!response.ok) {
        aioLogger.warn(`Failed to fetch jcr:content.json: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Store in cache for 24 hours
      setCachedData(cacheKey, data);

      return data;
    } catch (error) {
      aioLogger.error('Error fetching jcr:content.json', error);
      return null;
    }
  }
}

export default FranklinServletClient;
