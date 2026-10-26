/**
 * Determine if the converter is running in the review environment.
 * Uses Adobe I/O Runtime namespace when deployed; EXL_ENV is for local dev only.
 *
 * @returns {boolean}
 */
export function isReviewEnvironment() {
  // eslint-disable-next-line no-underscore-dangle
  const namespace = process.env.__OW_NAMESPACE || '';
  if (namespace) {
    return namespace.endsWith('-review');
  }

  // Local dev only (no Runtime namespace present)
  return process.env.EXL_ENV === 'review';
}
