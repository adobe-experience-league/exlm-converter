import fetch from 'node-fetch';
import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('FranklinServletClient');

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
}

export default FranklinServletClient;
