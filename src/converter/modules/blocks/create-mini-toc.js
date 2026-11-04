import { toBlock } from '../utils/dom-utils.js';

export default function createMiniTOC(document) {
  // get hold of div section of content before any DOM changes; review this once template changes are in place
  const contentDivNode = document.querySelector('main > div:last-child');
  const tocHeadingDivNode = document.createElement('div');

  const cells = [[tocHeadingDivNode]];
  const block = toBlock(`mini-toc`, cells, document);
  contentDivNode.appendChild(block);
}
