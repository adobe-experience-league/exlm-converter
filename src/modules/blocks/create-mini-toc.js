import { toBlock } from '../utils/dom-utils.js';

export default function createMiniTOC(document) {
  // get hold of div section of content before any DOM changes; review this once template changes are in place
  const contentDivNode = document.querySelector('main > div');
  // section container div
  const sectionContainerDivNode = document.createElement('div');
  const tocHeadingDivNode = document.createElement('div');

  const cells = [[tocHeadingDivNode]];
  const block = toBlock(`mini-toc`, cells, document);
  sectionContainerDivNode.appendChild(block);

  contentDivNode.parentNode.insertBefore(sectionContainerDivNode, contentDivNode.nextSibling);
}
