import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createRelatedResources(document) {
  const ullistElements = Array.from(
    document.querySelectorAll('main > div > ul'),
  );

  if (ullistElements.length) {
    ullistElements.forEach((ullistElement) => {
      const ul = document.createElement('ul');
      ul.innerHTML = ullistElement.innerHTML;
      const cells = [[ul]];
      const block = toBlock('related-resources', cells, document);

      replaceElement(ullistElement, block);
    });
  }
}
