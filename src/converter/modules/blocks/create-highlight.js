import {
  getAllDecendantTextNodes,
  replaceElement,
} from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 * @param {Node} node
 */
const toHighlightedEl = (document, textNode) => {
  const em = document.createElement('em');
  const u = document.createElement('u');
  em.appendChild(u);
  u.innerHTML = textNode.textContent;
  return em;
};

export default function createHighlight(document) {
  [...document.querySelectorAll('.preview')].forEach((previewEl) => {
    getAllDecendantTextNodes(document, previewEl).forEach((textNode) => {
      const highlightEl = toHighlightedEl(document, textNode);
      replaceElement(textNode, toHighlightedEl(document, highlightEl));
    });
  });
}
