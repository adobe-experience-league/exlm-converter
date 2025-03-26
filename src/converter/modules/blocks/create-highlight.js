import {
  createNewSectionForBlock,
  getAllDecendantTextNodes,
  replaceElement,
  toBlock,
  isInlineElement,
} from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 * @param {Node} node
 */
const toHighlightedEl = (document, textNode) => {
  const em = document.createElement('em');
  const u = document.createElement('u');
  const { textContent } = textNode;
  const prefixSpaces = (textContent.match(/^\s*/) || [''])[0];
  const suffixSpaces = (textContent.match(/\s*$/) || [''])[0];
  u.innerHTML = textContent.trim();
  em.appendChild(document.createTextNode(prefixSpaces));
  em.appendChild(u);
  em.appendChild(document.createTextNode(suffixSpaces));
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
  // if element has all inline decendants, wrap it in an em and u tag to highlight it.
  const allDecendantsAreInline = Array.from(
    element.querySelectorAll('*'),
  ).every(isInlineElement);
  if (allDecendantsAreInline) {
    element.outerHTML = `<em><u>${element.innerHTML}</u></em>`;
  } else {
    // if element has any non-inline decendants, highlight the text nodes one by one
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
  }
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
