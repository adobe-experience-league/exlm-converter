import Logger from '@adobe/aio-lib-core-logging';
import { RockwellTokenResponseStore } from './RockwellTokenResponseStore.js';

/**
 * Logger instance for RockWellAuthService operations.
 */
export const aioLogger = Logger('RockWellAuthService');

/**
 * Path used to request access tokens from the authentication service.
 */
const TOKEN_PATH = '/access_token';

/**
 * RockWellAuthService class handles the retrieval and caching of access tokens
 * for Rockwell APIs, utilizing specified credentials and configuration.
 */
export class RockWellAuthService {
  /**
   * Constructs a RockWellAuthService instance with given configuration options.
   *
   * @param {Object} options - Configuration options for the service.
   * @param {string} options.origin - API origin URL, defaulting to 'https://certification-api.rockinfo.com'.
   * @param {string} options.clientId - Client ID for authentication requests.
   * @param {string} options.clientSecret - Client secret for authentication requests.
   * @param {string} [options.grantType='client_credentials'] - Grant type for the OAuth requests.
   * @param {string} [options.storeName='rockwell'] - Name for the response store instance.
   */
  constructor({
    origin = 'https://certification-api.rockinfo.com',
    clientId,
    clientSecret,
    grantType = 'client_credentials',
    storeName = 'rockwell',
  }) {
    /**
     * @property {RockwellTokenResponseStore} store - Instance to handle the storage and retrieval of token responses.
     * @property {Object} config - Configuration containing credentials and API details.
     */
    this.store = new RockwellTokenResponseStore(storeName);
    this.config = {
      origin,
      clientId,
      clientSecret,
      grantType,
    };
  }

  /**
   * Fetches an access token from the Rockwell authentication service using HTTP POST.
   *
   * @returns {Promise<Response>} - A promise resolving to the fetch response.
   */
  async fetchAuth() {
    const { origin, clientId, clientSecret, grantType } = this.config;
    const url = `${origin}${TOKEN_PATH}`;
    const params = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType,
    };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  /**
   * Retrieves the access token, either from local cache or by fetching a new one if necessary.
   *
   * @param {boolean} [forceRefresh=false] - Indicates whether to forcefully fetch a new token,
   * even if a valid one is cached.
   * @returns {Promise<Object>} - Promise resolving to the access token data.
   * @throws Will throw an error if the token retrieval or fetching fails.
   */
  async getAccessToken(forceRefresh = false) {
    if (!forceRefresh) {
      const existingResponse = await this.store.getRockwellResponse();
      if (existingResponse !== undefined) {
        aioLogger.debug(
          'A local stored access token was found and is still valid. Using it.',
        );
        return existingResponse;
      }
      aioLogger.debug(
        'No stored access token was found or it has expired. Getting a new one.',
      );
    }

    aioLogger.debug('Fetching new access token from Rockwell API...');
    try {
      const response = await this.fetchAuth();
      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`HTTP error: ${response.status}, ${errorMsg}`);
      }
      const data = await response.json();
      aioLogger.debug(
        'Access Token successfully retrieved from Rockwell. Caching it for further use.',
      );
      await this.store.setRockwellResponse(data);
      return data;
    } catch (error) {
      aioLogger.error(`Error getting access token: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Function to create a new instance of RockWellAuthService with given options.
 *
 * @param {Object} opts - Configuration options for the authentication service instance.
 * @returns {RockWellAuthService} - New instance of RockWellAuthService.
 */
export const getDefaultRockwellService = (opts) =>
  new RockWellAuthService(opts);
