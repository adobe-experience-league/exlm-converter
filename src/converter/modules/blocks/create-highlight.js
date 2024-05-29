import {
  createNewSectionForBlock,
  getAllDecendantTextNodes,
  replaceElement,
  toBlock,
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

/**
 * @param  {Document} document
 * @param  {Element} element
 */
const isSectionChild = (element) =>
  element?.parentElement?.parentElement?.tagName?.toLowerCase() === 'main';

/**
 * @param {Document} document
 * @param {Element} element
 */
const createHighlightSectionForElement = (document, element) => {
  const shadeBoxSection = createNewSectionForBlock(document, element);

  shadeBoxSection.append(...element.children);
  shadeBoxSection.append(
    toBlock('section-metadata', [['style', 'highlighted']], document),
  );
  element.remove();
};

/**
 * @param {Document} document
 * @param {Element} element
 */
const inlineHighlight = (document, element) => {
  getAllDecendantTextNodes(document, element).forEach((textNode) => {
    const highlightEl = toHighlightedEl(document, textNode);
    replaceElement(textNode, toHighlightedEl(document, highlightEl));
  });
  // move all the children of the preview element to the parent
  // and then remove the preview element
  while (element.firstChild) {
    element.parentNode.insertBefore(element.firstChild, element);
  }
  element.remove();
};

export default function createHighlight(document) {
  [...document.querySelectorAll('.preview')].forEach((previewEl) => {
    if (isSectionChild(previewEl)) {
      // highlighted section
      createHighlightSectionForElement(document, previewEl);
    } else {
      // inlined highlight
      inlineHighlight(document, previewEl);
    }
  });
}
