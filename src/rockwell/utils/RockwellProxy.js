import Logger from '@adobe/aio-lib-core-logging';
import { sendError } from '../../common/utils/response-utils.js';

export const aioLogger = Logger('RockwellProxy');

const ALLOWED_PATHS = ['/certifications', '/courses'];

const DEFAULT_HEADERS = {
  'Cache-Control': 'no-store', // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#no-store
};

const sendErrorWithDefaultHeaders = (code, message) =>
  sendError(code, message, DEFAULT_HEADERS);

export class RockwellProxy {
  constructor({ rockwellOrigin }) {
    this.rockwellOrigin = rockwellOrigin;
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
    const rockwellUrl = `${this.rockwellOrigin}${pathWithQuery}`;
    return fetch(rockwellUrl, {
      headers,
    });
  }

  async proxyPath({ path, params, headers }) {
    try {
      const response = await this.fetchRockwell({
        path,
        params,
        headers,
      });
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
