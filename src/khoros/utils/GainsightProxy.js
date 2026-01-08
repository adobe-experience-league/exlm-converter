import Logger from '@adobe/aio-lib-core-logging';
import { sendError } from '../../common/utils/response-utils.js';

export const aioLogger = Logger('GainsightProxy');

const ALLOWED_PATHS = ['/profile-menu-list', '/profile-details'];

const DEFAULT_HEADERS = {
  'Cache-Control': 'no-store', // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#no-store
};

const sendErrorWithDefaultHeaders = (code, message) =>
  sendError(code, message, DEFAULT_HEADERS);

/**
 * Proxy request to Gainsight
 */
export class GainsightProxy {
  constructor({ gainsightApiUrl, gainsightCommunityUrl, oauth2Service }) {
    this.gainsightApiUrl = gainsightApiUrl;
    this.gainsightCommunityUrl = gainsightCommunityUrl;
    this.oauth2Service = oauth2Service;
  }

  static canHandle(path) {
    return ALLOWED_PATHS.includes(path);
  }

  /**
   * Helper function to mask email for logging (PII protection)
   * @param {string} email
   * @returns {string} masked email (first3***@domain)
   */
  static maskEmail(email) {
    if (!email || !email.includes('@')) return '***';
    const [localPart, domain] = email.split('@');
    const maskedLocal =
      localPart.length > 3 ? `${localPart.substring(0, 3)}***` : '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Extract profile field value from Gainsight profileFields array
   * @param {Array} profileFields
   * @param {string} fieldName
   * @returns {string}
   */
  // eslint-disable-next-line class-methods-use-this
  extractProfileField(profileFields, fieldName) {
    if (!Array.isArray(profileFields)) return '';
    const field = profileFields.find((f) => f.name === fieldName);
    return field?.NormalizedValue || '';
  }

  /**
   * Map Gainsight response to profile details format
   * @param {Object} gainsightResponse
   * @returns {Object}
   */
  mapToProfileDetails(gainsightResponse) {
    const { userid, username, profileFields = [] } = gainsightResponse;

    // Construct profile URL from username and userid (both required)
    const profileUrl =
      username && userid
        ? `${this.gainsightCommunityUrl}/members/${username}-${userid}`
        : '';

    // Extract City, Job Title, and Company from profileFields
    const location = this.extractProfileField(profileFields, 'City');
    const title = this.extractProfileField(profileFields, 'Job Title');
    const company = this.extractProfileField(profileFields, 'Company');

    return {
      data: {
        company,
        location,
        profilePageUrl: profileUrl,
        title,
        username: username || '',
      },
    };
  }

  /**
   * Map Gainsight response to profile menu list format
   * @param {Object} gainsightResponse
   * @returns {Object}
   */
  mapToProfileMenuList(gainsightResponse) {
    const { userid, username } = gainsightResponse;

    // Construct profile URL from username and userid (both required)
    const profileUrl =
      username && userid
        ? `${this.gainsightCommunityUrl}/members/${username}-${userid}`
        : '';

    // Construct private messages URL (Gainsight path: /inbox/overview)
    const messageUrl = userid
      ? `${this.gainsightCommunityUrl}/inbox/overview`
      : '';

    // Construct settings URL (Gainsight path: /settings/profile)
    const settingsUrl = userid
      ? `${this.gainsightCommunityUrl}/settings/profile`
      : '';

    // Construct subscriptions/favorites URL (Gainsight path: /favorite/overview)
    const followsUrl = userid
      ? `${this.gainsightCommunityUrl}/favorite/overview`
      : '';

    return {
      data: {
        menu: [
          {
            id: 'profile',
            url: profileUrl,
            title: 'My Community profile',
          },
          {
            id: 'message',
            url: messageUrl,
            title: 'Private messages',
          },
          {
            id: 'setting',
            url: settingsUrl,
            title: 'Account settings',
          },
          {
            id: 'follows',
            url: followsUrl,
            title: 'Subscriptions',
          },
        ],
      },
    };
  }

  /**
   * Map Gainsight response to Khoros-compatible format based on path
   * @param {Object} gainsightResponse
   * @param {string} path
   * @returns {Object}
   */
  mapGainsightToKhorosFormat(gainsightResponse, path) {
    if (path === '/profile-menu-list') {
      return this.mapToProfileMenuList(gainsightResponse);
    }
    // Default to profile details for /profile-details
    return this.mapToProfileDetails(gainsightResponse);
  }

  /**
   * proxy path request with params and auth.
   * @param {string} path
   * @param {string} userId
   * @param {Object.<string, string>} additionalHeaders
   * @returns
   */
  async proxyPath({ path, userId, additionalHeaders = {} }) {
    if (!GainsightProxy.canHandle(path)) {
      return sendErrorWithDefaultHeaders(404, 'Not Found');
    }

    if (!userId) {
      aioLogger.error('User ID is required for Gainsight user lookup');
      return sendErrorWithDefaultHeaders(
        400,
        'Bad Request: User ID is required for Gainsight platform',
      );
    }

    try {
      const response = await this.fetchGainsight({
        userId,
        additionalHeaders,
      });

      if (response.status === 404) {
        aioLogger.info(
          `User not found in Gainsight: ${GainsightProxy.maskEmail(userId)}`,
        );
        return sendErrorWithDefaultHeaders(
          404,
          'User profile not found in community platform',
        );
      }

      if (response.status === 401) {
        aioLogger.error(
          `OAuth2 authentication failed for Gainsight API: ${response.status}`,
        );
        return sendErrorWithDefaultHeaders(
          502,
          'Bad Gateway: Authentication with community platform failed',
        );
      }

      if (!response.ok) {
        const responseText = await response.text();
        aioLogger.error(
          `Error fetching Gainsight URL: ${response.url} with status: ${response.status} and response: \n ${responseText}`,
        );
        return sendErrorWithDefaultHeaders(
          502,
          'Bad Gateway: Community platform returned unexpected response code. See logs for details',
        );
      }

      const text = await response.text();
      try {
        const gainsightData = JSON.parse(text);
        const mappedBody = this.mapGainsightToKhorosFormat(gainsightData, path);

        aioLogger.debug(
          `Successfully retrieved and mapped Gainsight profile for user: ${GainsightProxy.maskEmail(
            userId,
          )}`,
        );

        return {
          body: mappedBody,
          headers: {
            'Content-Type': 'application/json',
            ...DEFAULT_HEADERS,
          },
          statusCode: 200,
        };
      } catch (e) {
        aioLogger.error(
          `Error parsing Gainsight response with body: \n ${text}`,
          e,
        );
        return sendErrorWithDefaultHeaders(
          502,
          'Bad Gateway: Community platform returned unexpected response format. See logs for details',
        );
      }
    } catch (error) {
      aioLogger.error('Internal error in GainsightProxy:', error);
      return sendErrorWithDefaultHeaders(500, 'Internal Server Error');
    }
  }

  /**
   * Fetch user data from Gainsight API
   * @param {string} userId
   * @param {Object.<string, string>} additionalHeaders
   * @returns {Promise<Response>}
   */
  async fetchGainsight({ userId, additionalHeaders = {} }) {
    try {
      // Get OAuth2 token
      const accessToken = await this.oauth2Service.getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to obtain OAuth2 access token');
      }

      // Build URL with userId
      const gainsightUrl = `${
        this.gainsightApiUrl
      }/user/oauth2_sso_id/${encodeURIComponent(userId)}`;

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...additionalHeaders,
      };

      aioLogger.debug(
        `Fetching Gainsight user data for: ${GainsightProxy.maskEmail(userId)}`,
      );

      return fetch(gainsightUrl, {
        headers,
      });
    } catch (error) {
      aioLogger.error('Error in fetchGainsight:', error);
      throw error;
    }
  }
}

let defaultGainsightProxy;
/**
 *
 * @param {Object} opts
 * @returns {GainsightProxy}
 */
export const getDefaultGainsightProxy = (opts) => {
  defaultGainsightProxy = defaultGainsightProxy || new GainsightProxy(opts);
  return defaultGainsightProxy;
};
