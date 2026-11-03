import Logger from '@adobe/aio-lib-core-logging';
import { GainsightOAuth2TokenStore } from './GainsightOAuth2TokenStore.js';

export const aioLogger = Logger('GainsightOAuth2Service');

const OAUTH2_TOKEN_PATH = '/oauth2/token';

export class GainsightOAuth2Service {
  constructor(
    {
      apiUrl = 'https://api2-us-west-2.insided.com',
      clientId,
      clientSecret,
      scope = 'read',
      storeName = 'gainsight-oauth2',
    },
    store = new GainsightOAuth2TokenStore(storeName),
  ) {
    this.store = store;
    this.config = {
      apiUrl,
      clientId,
      clientSecret,
      scope,
    };
  }

  /**
   * @param {boolean} forceRefresh
   * @returns {Promise<string>} access token
   */
  async getAccessToken(forceRefresh = false) {
    // get cached token
    if (!forceRefresh) {
      const existingToken = await this.store.getToken();
      if (existingToken !== undefined) {
        aioLogger.debug(
          'A locally stored OAuth2 token was found and is still valid. Using it.',
        );
        return existingToken.access_token;
      }
      // no cached token found
      aioLogger.debug(
        'No stored OAuth2 token was found or it has expired. Getting a new one.',
      );
    } else {
      aioLogger.debug('Forcing refresh of OAuth2 token from Gainsight.');
    }

    let response;
    let accessToken = '';
    let responseText;
    try {
      response = await this.fetchOAuth2Token();
      if (response.ok) {
        const data = await response.json();
        aioLogger.debug(
          'OAuth2 token successfully retrieved from Gainsight. Caching it for later use.',
        );
        try {
          await this.store.setToken(data);
        } catch (storeErr) {
          aioLogger.warn('Failed to cache token:', storeErr.message);
        }
        accessToken = data.access_token;
      } else {
        responseText = await response.text();
        throw new Error(
          `Failed to get OAuth2 token from Gainsight, status: ${response.status}, response: ${responseText}`,
        );
      }
    } catch (err) {
      aioLogger.error(err);
      if (responseText) {
        aioLogger.error(
          'Failed to get OAuth2 token from Gainsight, response:',
          responseText,
        );
      }
    }
    return accessToken;
  }

  async fetchOAuth2Token() {
    const { apiUrl, clientId, clientSecret, scope } = this.config;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    });

    const url = `${apiUrl}${OAUTH2_TOKEN_PATH}`;
    aioLogger.debug(`Fetching OAuth2 token from Gainsight: ${url}`);

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }
}

/**
 *
 * @param {Object} opts
 * @returns {GainsightOAuth2Service}
 */
export const getDefaultGainsightOAuth2Service = (opts) =>
  new GainsightOAuth2Service(opts);
