import yaml from 'js-yaml';
import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createGuidesList(document, meta) {
  const ullistElements = Array.from(
    document.querySelectorAll('main > div > ul'),
  );
  const fullMetadata = yaml.load(meta);
  if (fullMetadata.type === 'Documentation') {
    if (ullistElements.length) {
      ullistElements.forEach((ullistElement) => {
        const h2 = ullistElement.previousElementSibling;
        if (
          h2.tagName === 'H2' &&
          (h2.id === 'lists-documentation' || h2.id === 'guides')
        ) {
          const ul = document.createElement('ul');
          ul.innerHTML = ullistElement.innerHTML;
          const cells = [[ul]];
          const block = toBlock('guides-list', cells, document);

          replaceElement(ullistElement, block);
        }
      });
    }
  }
}
