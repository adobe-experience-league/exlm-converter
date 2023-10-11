import { replaceElement, toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createShadeBox(document) {
  Array.from(document.querySelectorAll('.sp-wrapper')).forEach(
    (shadeBoxElement) => {
      const children = Array.from(shadeBoxElement.childNodes);
      replaceElement(
        shadeBoxElement,
        toBlock('shade-box', [[children]], document),
      );
    },
  );
}
