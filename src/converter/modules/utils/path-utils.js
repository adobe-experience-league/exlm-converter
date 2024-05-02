// eslint-disable-next-line import/prefer-default-export

import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('path-util');

const TEMP_BASE = 'https://localhost';
/**
 * add extension to path if not present
 * @param {string} path
 * @param {string} extension
 * @returns
 */
export const addExtension = (path, extension) => {
  const extensionRegex = /\.[0-9a-z]+$/i; // Regular expression to match file extensions

  if (!extensionRegex.test(path)) {
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
  try {
    const url = new URL(pathStr, TEMP_BASE);
    const { pathname } = url;
    const parts = pathname.split('.');
    if (parts.length === 1) return parts[0];
    url.pathname = parts.slice(0, -1).join('.');
    return url.toString().replace(TEMP_BASE, ''); // preserve hash and search
  } catch (e) {
    aioLogger.warn(`Error removing extension from path: ${pathStr}`, e);
    return pathStr;
  }
};
