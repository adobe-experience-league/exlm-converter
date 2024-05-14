import jsdom from 'jsdom';
import Logger from '@adobe/aio-lib-core-logging';
import { isBinary, isHTML } from '../modules/utils/media-utils.js';
import renderAemAsset from './render-aem-asset.js';
import {
  isAbsoluteURL,
  relativeToAbsolute,
} from '../../common/utils/link-utils.js';
import {
  formatArticlePageMetaTags,
  decodeBase64,
  getMetadata,
  setMetadata,
} from './utils/aem-article-page-utils.js';

export const aioLogger = Logger('render-aem');

/**
 * Fetches data from Author bio page set in page metadata
 */
async function fetchAuthorBioPageData(document, authorBioPageURL, params) {
  try {
    // eslint-disable-next-line no-use-before-define
    const authorBioPageData = await renderAem(authorBioPageURL, params);
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
        setMetadata(document, 'author-name', authorName);
      }
      if (authorType) {
        setMetadata(document, 'author-type', authorType);
      }
    }
  } catch (error) {
    console.error('Error fetching or parsing author bio page:', error);
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
  const authorMeta = document.querySelector(`meta[name="author-bio-page"]`);

  if (solutionMeta) {
    const solutions = formatArticlePageMetaTags(
      getMetadata(document, 'coveo-solution'),
    );

    // Decode and split each solution into parts
    const decodedSolutions = solutions.map((solution) => {
      const parts = solution.split('/');
      const decodedSolution = parts.map((part) => decodeBase64(part.trim()));
      return decodedSolution;
    });

    // Transform the solutions to coveo compatible format
    const transformedSolutions = decodedSolutions.map((parts) => {
      if (parts.length > 1) {
        const solution = parts[0];
        const subSolution = parts[1];
        return `${solution}|${solution} ${subSolution}`;
        // eslint-disable-next-line no-else-return
      } else {
        return parts[0];
      }
    });

    const coveoSolution = transformedSolutions.join(';');
    setMetadata(document, 'coveo-solution', coveoSolution);

    // Adding version meta tag
    decodedSolutions.forEach((parts) => {
      if (parts.length > 1) {
        const versionContent = parts[parts.length - 1];
        setMetadata(document, 'version', versionContent);
      }
    });
  }

  if (roleMeta) {
    const roles = formatArticlePageMetaTags(getMetadata(document, 'role'));
    const decodedRoles = roles.map((role) => decodeBase64(role));
    setMetadata(document, 'role', decodedRoles);
  }

  if (levelMeta) {
    const levels = formatArticlePageMetaTags(getMetadata(document, 'level'));
    const decodedLevels = levels.map((level) => decodeBase64(level));
    setMetadata(document, 'level', decodedLevels);
  }

  if (authorMeta) {
    const authorBioPageURL = getMetadata(document, 'author-bio-page');
    await fetchAuthorBioPageData(document, authorBioPageURL, params);
  }

  return dom.serialize();
}

/**
 * @param {string} htmlString
 */
function transformHTML(htmlString, aemAuthorUrl, path) {
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
  // no indexing rule for author bio pages
  if (path.includes('/articles/authors')) {
    setMetadata(document, 'robots', 'NOINDEX, NOFOLLOW, NOARCHIVE, NOSNIPPET');
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
  const { aemAuthorUrl, aemOwner, aemRepo, aemBranch, authorization, sourceLocation } = params;

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
  if (sourceLocation) {
    fetchHeaders['x-content-source-location'] = sourceLocation;
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
    body = transformHTML(await resp.text(), aemAuthorUrl, path);
    // Update page metadata for Article Pages
    if (path.includes('/articles/') && !path.includes('/articles/authors/')) {
      body = await transformArticlePageMetadata(body, params);
    }
    // add custom header `x-html2md-img-src` to let helix know to use authentication with images with that src domain
    headers = { ...headers, 'x-html2md-img-src': aemAuthorUrl };
  } else {
    body = await resp.text();
  }

  // passthrough the same content type from AEM.
  return { body, headers, statusCode };
}
