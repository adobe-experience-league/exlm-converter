import { toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createTOC(document) {
  // assume that it's the second div in the main section, always.
  const tocSection = document.querySelector('main > div:nth-child(2)');
  const fragment = document.createElement('a');
  fragment.href = '/fragments/en/toc/toc.html';
  fragment.innerHTML = 'toc';

  const cells = [[[fragment]]];
  const block = toBlock(`toc`, cells, document);
  tocSection.appendChild(block);
}
