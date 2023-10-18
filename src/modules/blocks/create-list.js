import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createList(document) {
  const ollistElements = Array.from(document.querySelectorAll('ol'));
  const ullistElements = Array.from(document.querySelectorAll('ul'));
  if (ollistElements.length) {
    ollistElements.forEach((ollistElement) => {
      const ol = document.createElement('ol');
      ol.innerHTML = ollistElement.innerHTML;
      const cells = [[ol]];
      const block = toBlock('list ol', cells, document);

      replaceElement(ollistElement, block);
    });
  }

  if (ullistElements.length) {
    ullistElements.forEach((ullistElement) => {
      const ul = document.createElement('ul');
      ul.innerHTML = ullistElement.innerHTML;
      const cells = [[ul]];
      const block = toBlock('list ul', cells, document);

      replaceElement(ullistElement, block);
    });
  }
}
