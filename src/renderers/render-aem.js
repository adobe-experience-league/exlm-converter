import jsdom from 'jsdom';
import {
  isAbsoluteURL,
  relativeToAbsolute,
} from '../modules/utils/link-utils.js';
import { isBinary, isHTML } from '../modules/utils/media-utils.js';

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

/**
 * @param {ArrayBuffer} arrayBuffer
 */
function toBase64String(arrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

/**
 * Renders content from AEM UE pages
 */
export default async function renderAem(path, params) {
  const { aemAuthorUrl, aemOwner, aemRepo, aemBranch, authorization } = params;

  const aemURL = `${aemAuthorUrl}/bin/franklin.delivery/${aemOwner}/${aemRepo}/${aemBranch}${path}?wcmmode=disabled`;
  const url = new URL(aemURL);

  const fetchHeaders = { 'cache-control': 'no-cache' };
  if (authorization) {
    fetchHeaders.authorization = authorization;
  }

  const resp = await fetch(url, { headers: fetchHeaders });

  if (!resp.ok) {
    return { error: { code: resp.status, message: resp.statusText } };
  }

  // note that this can contain charset, example 'text/html; charset=utf-8'
  const contentType = resp.headers.get('Content-Type');

  let body;
  if (isBinary(contentType)) {
    body = toBase64String(await resp.arrayBuffer()); // convert to base64 string, see: https://github.com/apache/openwhisk/blob/master/docs/webactions.md
  } else if (isHTML(contentType)) {
    body = transformHTML(await resp.text(), aemAuthorUrl);
  } else {
    body = await resp.text();
  }

  // passthrough the same content type from AEM.
  return { body, headers: { 'Content-Type': contentType } };
}
