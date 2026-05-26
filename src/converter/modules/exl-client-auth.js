import { isReviewEnvironment } from '../../common/utils/environment-utils.js';

/**
 * Auth headers for EXL delivery API calls in review.
 * Uses a pre-computed secret stored in GitHub secrets.
 *
 * @param {string} secret
 * @returns {Record<string, string>}
 */
function getExlDeliveryApiAuthHeaders(secret) {
  if (!secret) {
    throw new Error(
      'Missing EXL delivery API secret: required when running in review environment',
    );
  }

  return {
    Authorization: `Bearer ${secret}`,
  };
}

/**
 * Client options for EXL API clients. Environment is resolved once at construction.
 *
 * @param {string} [exlDeliveryApiSecret]
 * @returns {{ isReview: boolean, reviewAuthHeaders?: Record<string, string> }}
 */
export function buildExlClientAuthOptions(exlDeliveryApiSecret) {
  if (!isReviewEnvironment()) {
    return { isReview: false };
  }

  return {
    isReview: true,
    reviewAuthHeaders: getExlDeliveryApiAuthHeaders(exlDeliveryApiSecret),
  };
}
