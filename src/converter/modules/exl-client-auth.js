import { isReviewEnvironment } from '../../common/utils/environment-utils.js';
import { getDefaultImsService } from '../../khoros/utils/IMSService.js';

/**
 * Auth headers for EXL delivery API calls in review.
 * The review environment sits behind a Cluster Gateway that validates a
 * real IMS service token, so we fetch one via the client_credentials grant
 * using a dedicated technical account rather than relying on a static shared secret.
 *
 * @param {{ imsOrigin: string, exlDeliveryApiClientId: string, exlDeliveryApiClientSecret: string }} config
 * @returns {Promise<Record<string, string>>}
 */
async function getExlDeliveryApiAuthHeaders({
  imsOrigin,
  exlDeliveryApiClientId,
  exlDeliveryApiClientSecret,
}) {
  if (!imsOrigin || !exlDeliveryApiClientId || !exlDeliveryApiClientSecret) {
    throw new Error(
      'Missing IMS config (imsOrigin/exlDeliveryApiClientId/exlDeliveryApiClientSecret): required when running in review environment',
    );
  }

  const imsService = getDefaultImsService({
    imsOrigin,
    clientId: exlDeliveryApiClientId,
    clientSecret: exlDeliveryApiClientSecret,
    grantType: 'client_credentials',
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
 * @param {{ imsOrigin: string, exlDeliveryApiClientId: string, exlDeliveryApiClientSecret: string }} config
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
