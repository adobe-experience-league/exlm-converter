import { toBlock } from '../utils/dom-utils.js';

export default function createSlidesBlock(document) {
  const mainContainer = document.querySelector('main > div');
  if (!mainContainer) return;

  const slidesWrapper = document.createElement('div');
  slidesWrapper.className = 'slides';

  mainContainer.innerHTML = '';
  const block = toBlock('slides', [[slidesWrapper]], document);
  mainContainer.appendChild(block);
}
