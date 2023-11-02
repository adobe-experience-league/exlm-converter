import isAbsoluteURL from '../utils/link-utils.js';
import mapOutbound from './mapping.js';

function rewriteUrl(document, selector, attribute, pathsCgf) {
  const elements = document.querySelectorAll(selector);
  if (!elements) return;

  elements.forEach((el) => {
    const url = el.getAttribute(attribute);

    if (!isAbsoluteURL(url)) {
      // Apply mapping based on paths.yaml
      el[attribute] = mapOutbound(url, pathsCgf);
    }
  });
}

export default function rewriteUrls(document, pathsCgf) {
  rewriteUrl(document, 'a', 'href', pathsCgf);
  rewriteUrl(document, 'img', 'src', pathsCgf);
}
