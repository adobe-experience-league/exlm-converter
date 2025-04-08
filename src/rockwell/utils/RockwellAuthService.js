import Logger from '@adobe/aio-lib-core-logging';
import { RockwellTokenResponseStore } from './RockwellTokenResponseStore.js';

export const aioLogger = Logger('RockWellAuthService');

const TOKEN_PATH = '/access_token';

export class RockWellAuthService {
  constructor({
    origin = 'https://certification-api.rockinfo.com', // update the default url with stage
    clientId,
    clientSecret,
    grantType = 'client_credentials',
    storeName = 'rockwell',
  }) {
    this.store = new RockwellTokenResponseStore(storeName);
    this.config = {
      origin,
      clientId,
      clientSecret,
      grantType,
    };
  }

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

  async getAccessToken(forceRefresh = false) {
    if (!forceRefresh) {
      const existingResponse = await this.store.getRockwellResponse();
      if (existingResponse !== undefined) {
        aioLogger.debug(
          'A local stored access token was found and is still valid. using it.',
        );
        return existingResponse;
      }
      aioLogger.debug(
        'No stored access token was found or it has expired. Getting a new one.',
      );
    }

    aioLogger.debug(`Fetching new access token from Rockwell API...`);

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

export const getDefaultRockwellService = (opts) =>
  new RockWellAuthService(opts);
