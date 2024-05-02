import jsdom from 'jsdom';
import Logger from '@adobe/aio-lib-core-logging';
import { isBinary, isHTML } from '../modules/utils/media-utils.js';
import renderAemAsset from './render-aem-asset.js';
import {
  isAbsoluteURL,
  relativeToAbsolute,
} from '../../common/utils/link-utils.js';

const aioLogger = Logger('render-aem');

/**
 * Formats aem tagpicker data
 */
function formatArticlePageMetaTags(inputString) {
  return inputString
    .replace(/exl:[^/]*\/*/g, '')
    .split(',')
    .map((part) => part.trim());
}

/**
 * Decodes base64 strings
 */
function decodeBase64(encodedString) {
  return Buffer.from(encodedString, 'base64').toString('utf-8');
}

/**
 * Fetches data from Author bio page set in page metadata
 */
async function fetchAuthorBioPage(authorBioPageURL, params) {
  try {
    // eslint-disable-next-line no-use-before-define
    return await renderAem(authorBioPageURL, params);
  } catch (error) {
    throw new Error(`Error fetching or parsing author bio page: ${error}`);
  }
}

/**
 * Transforms metadata for Article pages
 */
async function transformArticlePageMetadata(htmlString, params) {
  const dom = new jsdom.JSDOM(htmlString);
  const { document } = dom.window;

  const solutionMeta = document.querySelector(`meta[name="coveo-solution"]`);
  const roleMeta = document.querySelector(`meta[name="role"]`);
  const levelMeta = document.querySelector(`meta[name="level"]`);

  if (solutionMeta) {
    const solutions = formatArticlePageMetaTags(
      solutionMeta.getAttribute('content'),
    );

    // Decode and split each solution into parts
    const decodedSolutions = solutions.map((solution) => {
      const parts = solution.split('/');
      const decodedSolution = parts.map((part) => decodeBase64(part.trim()));
      return decodedSolution;
    });

    // Set the content attribute of solutionMeta to the decoded solutions
    solutionMeta.setAttribute(
      'content',
      decodedSolutions.map((parts) => parts[0]),
    );

    // Adding version meta tag
    decodedSolutions.forEach((parts) => {
      if (parts.length > 1) {
        const versionContent = parts[parts.length - 1];
        const versionMeta = document.createElement('meta');
        versionMeta.setAttribute('name', 'version');
        versionMeta.setAttribute('content', versionContent);
        document.head.appendChild(versionMeta);
      }
    });
  }

  if (roleMeta) {
    const roles = formatArticlePageMetaTags(roleMeta.getAttribute('content'));
    const decodedRoles = roles.map((role) => decodeBase64(role));
    roleMeta.setAttribute('content', decodedRoles);
  }

  if (levelMeta) {
    const levels = formatArticlePageMetaTags(levelMeta.getAttribute('content'));
    const decodedLevels = levels.map((level) => decodeBase64(level));
    levelMeta.setAttribute('content', decodedLevels);
  }

  // Get author details from author bio page
  const authorMeta = document.querySelector(`meta[name="author-bio-page"]`);
  if (authorMeta) {
    try {
      const authorBioPageURL = authorMeta.getAttribute('content');
      const authorBioPageData = await fetchAuthorBioPage(
        authorBioPageURL,
        params,
      );
      const authorBioDOM = new jsdom.JSDOM(authorBioPageData.body);
      const authorBioDocument = authorBioDOM.window.document;
      const authorBioDiv = authorBioDocument.querySelector('.author-bio');
      if (authorBioDiv) {
        const authorName = authorBioDiv
          .querySelector('div:nth-child(2)')
          .textContent.trim();
        const authorType = authorBioDiv
          .querySelector('div:nth-child(4)')
          .textContent.trim();
        if (authorName) {
          const authorNameMeta = document.createElement('meta');
          authorNameMeta.setAttribute('name', 'author-name');
          authorNameMeta.setAttribute('content', authorName);
          document.head.appendChild(authorNameMeta);
        }
        if (authorType) {
          const authorTypeMeta = document.createElement('meta');
          authorTypeMeta.setAttribute('name', 'author-type');
          authorTypeMeta.setAttribute('content', authorType);
          document.head.appendChild(authorTypeMeta);
        }
      }
    } catch (error) {
      console.error('Error fetching or parsing author bio page:', error);
    }
  }

  return dom.serialize();
}

/**
 * @param {string} htmlString
 */
async function transformHTML(htmlString, aemAuthorUrl, path, params) {
  // FIXME: Converting images from AEM to absolue path. Revert once product fix in place.
  const dom = new jsdom.JSDOM(htmlString);
  const { document } = dom.window;
  const images = document.querySelectorAll('img');
  images.forEach((el) => {
    const uri = el.getAttribute('src');
    if (!isAbsoluteURL(uri)) el.src = relativeToAbsolute(uri, aemAuthorUrl);
  });
  const metaTags = document.querySelectorAll('meta[name="image"]');
  metaTags.forEach((el) => {
    const uri = el.getAttribute('content');
    if (uri.startsWith('/') && !isAbsoluteURL(uri))
      el.setAttribute('content', relativeToAbsolute(uri, aemAuthorUrl));
  });

  if (path.includes('/articles/') && !path.includes('/articles/authors/')) {
    return transformArticlePageMetadata(dom.serialize(), params);
  }

  return dom.serialize();
}

function sendError(code, message) {
  return {
    statusCode: code,
    error: {
      code,
      message,
    },
  };
}

/**
 * Renders content from AEM UE pages
 */
export default async function renderAem(path, params) {
  const { aemAuthorUrl, aemOwner, aemRepo, aemBranch, authorization } = params;

  if (!authorization) {
    return sendError(401, 'Missing Authorization');
  }
  if (!aemAuthorUrl || !aemOwner || !aemRepo || !aemBranch) {
    return sendError(500, 'Missing AEM configuration');
  }

  const aemURL = `${aemAuthorUrl}/bin/franklin.delivery/${aemOwner}/${aemRepo}/${aemBranch}${path}?wcmmode=disabled`;
  const url = new URL(aemURL);

  const fetchHeaders = { 'cache-control': 'no-cache' };
  if (authorization) {
    fetchHeaders.authorization = authorization;
  }

  let resp;

  try {
    aioLogger.info('fetching AEM content', url);
    resp = await fetch(url, { headers: fetchHeaders });
  } catch (e) {
    aioLogger.error('Error fetching AEM content', e);
    return sendError(500, 'Internal Server Error');
  }

  if (!resp.ok) {
    return sendError(resp.status, 'Internal Server Error');
  }
  // note that this can contain charset, example 'text/html; charset=utf-8'
  const contentType = resp.headers.get('Content-Type');

  let body;
  let headers = { 'Content-Type': contentType };
  let statusCode = resp.status;
  if (isBinary(contentType)) {
    const { assetBody, assetHeaders, assetStatusCode } = await renderAemAsset(
      path,
      resp,
    );
    body = assetBody; // convert to base64 string, see: https://github.com/apache/openwhisk/blob/master/docs/webactions.md
    headers = { ...headers, ...assetHeaders };
    statusCode = assetStatusCode;
  } else if (isHTML(contentType)) {
    body = await transformHTML(await resp.text(), aemAuthorUrl, path, params);
    // add custom header `x-html2md-img-src` to let helix know to use authentication with images with that src domain
    headers = { ...headers, 'x-html2md-img-src': aemAuthorUrl };
  } else {
    body = await resp.text();
  }

  // passthrough the same content type from AEM.
  return { body, headers, statusCode };
}
