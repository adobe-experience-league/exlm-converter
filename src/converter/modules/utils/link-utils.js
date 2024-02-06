import { removeExtension } from './path-utils.js';
import { getMatchLanguage } from './language-utils.js';

/**
 * Checks if a URL is an absolute URL.
 *
 * @param {string} url - The URL to be checked.
 * @returns {boolean} Returns true if the URL is an absolute URL, false otherwise.
 */
export function isAbsoluteURL(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Removes the ".html" extension from the last segment of a URL's path.
 *
 * @param {string} inputURL - The input URL that you want to modify.
 * @returns {string} The modified URL with the ".html" extension removed from the last path segment.
 */
function removeHtmlExtensionFromURL(inputURL) {
  const url = new URL(inputURL);
  const pathSegments = url.pathname.split('/');

  pathSegments[pathSegments.length - 1] = pathSegments[
    pathSegments.length - 1
  ].replace(/\.html$/, '');
  url.pathname = pathSegments.join('/');

  return url.toString();
}

/**
 * Converts an absolute URL to a relative URL within the context of a base URL.
 *
 * @param {string} url - The absolute URL to be converted.
 * @param {string} baseUrl - The base URL used as a reference for creating a relative URL.
 * @returns {string} Returns the relative URL.
 */
function absoluteToRelative(url, baseUrl) {
  const absolute = new URL(url);
  const base = new URL(baseUrl);

  if (absolute.origin !== base.origin) return url;

  const urlWithoutExtension = removeHtmlExtensionFromURL(url);
  const relativeUrl = urlWithoutExtension.split(baseUrl).pop();
  return relativeUrl;
}

export function rewriteDocsPath(docsPath) {
  if (!docsPath.startsWith('/docs')) {
    return docsPath; // not a docs path, return as is
  }
  const TEMP_BASE = 'https://localhost';
  const url = new URL(docsPath, TEMP_BASE);
  const lang = url.searchParams.get('lang') || 'en'; // en is default
  url.searchParams.delete('lang');
  const rewriteLang = getMatchLanguage(lang) || lang.split('-')[0];
  let pathname = `${rewriteLang.toLowerCase()}${url.pathname}`;
  const extRegex = /\.[0-9a-z]+$/i; // Regular expression to match file extensions

  if (extRegex.test(pathname)) {
    pathname = removeExtension(pathname); // new URLs are extensionless
  }
  url.pathname = pathname;
  // return full path without origin
  return url.toString().replace(TEMP_BASE, '');
}

/**
 * Handles converting absolute URLs to relative URLs for links and images within a document.
 *
 * @param {Document} document - The HTML document to process.
 */
export default function handleUrls(document, reqLang) {
  const elements = document.querySelectorAll('a');
  if (!elements) return;

  const baseUrl = 'https://experienceleague.adobe.com';
  elements.forEach((el) => {
    let rewritePath = el.getAttribute('href');
    if (
      rewritePath !== null &&
      rewritePath.indexOf('#') !== -1 &&
      rewritePath.indexOf('#_blank') === -1
    )
      return;

    if (isAbsoluteURL(rewritePath)) {
      rewritePath = absoluteToRelative(rewritePath, baseUrl);

      // rewrite docs path to fix language path
      rewritePath = rewriteDocsPath(rewritePath);

      el.href = rewritePath;
    } else {
      // eslint-disable-next-line no-lonely-if
      if (rewritePath !== null && !rewritePath.startsWith('/docs')) {
        const TEMP_BASE = 'https://localhost';
        const url = new URL(rewritePath, TEMP_BASE);
        let pathname = `/${reqLang.toLowerCase()}/docs${url.pathname}`;
        pathname = removeExtension(pathname);
        url.pathname = pathname;
        // return full path without origin
        el.href = url.toString().replace(TEMP_BASE, '');
      }
    }
  });
}

/**
 * Converts an relative path to an absolute URL within the context of a base URL.
 *
 * @param {string} path - Path to be appended.
 * @param {string} baseUrl - The base URL to prepend the path to.
 * @returns {string} Returns the absolute URL.
 */
export function relativeToAbsolute(path, baseUrl) {
  return new URL(path, baseUrl).href;
}
