import { toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createDocActions(document) {
  // Target mini toc container and prepend empty placeholder for doc actions block.
  const docSection = document.querySelector('.mini-toc');
  if (docSection) {
    const docActionDivNode = document.createElement('div');
    const cells = [[[docActionDivNode]]];
    const block = toBlock('doc-actions', cells, document);
    docSection.insertBefore(block, docSection.children[0]);
  }
}
