import { toBlock } from '../utils/dom-utils.js';

export default function createCloudSolutions(document) {
  const allElements = document.querySelector('main div');

  const div = document.createElement('div');
  div.innerHTML = allElements.innerHTML;
  const cells = [[div]];
  const block = toBlock('cloud-solutions', cells, document);
  allElements.innerHTML = '';
  allElements.append(block);
}
