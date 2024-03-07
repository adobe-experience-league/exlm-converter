import { join } from 'path';
import { readFileSync } from 'fs';
import { removeExtension } from './path-utils.js';
import { getMatchLanguage } from './language-utils.js';
import { DOCPAGETYPE } from '../../doc-page-types.js';

const TEMP_BASE = 'https://localhost';
const EXPERIENCE_LEAGE_BASE = 'https://experienceleague.adobe.com';
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

export function rewriteDocsPath(docsPath, reqLang) {
  if (
    !docsPath.startsWith('/docs') ||
    isAssetPath(docsPath) ||
    isIgnoredDocsPath(docsPath)
  ) {
    return docsPath; // not a docs path or might be an asset path or ignored path.
  }

  const url = new URL(docsPath, TEMP_BASE);
  if (
    url.pathname === '/docs/home' ||
    url.pathname === '/docs/home.html' ||
    url.pathname === '/docs/home/'
  ) {
    url.pathname = '/docs';
  }

  const lang = url.searchParams.get('lang') || reqLang;
  url.searchParams.delete('lang');
  const rewriteLang = getMatchLanguage(lang) || lang.split('-')[0];
  let pathname = `${rewriteLang.toLowerCase()}${url.pathname}`;
  const extRegex = /\.[0-9a-z]+$/i; // Regular expression to match file extensions

  if (extRegex.test(pathname)) {
    pathname = removeExtension(pathname); // new URLs are extensionless
  }
  url.pathname = pathname;
  // return full path without origin
  return url.toString().toLowerCase().replace(TEMP_BASE, '');
}

const redirects = {};

const getOneToOneRedirects = (dir) => {
  if (redirects.oneToOne) return redirects.oneToOne;
  const oneToOneJsonFilePath = join(
    dir,
    'static',
    'redirects',
    'one-to-one-redirects.json',
  );
  const str = readFileSync(oneToOneJsonFilePath, 'utf8');
  redirects.oneToOne = JSON.parse(str);
  return redirects.oneToOne;
};

const getRegexRedirects = (dir) => {
  if (redirects.regex) return redirects.regex;
  const regexJsonFilePath = join(
    dir,
    'static',
    'redirects',
    'regex-redirects.json',
  );
  const str = readFileSync(regexJsonFilePath, 'utf8');
  const obj = JSON.parse(str);
  redirects.regex = Object.entries(obj).map(([key, value]) => ({
    regex: new RegExp(key),
    to: value,
  }));
  return redirects.regex;
};

/**
 * get redirect for link, if any
 * @param {string} path relative path to be redirected
 * @param {string} dir dir where the redirect json files exist
 * @returns
 */
const getRedirect = (path, dir) => {
  if (!path.startsWith('/')) return path; // not a relative path

  const oneToOneRedirects = getOneToOneRedirects(dir);
  const regexRedirects = getRegexRedirects(dir);
  const srcUrl = new URL(path, TEMP_BASE);
  const srcPath = srcUrl.pathname;

  // look in one-to-one redirects
  if (oneToOneRedirects[srcPath]) {
    // srcUrl.pathname = oneToOneRedirects[srcPath];
    const newPath = oneToOneRedirects[srcPath];
    // follow the redirects
    return getRedirect(newPath, dir);
  }
  // look in regex redirects
  for (let i = 0; i < regexRedirects.length; i += 1) {
    const redirect = regexRedirects[i];
    const matches = redirect.regex.exec(srcPath);
    redirect.regex.lastIndex = 0; // reset the regex
    if (matches && matches.length > 0) {
      const replacement = matches.length >= 1 ? matches[1] : '';
      // eslint-disable-next-line no-template-curly-in-string
      const newPath = redirect.to.replace('${path}', replacement);
      return getRedirect(newPath, dir);
    }
  }
  return srcPath;
};

/**
 * paths that are / and have a hash are converted to /home (with that hash)
 * @param {string} path
 * @returns
 */
const rewriteHomePath = (path) => {
  let isHomePath = false;
  let convertedHomePath = path;
  try {
    const url = new URL(path, TEMP_BASE);
    isHomePath = url.pathname === '/' && url.hash !== '';

    if (isHomePath) {
      url.pathname = '/home';
      convertedHomePath = url.toString().toLowerCase().replace(TEMP_BASE, '');
    }
  } catch (e) {
    // do nothing
  }
  return {
    isHomePath,
    convertedHomePath,
  };
};

/**
 * Handles converting absolute URLs to relative URLs for links and images within a document.
 *
 * @param {Document} document - The HTML document to process.
 * @param {string} reqLang - The language code for the requested language.
 * @param {string} pageType - The type of page being processed.
 */
export default function handleUrls(document, reqLang, pageType, dir) {
  const elements = document.querySelectorAll('a');
  if (!elements) return;

  elements.forEach((el) => {
    let pathToRewrite = el.getAttribute('href');

    if (pathToRewrite === null) return;

    if (pathToRewrite.startsWith('mailto:')) return;
    if (pathToRewrite.startsWith('tel:')) return;
    if (pathToRewrite.startsWith('#')) return;

    const isAbsoluteExlUrl = pathToRewrite.startsWith(EXPERIENCE_LEAGE_BASE);
    const isHttp =
      pathToRewrite.startsWith('http://') ||
      pathToRewrite.startsWith('https://');
    const isSlashUrl = pathToRewrite.startsWith('/');

    if (!isAbsoluteExlUrl && isHttp) return; // external link

    // not absolute, not slash, not starting with docs
    // it's a relative url like: <a href="dynamic-media-developer-resources.html"> or <a href="journey-optimizer.html">
    // remove extension and return
    if (!isAbsoluteExlUrl && !isSlashUrl) {
      // landing pages are an exception
      if (pageType === DOCPAGETYPE.DOC_LANDING) {
        // landing page specifically can contain solution urls that look like this: "journey-optimizer.html" we need to transform that to the proper docs path.
        if (!pathToRewrite.includes('/') && pathToRewrite.endsWith('.html')) {
          pathToRewrite = `/${reqLang.toLowerCase()}/docs/${pathToRewrite.toLowerCase()}`;
        }
      }

      // relative url that does not start withb / - remove extension if any
      el.href = removeExtension(pathToRewrite);
      return;
    }

    // if the path is absolute, convert it to a relative path
    if (isAbsoluteExlUrl) {
      pathToRewrite = pathToRewrite.replace(EXPERIENCE_LEAGE_BASE, '');
    }

    // handle home path URLs
    const { isHomePath, convertedHomePath } = rewriteHomePath(pathToRewrite);
    if (isHomePath) {
      el.href = convertedHomePath;
      return;
    }

    // handle redirects
    pathToRewrite = getRedirect(pathToRewrite, dir);
    // rewrite docs path to fix language path
    pathToRewrite = rewriteDocsPath(pathToRewrite, reqLang);

    el.href = pathToRewrite;
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
