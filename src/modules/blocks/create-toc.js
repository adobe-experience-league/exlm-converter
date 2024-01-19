import { toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createTOC(document, data) {
  // assume that it's the second div in the main section, always.
  const tocSection = document.querySelector('main > div:nth-child(2)');
  const fragment = document.createElement('a');
  fragment.innerHTML = 'toc';
  if (data.toc) {
    const id = data.toc;
    fragment.href = `/toc/en/toc/${id}`;
  }else{
    fragment.href = '/fragments/en/toc/toc.html';
  }
  const cells = [[[fragment]]];
  const block = toBlock(`toc`, cells, document);
  tocSection.appendChild(block);
}
