import { removeExtension } from './path-utils.js';
import { getMatchLanguage } from './language-utils.js';
import { DOCPAGETYPE } from '../../doc-page-types.js';

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
 * Converts an absolute URL to a relative URL within the context of a base URL.
 *
 * @param {string} url - The absolute URL to be converted.
 * @param {string} baseUrl - The base URL used as a reference for creating a relative URL.
 * @returns {string} Returns the relative URL.
 */
function absoluteToRelative(url, baseUrl) {
  const absolute = new URL(url);
  const base = new URL(baseUrl);

  // if baseUrl and provided url have different origins, return url as is.
  if (absolute.origin !== base.origin) return url;

  const relativeUrl = url.split(baseUrl).pop();
  return relativeUrl;
}

export function isAssetPath(docsPath) {
  // A docs asset is any path that has an extension, but that extension is not .html or .md
  const match = docsPath.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  if (
    match &&
    match[1] &&
    match[1].toLowerCase() !== 'html' &&
    match[1].toLowerCase() !== 'md'
  ) {
    return true;
  }
  return false;
}

const isIgnoredDocsPath = (path) =>
  ['/docs/courses/', '/docs/assets/'].some((ignoredPath) =>
    path.startsWith(ignoredPath),
  );

export function rewriteDocsPath(docsPath) {
  if (
    !docsPath.startsWith('/docs') ||
    isAssetPath(docsPath) ||
    isIgnoredDocsPath(docsPath)
  ) {
    return docsPath; // not a docs path or might be an asset path or ignored path.
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
 * @param {string} reqLang - The language code for the requested language.
 * @param {string} pageType - The type of page being processed.
 */
export default function handleUrls(document, reqLang, pageType) {
  const elements = document.querySelectorAll('a');
  if (!elements) return;

  const baseUrl = 'https://experienceleague.adobe.com';
  elements.forEach((el) => {
    const pathToRewrite = el.getAttribute('href');

    if (pathToRewrite === null) return;

    if (isAbsoluteURL(pathToRewrite)) {
      // make url relative if it is absolute AND has the same passed baseUrl (Prod EXL)
      let newPath = absoluteToRelative(pathToRewrite, baseUrl);

      if (
        pageType === DOCPAGETYPE.DOC_LANDING &&
        (newPath.startsWith(`/?`) || newPath.startsWith(`/#`))
      ) {
        // Update newPath to "/home" and append the original query string or hash
        newPath = newPath.replace(/^\/?/, '/home');
      }

      // rewrite docs path to fix language path
      newPath = rewriteDocsPath(newPath);
      el.href = newPath;
    } else if (pageType === DOCPAGETYPE.DOC_LANDING) {
      // landing page specifically can contain solution urls that look like this: "journey-optimizer.html" we need to transform that to the proper docs path.
      if (!pathToRewrite.includes('/') && pathToRewrite.endsWith('.html')) {
        const newPath = removeExtension(pathToRewrite);
        el.href = `/${reqLang.toLowerCase()}/docs/${newPath}`;
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
