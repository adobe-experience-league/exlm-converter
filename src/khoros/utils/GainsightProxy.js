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
  constructor({ gainsightApiUrl, oauth2Service }) {
    this.gainsightApiUrl = gainsightApiUrl;
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
   * Map Gainsight response to Khoros-compatible format
   * @param {Object} gainsightResponse
   * @returns {Object}
   */
  mapGainsightToKhorosFormat(gainsightResponse) {
    const {
      userid,
      email,
      username,
      joindate,
      profileFields = [],
      rank,
      user_statistics: userStatistics,
      roles = [],
      sso,
    } = gainsightResponse;

    // Extract display name from profileFields
    const displayName = this.extractProfileField(profileFields, 'Full Name');
    const company = this.extractProfileField(profileFields, 'Company');

    // Construct profile URL from username
    const profileUrl = username ? `/members/${username}` : '';

    return {
      userid,
      email,
      username,
      displayName,
      company,
      profileUrl,
      joindate,
      rank: rank?.display_name || '',
      post_count: userStatistics?.post_count || 0,
      likes: userStatistics?.likes || 0,
      likes_given: userStatistics?.likes_given || 0,
      topic_count: userStatistics?.topic_count || 0,
      roles: roles.map((role) => role.auth_item?.name).filter(Boolean),
      sso_username: sso?.saml || '',
    };
  }

  /**
   * proxy path request with params and auth.
   * @param {string} path
   * @param {string} email
   * @param {Object.<string, string>} additionalHeaders
   * @returns
   */
  async proxyPath({ path, email, additionalHeaders = {} }) {
    if (!GainsightProxy.canHandle(path)) {
      return sendErrorWithDefaultHeaders(404, 'Not Found');
    }

    if (!email) {
      aioLogger.error('Email is required for Gainsight user lookup');
      return sendErrorWithDefaultHeaders(
        400,
        'Bad Request: Email is required for Gainsight platform',
      );
    }

    try {
      const response = await this.fetchGainsight({
        email,
        additionalHeaders,
      });

      if (response.status === 404) {
        aioLogger.info(
          `User not found in Gainsight: ${GainsightProxy.maskEmail(email)}`,
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
        const mappedBody = this.mapGainsightToKhorosFormat(gainsightData);

        aioLogger.debug(
          `Successfully retrieved and mapped Gainsight profile for user: ${GainsightProxy.maskEmail(
            email,
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
   * @param {string} email
   * @param {Object.<string, string>} additionalHeaders
   * @returns {Promise<Response>}
   */
  async fetchGainsight({ email, additionalHeaders = {} }) {
    try {
      // Get OAuth2 token
      const accessToken = await this.oauth2Service.getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to obtain OAuth2 access token');
      }

      // Build URL with email
      const gainsightUrl = `${
        this.gainsightApiUrl
      }/user/email/${encodeURIComponent(email)}`;

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...additionalHeaders,
      };

      aioLogger.debug(
        `Fetching Gainsight user data for: ${GainsightProxy.maskEmail(email)}`,
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
