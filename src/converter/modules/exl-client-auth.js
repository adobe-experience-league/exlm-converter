import { isReviewEnvironment } from '../../common/utils/environment-utils.js';
import { getDefaultImsService } from '../../khoros/utils/IMSService.js';
import { paramMemoryStore } from './utils/param-memory-store.js';

/**
 * Auth headers for EXL delivery API calls in review.
 * The review environment sits behind a Cluster Gateway that validates a
 * real IMS service token. Per Adobe IMS, a service token is obtained by
 * exchanging a pre-issued technical-account authorization code (via the
 * `authorization_code` grant), not `client_credentials`.
 *
 * @param {{ exlDeliveryApiImsOrigin: string, exlDeliveryApiClientId: string, exlDeliveryApiClientSecret: string, exlDeliveryApiClientCode: string }} config
 * @returns {Promise<Record<string, string>>}
 */
async function getExlDeliveryApiAuthHeaders({
  exlDeliveryApiImsOrigin,
  exlDeliveryApiClientId,
  exlDeliveryApiClientSecret,
  exlDeliveryApiClientCode,
}) {
  if (
    !exlDeliveryApiImsOrigin ||
    !exlDeliveryApiClientId ||
    !exlDeliveryApiClientSecret ||
    !exlDeliveryApiClientCode
  ) {
    throw new Error(
      'Missing IMS config (exlDeliveryApiImsOrigin/exlDeliveryApiClientId/exlDeliveryApiClientSecret/exlDeliveryApiClientCode): required when running in review environment',
    );
  }

  const imsService = getDefaultImsService({
    imsOrigin: exlDeliveryApiImsOrigin,
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
 * @param {{ exlDeliveryApiImsOrigin: string, exlDeliveryApiClientId: string, exlDeliveryApiClientSecret: string, exlDeliveryApiClientCode: string }} config
 * @returns {Promise<{ isReview: boolean, reviewAuthHeaders?: Record<string, string> }>}
 */
export async function buildExlClientAuthOptions(config) {
  // Check if we're in review environment AND the feature flag is enabled
  if (
    !isReviewEnvironment() ||
    !paramMemoryStore.hasFeatureFlag('enable-review-ims-auth')
  ) {
    return { isReview: false };
  }

  return {
    isReview: true,
    reviewAuthHeaders: await getExlDeliveryApiAuthHeaders(config),
  };
}
