import { toBlock } from '../utils/dom-utils.js';

export default function createSlidesBlock(document) {
  const slides = document.querySelector('.slides');
  if (!slides) return;

  const rows = Array.from(slides.children).map((child) => [
    child.cloneNode(true),
  ]);

  const block = toBlock('slides', rows, document);

  const parent = slides.parentNode;
  if (parent) parent.replaceChild(block, slides);
}
