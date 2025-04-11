import Logger from '@adobe/aio-lib-core-logging';
import { getDefaultRockwellService } from './RockwellAuthService.js';
import { sendError } from '../../common/utils/response-utils.js';

/**
 * Logger instance for RockwellProxy operations.
 */
export const aioLogger = Logger('RockwellProxy');

/**
 * Specifies paths allowed for proxy operations.
 * Only paths included here can be handled by the RockwellProxy.
 */
const ALLOWED_PATHS = ['/certifications'];

/**
 * Default headers to be used in HTTP requests.
 * 'Cache-Control': 'no-store' ensures responses are not cached.
 * See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#no-store
 */
const DEFAULT_HEADERS = {
  'Cache-Control': 'no-store',
};

/**
 * Utility function to send error responses with default headers.
 *
 * @param {number} code - HTTP status code for the error.
 * @param {string} message - Error message to accompany the response.
 */
const sendErrorWithDefaultHeaders = (code, message) =>
  sendError(code, message, DEFAULT_HEADERS);

/**
 * RockwellProxy class provides functionality for proxying HTTP requests
 * to Rockwell services, handling authorization, request building, and error management.
 */
export class RockwellProxy {
  /**
   * Constructs a RockwellProxy instance with specified configuration.
   *
   * @param {Object} config - Configuration options including service origin URL.
   */
  constructor(config) {
    /**
     * @property {Object} config - Proxy configuration containing service information.
     * @property {Object} rockwellService - Service instance for handling authentication and token management.
     */
    this.config = config;
    this.rockwellService = getDefaultRockwellService(config);
  }

  /**
   * Checks if a given path can be handled by the proxy.
   *
   * @param {string} path - The path to verify.
   * @returns {boolean} - True if the path is allowed, false otherwise.
   */
  static canHandle(path) {
    return ALLOWED_PATHS.includes(path);
  }

  /**
   * Performs HTTP GET requests to Rockwell service with specified path, query parameters, and headers.
   *
   * @param {Object} options - Options for the request.
   * @param {string} options.path - Path for the request.
   * @param {Object} options.params - Query parameters for the request.
   * @param {Object} options.headers - Headers for the request.
   * @returns {Promise<Response>} - Promise resolving to the fetch response.
   */
  async fetchRockwell({ path, params, headers }) {
    const queryParams = Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    const query = queryParams ? `?${queryParams}` : '';
    const pathWithQuery = [path, query].filter(Boolean).join('');
    const rockwellUrl = `${this.config.origin}${pathWithQuery}`;
    return fetch(rockwellUrl, { headers });
  }

  /**
   * Proxies a request to Rockwell service, retrying once if authorization fails.
   * Manages access tokens, handles errors, and sends proxied requests.
   *
   * @param {Object} options - Options for proxy path requests.
   * @param {string} options.path - Path for the proxy request.
   * @param {Object} options.params - Query parameters for the proxy request.
   * @param {number} [retryCount=0] - Number of retry attempts, defaults to 0.
   * @param {boolean} [forceRefresh=false] - Option to force token refresh, defaults to false.
   * @returns {Promise<Object>} - Response object or error message.
   */
  async proxyPath({ path, params }, retryCount = 0, forceRefresh = false) {
    const MAX_HITS = 1;
    try {
      const tokenResponse =
        await this.rockwellService.getAccessToken(forceRefresh);
      const headers = {
        Authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`,
      };
      const response = await this.fetchRockwell({ path, params, headers });

      if (response.status === 401 && retryCount < MAX_HITS) {
        aioLogger.debug('Access token expired, fetching new one...');
        return this.proxyPath({ path, params }, retryCount + 1, true); // Retry with token refresh
      }

      if (!response.ok) {
        const responseText = await response.text();
        aioLogger.error(
          `Error fetching Rockwell URL: ${response.url} with status: ${response.status} and full response: \n ${responseText}`,
        );
        return sendErrorWithDefaultHeaders(
          response.status,
          'Bad Gateway, proxied service return unexpected response code. See logs for details',
        );
      }

      const body = await response.json();
      return {
        body,
        headers: {
          'Content-Type': 'application/json',
          ...DEFAULT_HEADERS,
        },
        statusCode: response.status,
      };
    } catch (error) {
      aioLogger.error('Error in fetchRockwellData:', error);
      return sendErrorWithDefaultHeaders(500, 'Internal Server Error');
    }
  }
}

let defaultRockwellProxy;

/**
 * Singleton accessor for a default RockwellProxy instance.
 *
 * @param {Object} opts - Optional configuration options for the proxy instance.
 * @returns {RockwellProxy} - Returns the default RockwellProxy instance.
 */
export const getDefaultRockwellProxy = (opts) => {
  defaultRockwellProxy = defaultRockwellProxy || new RockwellProxy(opts);
  return defaultRockwellProxy;
};
