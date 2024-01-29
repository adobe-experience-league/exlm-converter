import { toBlock } from '../utils/dom-utils.js';

export default function createBackToBrowsing(document) {
  const headerElement = document.querySelector('h1');
  const metaDivTag = document.createElement('div');

  const anchorTag = document.createElement('a');
  anchorTag.setAttribute('href', '#');
  metaDivTag.append(anchorTag);

  const cells = [[metaDivTag]];
  const block = toBlock('back-to-browsing', cells, document);

  headerElement.parentNode.insertBefore(block, headerElement);
}
