import yaml from 'js-yaml';
import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createTutorialsList(document, meta) {
  const ullistElements = Array.from(
    document.querySelectorAll('main > div > ul'),
  );
  const fullMetadata = yaml.load(meta);
  if (fullMetadata.type === 'Tutorial') {
    if (ullistElements.length) {
      ullistElements.forEach((ullistElement) => {
        const h2 = ullistElement.previousElementSibling;
        if (h2.tagName === 'H2') {
          const ul = document.createElement('ul');
          ul.innerHTML = ullistElement.innerHTML;
          const cells = [[ul]];
          const block = toBlock('tutorials-list', cells, document);

          replaceElement(ullistElement, block);
        }
      });
    }
  }
}
