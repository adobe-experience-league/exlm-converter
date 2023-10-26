import { toBlock } from '../utils/dom-utils.js';

// TODO - Placeholder for TOC; Added to fix the layout issue
export default function createTOC(document) {
  const contentDivNode = document.querySelector('main > div:first-child');
  const tocHeadingDivNode = document.createElement('div');
  tocHeadingDivNode.innerHTML = 'TOC Placeholder';

  const cells = [[tocHeadingDivNode]];
  const block = toBlock(`toc`, cells, document);
  contentDivNode.appendChild(block);
}
