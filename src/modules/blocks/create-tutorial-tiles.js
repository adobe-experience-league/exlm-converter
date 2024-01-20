import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createTutorialTiles(document) {
  const ullistElement = document.querySelector('main > div > ul');

  if (ullistElement) {
    const ul = document.createElement('ul');
    ul.innerHTML = ullistElement.innerHTML;
    const cells = [[ul]];
    const block = toBlock('tutorial-tiles', cells, document);

    replaceElement(ullistElement, block);
  }
}
