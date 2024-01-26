import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createGuidesList(document) {
  const ullistElement = document.querySelector('main > div > ul');

  if (ullistElement) {
    const ul = document.createElement('ul');
    ul.innerHTML = ullistElement.innerHTML;
    const cells = [[ul]];
    const block = toBlock('guides-list', cells, document);

    replaceElement(ullistElement, block);
  }
}
