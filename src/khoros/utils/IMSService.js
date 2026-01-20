import Logger from '@adobe/aio-lib-core-logging';
import { jwtDecode } from 'jwt-decode';
import { IMSTokenResponseStore } from './IMSTokenResponseStore.js';

export const aioLogger = Logger('IMSService');

const GET_TOKEN_PATH = '/ims/token';
const VALIDATE_TOKEN_PATH = '/ims/validate_token/v1';

export class IMSService {
  constructor(
    {
      imsOrigin = 'https://ims-na1-stg1.adobelogin.com',
      clientId,
      clientSecret,
      authorizationCode,
      grantType = 'authorization_code',
      scope = 'openid,AdobeID',
      storeName = 'ims',
    },
    store = new IMSTokenResponseStore(storeName),
  ) {
    this.store = store;
    this.config = {
      imsOrigin,
      clientId,
      clientSecret,
      authorizationCode,
      grantType,
      scope,
    };
  }

  /**
   *
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async isValidImsToken(token) {
    console.log('token', token);
    aioLogger.debug(`token`, token);
    const { imsOrigin } = this.config;
    // eslint-disable-next-line camelcase
    const { client_id, type } = jwtDecode(token);
    // eslint-disable-next-line camelcase
    const validationUrl = `${imsOrigin}${VALIDATE_TOKEN_PATH}?client_id=${client_id}&type=${type}`;
    aioLogger.debug(`validating token with url: ${validationUrl}`);
    const response = await fetch(validationUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    try {
      const json = await response.json();
      const isValid = json?.valid || false;
      aioLogger.debug(`token is ${isValid ? 'valid' : 'invalid'}`);
      return isValid;
    } catch (e) {
      aioLogger.error(e);
      return false;
    }
  }

  /**
   * @param {boolean} forceRefresh
   * @returns {Promise<string>} access token
   */
  async getAccessToken(forceRefresh = false) {
    // get cached response
    if (!forceRefresh) {
      const existingResponse = await this.store.getIMSResponse();
      if (existingResponse !== undefined) {
        aioLogger.debug(
          'An locally stored access token was found and is still valid. using it.',
        );
        return existingResponse.access_token;
      }
      // no cached response found
      aioLogger.debug(
        'No stored access token was found or it has expired. Getting a new one.',
      );
    } else {
      aioLogger.debug('Forcing refresh of access token from IMS.');
    }
    let response;
    let accessToken = '';
    try {
      response = await this.fetchIms();
      if (response.ok) {
        const data = await response.json();
        aioLogger.debug(
          'Access Token successfully retrieved from IMS. Caching it for later use.',
        );
        await this.store.setIMSResponse(data);
        accessToken = data.access_token;
      } else {
        throw new Error(
          `Failed to get access token from IMS, see response:/n ${JSON.stringify(
            await response.text(),
            null,
            2,
          )}`,
        );
      }
    } catch (err) {
      aioLogger.error(err);
      aioLogger.error(
        'Failed to get access token from IMS, response',
        // @ts-expect-error this is ok.
        await response?.text(),
      );
    }
    return accessToken;
  }

  async fetchIms() {
    const {
      imsOrigin,
      clientId,
      clientSecret,
      authorizationCode,
      grantType,
      scope,
    } = this.config;

    const params = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType,
    };

    if (grantType === 'authorization_code') {
      params.code = authorizationCode;
    }
    if (grantType === 'client_credentials') {
      params.scope = scope;
    }
    const formData = new FormData();
    // create formdata from params
    Object.entries(params).forEach(([key, value]) => {
      // aioLogger.debug(`appending ${key}: ${value} to formdata`);
      formData.append(key, value);
    });

    const url = `${imsOrigin}${GET_TOKEN_PATH}`;
    aioLogger.debug(`fetching access token from IMS:  ${url}`);

    return fetch(url, {
      method: 'POST',
      body: formData,
    });
  }
}

/**
 *
 * @param {Object} opts
 * @returns {IMSService}
 */
export const getDefaultImsService = (opts) => new IMSService(opts);
