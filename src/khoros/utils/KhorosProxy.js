import Logger from '@adobe/aio-lib-core-logging';
import { sendError } from '../../common/utils/response-utils.js';

export const aioLogger = Logger('KhorosProxy');

const ALLOWED_PATHS = ['/profile-menu-list', '/profile-details'];

/**
 * Proxy request to khoros
 */
export class KhorosProxy {
  constructor({ khorosOrigin, khorosApiSecret }) {
    this.khorosOrigin = khorosOrigin;
    this.khorosApiSecret = khorosApiSecret;
  }

  static canHandle(path) {
    return ALLOWED_PATHS.includes(path);
  }

  /**
   * proxy path request with params and auth.
   * @param {string} path
   * @param {Object.<string, string>} params
   * @returns
   */
  async proxyPath({ path, pathPrefix, params = {}, additionalHeaders = {} }) {
    if (!KhorosProxy.canHandle(path)) {
      return sendError(404, 'Not Found');
    }

    try {
      const response = await this.fetchKhoros({
        path,
        pathPrefix,
        params,
        additionalHeaders,
      });
      const body = await response.json();
      aioLogger.debug(`khoros response [${response.status}]`, body);

      return {
        body,
        headers: {
          'Content-Type': 'application/json',
        },
        statusCode: response.status,
      };
    } catch (error) {
      aioLogger.error(error);
      return sendError(500, 'Internal Server Error');
    }
  }

  /**
   *
   * @param {string} path
   * @param {Object.<string, string>} params
   * @returns {Promise<Response>}
   */
  async fetchKhoros({ path, pathPrefix, params = {}, additionalHeaders = {} }) {
    // build query params out of params object
    const queryParams = Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const query = queryParams ? `?${queryParams}` : '';
    const pathWithQuery = [pathPrefix, path, query].filter(Boolean).join('');
    const khorosUrl = `${this.khorosOrigin}${pathWithQuery}`;
    const headers = {
      'x-api-secret': this.khorosApiSecret,
      ...additionalHeaders,
    };
    // aioLogger.debug(
    //   `fetching khoros url: ${khorosUrl} with headers: ${JSON.stringify(
    //     headers,
    //     null,
    //     2,
    //   )}`,
    // );
    return fetch(khorosUrl, {
      headers,
    });
  }
}

let defaultKhorosProxy;
/**
 *
 * @param {Object} opts
 * @returns {KhorosProxy}
 */
export const getDefaultKhorosProxy = (opts) => {
  defaultKhorosProxy = defaultKhorosProxy || new KhorosProxy(opts);
  return defaultKhorosProxy;
};
