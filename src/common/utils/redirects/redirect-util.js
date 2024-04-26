import oneToOneRedirectsObject from './one-to-one-redirects.js';
import regexRedirectsObject from './regex-redirects.js';

const TEMP_BASE = 'https://localhost';

const regexRedirects = Object.entries(regexRedirectsObject).map(
  ([key, value]) => ({
    regex: new RegExp(key),
    to: value,
  }),
);

/**
 * get redirect for link, if any
 * @param {string} path relative path to be redirected
 * @returns
 */
export const getRedirect = (path) => {
  if (!path.startsWith('/')) return path; // not a relative path

  const srcUrl = new URL(path, TEMP_BASE);
  const srcPath = srcUrl.pathname;

  // look in one-to-one redirects
  if (oneToOneRedirectsObject[srcPath]) {
    // srcUrl.pathname = oneToOneRedirects[srcPath];
    const newPath = oneToOneRedirectsObject[srcPath];
    // follow the redirects
    return getRedirect(newPath);
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
      return getRedirect(newPath);
    }
  }
  srcUrl.pathname = srcPath;
  return srcUrl.toString().replace(TEMP_BASE, ''); // preserve hash and search
};
