import { isReviewEnvironment } from '../../common/utils/environment-utils.js';
import { getDefaultImsService } from '../../khoros/utils/IMSService.js';

/**
 * Auth headers for EXL delivery API calls in review.
 * The review environment sits behind a Cluster Gateway that validates a
 * real IMS service token. Per Adobe IMS, a service token is obtained by
 * exchanging a pre-issued technical-account authorization code (via the
 * `authorization_code` grant), not `client_credentials`.
 *
 * @param {{ imsOrigin: string, exlDeliveryApiClientId: string, exlDeliveryApiClientSecret: string, exlDeliveryApiClientCode: string }} config
 * @returns {Promise<Record<string, string>>}
 */
async function getExlDeliveryApiAuthHeaders({
  imsOrigin,
  exlDeliveryApiClientId,
  exlDeliveryApiClientSecret,
  exlDeliveryApiClientCode,
}) {
  if (
    !imsOrigin ||
    !exlDeliveryApiClientId ||
    !exlDeliveryApiClientSecret ||
    !exlDeliveryApiClientCode
  ) {
    throw new Error(
      'Missing IMS config (imsOrigin/exlDeliveryApiClientId/exlDeliveryApiClientSecret/exlDeliveryApiClientCode): required when running in review environment',
    );
  }

  const imsService = getDefaultImsService({
    imsOrigin,
    clientId: exlDeliveryApiClientId,
    clientSecret: exlDeliveryApiClientSecret,
    authorizationCode: exlDeliveryApiClientCode,
    grantType: 'authorization_code',
    storeName: 'exl-delivery-api-ims',
  });

  const accessToken = await imsService.getAccessToken();
  if (!accessToken) {
    throw new Error(
      'Failed to obtain IMS service token for EXL delivery API auth',
    );
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Client options for EXL API clients. Environment is resolved once at construction.
 *
 * @param {{ imsOrigin: string, exlDeliveryApiClientId: string, exlDeliveryApiClientSecret: string, exlDeliveryApiClientCode: string }} config
 * @returns {Promise<{ isReview: boolean, reviewAuthHeaders?: Record<string, string> }>}
 */
export async function buildExlClientAuthOptions(config) {
  if (!isReviewEnvironment()) {
    return { isReview: false };
  }

  return {
    isReview: true,
    reviewAuthHeaders: await getExlDeliveryApiAuthHeaders(config),
  };
}
