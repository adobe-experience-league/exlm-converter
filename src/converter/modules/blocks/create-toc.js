import { toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createTOC(document, data) {
  // assume that it's the second div in the main section, always.
  const tocSection = document.querySelector('main > div:nth-last-child(2)');
  const fragment = document.createElement('div');
  if (data.toc) {
    fragment.innerHTML = data.toc;
  }

  const cells = [[[fragment]]];
  const block = toBlock(`toc`, cells, document);
  tocSection.appendChild(block);
}
