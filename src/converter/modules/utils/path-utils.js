// eslint-disable-next-line import/prefer-default-export
/**
 * add extension to path if not present
 * @param {string} path
 * @param {string} extension
 * @returns
 */
export const addExtension = (path, extension) => {
  if (!path.includes('.html') || !path.includes('.md')) {
    return `${path}${extension}`;
  }
  return path;
};

/**
 * Remove extension from path
 * @param {str} path
 * @returns
 */
export const removeExtension = (pathStr) => {
  const parts = pathStr.split('.');
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join('.');
};
