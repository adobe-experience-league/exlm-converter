import yaml from 'js-yaml';
import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createTutorialTiles(document, meta) {
  const ullistElements = Array.from(
    document.querySelectorAll('main > div > ul'),
  );
  const fullMetadata = yaml.load(meta);
  if (fullMetadata.type === 'Documentation') {
    if (ullistElements.length) {
      ullistElements.forEach((ullistElement) => {
        const prevElement = ullistElement.previousElementSibling;
        if (
          prevElement.tagName === 'H2' &&
          prevElement.id === 'tiles-tutorials'
        ) {
          const ul = document.createElement('ul');
          ul.innerHTML = ullistElement.innerHTML;
          const cells = [[ul]];
          const block = toBlock('tutorial-tiles', cells, document);

          replaceElement(ullistElement, block);
        }
      });
    }
  }
}
