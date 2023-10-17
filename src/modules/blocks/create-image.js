import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createImage(document) {
  const imageElements = Array.from(document.querySelectorAll('img'));
  if (imageElements.length) {
    imageElements.forEach((imageElement) => {
      const src = imageElement.getAttribute('src');
      const div = document.createElement('div');
      div.innerHTML = imageElement.outerHTML;
      div.append(src);
      const cells = [[div]];
      const block = toBlock('image', cells, document);

      replaceElement(imageElement, block);
    });
  }
}
