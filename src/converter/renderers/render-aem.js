import jsdom from 'jsdom';
import Logger from '@adobe/aio-lib-core-logging';
import {
  isAbsoluteURL,
  relativeToAbsolute,
} from '../modules/utils/link-utils.js';
import { isBinary, isHTML } from '../modules/utils/media-utils.js';
import renderAemAsset from './render-aem-asset.js';

export const aioLogger = Logger('render-aem');

/**
 * @param {string} htmlString
 */
function transformHTML(htmlString, aemAuthorUrl) {
  // FIXME: Converting images from AEM to absolue path. Revert once product fix in place.
  const dom = new jsdom.JSDOM(htmlString);
  const { document } = dom.window;
  const elements = document.querySelectorAll('img');
  elements.forEach((el) => {
    const uri = el.getAttribute('src');
    if (!isAbsoluteURL(uri)) el.src = relativeToAbsolute(uri, aemAuthorUrl);
  });
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
    console.log('fetching AEM content', url);
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
    body = transformHTML(await resp.text(), aemAuthorUrl);
    // add custom header `x-html2md-img-src` to let helix know to use authentication with images with that src domain
    headers = { ...headers, 'x-html2md-img-src': aemAuthorUrl };
  } else {
    body = await resp.text();
  }

  // passthrough the same content type from AEM.
  return { body, headers, statusCode };
}
