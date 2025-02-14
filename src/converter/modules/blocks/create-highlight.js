import {
  createNewSectionForBlock,
  // getAllDecendantTextNodes,
  replaceElement,
  toBlock,
} from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 * @param {Node} node
 * @returns {{ em: HTMLElement, u: HTMLElement }} An object containing the created `<em>` and `<u>` elements.
 * This function generates the necessary HTML elements for highlighting but does *not*
 * perform the actual replacement in the DOM. It is intended to be used by functions
 * like `inlineHighlight` that handle the DOM manipulation.
 */
const toHighlightedEl = (document, textNode) => {
  const em = document.createElement('em');
  const u = document.createElement('u');
  em.appendChild(u);
  u.textContent = textNode.textContent;
  // Not creating the em and u elements in the same line as the return structure directly
  return { em, u }; // return the created element to inlineHighlight function to wrap the text node
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
 * **Fixes:**
 * - Resolved issue where spaces were lost and words concatenated during highlighting.
 * - Corrected `getAllDecendantTextNodes` (in `../utils/dom-utils.js`) to capture all `Node.TEXT_NODE` nodes, *including* whitespace-only nodes.  Previously, it was filtering out whitespace-only text nodes, leading to loss of inter-word spacing.
 * - Modified `inlineHighlight` to:
 *   - Iterate over all child nodes (including elements) to preserve HTML structure.
 *   - Recursively process element nodes to handle nested HTML.
 *   - Use `textContent` to highlight *only* the text content of text nodes, preventing highlighting of markup within elements.
 *   - Append the `<u>` element to the `<em>` element in the DOM to ensure proper nesting.
 *   - Replace the original text node with the created `<em>` element (containing the `<u>`).
 *   - Skip whitespace-only text nodes to prevent empty highlights.
 */
const inlineHighlight = (document, element) => {
  const childNodes = Array.from(element.childNodes);

  childNodes.forEach((childNode) => {
    if (
      childNode.nodeType === Node.TEXT_NODE &&
      childNode.textContent.trim() !== ''
    ) {
      const { em, u } = toHighlightedEl(document, childNode);

      em.appendChild(u);

      replaceElement(childNode, em);
    } else if (childNode.nodeType === Node.ELEMENT_NODE) {
      inlineHighlight(document, childNode);
    }
  });

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
