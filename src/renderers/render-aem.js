import jsdom from 'jsdom';
import {
  isAbsoluteURL,
  relativeToAbsolute,
} from '../modules/utils/link-utils.js';
import isBinary from '../modules/utils/media-utils.js';

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

  let contentType = resp.headers.get('content-type') || 'text/html';
  [contentType] = contentType.split(';');

  const respHeaders = {
    'content-type': contentType,
  };

  if (isBinary(contentType)) {
    const data = Buffer.from(await resp.arrayBuffer());
    return { data, respHeaders };
  }

  const html = await resp.text();

  // FIXME: Converting images from AEM to absolue path. Revert once product fix in place.
  const dom = new jsdom.JSDOM(html);
  const { document } = dom.window;
  const elements = document.querySelectorAll('img');
  elements.forEach((el) => {
    const uri = el.getAttribute('src');
    if (!isAbsoluteURL(uri)) el.src = relativeToAbsolute(uri, aemAuthorUrl);
  });
  return { html: dom.serialize() };
}
