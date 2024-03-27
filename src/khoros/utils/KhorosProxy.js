import Logger from '@adobe/aio-lib-core-logging';
import { sendError } from '../../common/utils/response-utils.js';

export const aioLogger = Logger('KhorosProxy');

const ALLOWED_PATHS = ['/plugins/custom/adobe/adobedx/profile-menu-list'];

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
  async proxyPath({ path, params = {}, additionalHeaders = {} }) {
    if (!KhorosProxy.canHandle(path)) {
      return sendError(404, 'Not Found');
    }
    try {
      const body = await this.fetchKhorosJson({
        path,
        params,
        additionalHeaders,
      });
      return {
        body,
        headers: {
          'Content-Type': 'application/json',
        },
        statusCode: 200,
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
   * @returns {Promise<Object>}
   */
  async fetchKhorosJson({ path, params = {}, additionalHeaders = {} }) {
    // build query params out of params object
    const queryParams = Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    const query = queryParams ? `?${queryParams}` : '';
    const khorosUrl = `${this.khorosOrigin}${path || ''}${query || ''}`;
    aioLogger.debug(`fetching khoros url: ${khorosUrl}`);
    const response = await fetch(khorosUrl, {
      headers: {
        'x-api-secret': this.khorosApiSecret,
        ...additionalHeaders,
      },
    });
    const json = await response.json();
    return json;
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
