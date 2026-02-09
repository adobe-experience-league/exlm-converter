import { replaceElement, toBlock } from '../utils/dom-utils.js';

export default function createUEFragmentEmbed(document) {
  // Select all anchor tags with /docs-fragments/ in href
  const fragmentLinks = Array.from(
    document.querySelectorAll('a[href*="/docs-fragments/"]'),
  );

  fragmentLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const a = document.createElement('a');
    a.href = href;
    a.textContent = href;

    replaceElement(link, toBlock('fragment', [[a]], document));
  });
}
