import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createDefaultList(document) {
  const ullistElements = Array.from(
    document.querySelectorAll('main > div > ul'),
  );
  if (ullistElements.length) {
    ullistElements.forEach((ullistElement) => {
      const h2 = ullistElement.previousElementSibling;
      if (h2.tagName !== 'H2') {
        const ul = document.createElement('ul');
        ul.innerHTML = ullistElement.innerHTML;
        const cells = [[ul]];
        const block = toBlock('default-list', cells, document);

        replaceElement(ullistElement, block);
      }
    });
  }
}
