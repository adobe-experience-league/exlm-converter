import { replaceElement, toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createAccordion(document) {
  Array.from(document.querySelectorAll('details')).forEach(
    (detailsElement) => {
      const [firstEl, ...rest] = Array.from(detailsElement.children);
      firstEl.removeChild(firstEl.firstChild);
      replaceElement(
        detailsElement,
        toBlock('accordion', [[firstEl.innerHTML], rest], document),
      );
    }
  );
}
