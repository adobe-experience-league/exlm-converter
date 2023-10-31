import { replaceElement, toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createAccordion(document) {
  Array.from(document.querySelectorAll('details')).forEach(
    (detailsElement) => {
      const cells = [];
      const children = Array.from(detailsElement.childNodes);
      children.forEach((childElement) => {
        if (typeof childElement.innerHTML !== 'undefined') {
          // remove <span> element from <span class="details-marker">&nbsp;</span> accordion summary text
          const markerSpanElement = childElement.getElementsByClassName("details-marker")[0];
          if (markerSpanElement !== undefined && markerSpanElement !== null) {
            markerSpanElement.remove();
          }
          cells.push([childElement.innerHTML]);
          console.log(childElement.innerHTML);
        }
      });
      replaceElement(
        detailsElement,
        toBlock('accordion', cells, document),
      );
    },
  );
}
