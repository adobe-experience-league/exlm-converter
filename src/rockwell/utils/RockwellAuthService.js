import Logger from '@adobe/aio-lib-core-logging';

export const aioLogger = Logger('RockWellAuthService');

const TOKEN_PATH = '/access_token';

export class RockWellAuthService {
  constructor(
    {
      origin = 'https://certification-api.rockinfo.com', // update the default url with stage
      clientId,
      clientSecret,
      grantType = 'client_credentials',
    },
    store = '',
  ) {
    this.store = store;
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
    aioLogger.debug(`Fetching access token from Rockwell: ${url}`);

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  }

  async getAccessToken() {
    try {
      const response = await this.fetchAuth();

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`HTTP error: ${response.status}, ${errorMsg}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      aioLogger.error(`Error getting access token: ${error.message}`);
      throw error;
    }
  }
}

export const getDefaultRockwellService = (opts) =>
  new RockWellAuthService(opts);
