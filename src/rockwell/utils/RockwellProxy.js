import Logger from '@adobe/aio-lib-core-logging';
import { getDefaultRockwellService } from './RockwellAuthService.js';
import { sendError } from '../../common/utils/response-utils.js';

export const aioLogger = Logger('RockwellProxy');

const ALLOWED_PATHS = ['/certifications'];

const DEFAULT_HEADERS = {
  'Cache-Control': 'no-store', // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#no-store
};

const sendErrorWithDefaultHeaders = (code, message) =>
  sendError(code, message, DEFAULT_HEADERS);

export class RockwellProxy {
  constructor(config) {
    this.config = config;
    this.rockwellService = getDefaultRockwellService(config);
  }

  static canHandle(path) {
    return ALLOWED_PATHS.includes(path);
  }

  async fetchRockwell({ path, params, headers }) {
    const queryParams = Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const query = queryParams ? `?${queryParams}` : '';
    const pathWithQuery = [path, query].filter(Boolean).join('');
    const rockwellUrl = `${this.config.origin}${pathWithQuery}`;
    return fetch(rockwellUrl, {
      headers,
    });
  }

  async proxyPath({ path, params }, retryCount = 0, forceRefresh = false) {
    try {
      const MAX_HITS = 5;
      const tokenResponse =
        await this.rockwellService.getAccessToken(forceRefresh);
      const headers = {
        Authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`,
      };
      const response = await this.fetchRockwell({
        path,
        params,
        headers,
      });

      if (response.status === 401 && retryCount < MAX_HITS) {
        aioLogger.debug('Access token expired, fetching new one...');
        return this.proxyPath({ path, params }, retryCount + 1, true);
      }

      if (!response.ok) {
        const responseText = await response.text();
        aioLogger.error(
          `Error fetching rockwell url: ${response.url} with status: ${response.status} and full response: \n ${responseText}`,
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
export const getDefaultRockwellProxy = (opts) => {
  defaultRockwellProxy = defaultRockwellProxy || new RockwellProxy(opts);
  return defaultRockwellProxy;
};
