import { replaceElement, toBlock } from '../utils/dom-utils.js';

export default function createSlideEmbed(document) {
  const slideElements = Array.from(
    document.getElementsByClassName('extension slide'),
  );

  slideElements.forEach((slideEl) => {
    const [, slidePathDiv] = Array.from(slideEl.children);
    const a = document.createElement('a');
    const path = slidePathDiv?.textContent?.trim();
    a.href = path;
    a.innerHTML = path;
    replaceElement(slideEl, toBlock('fragment', [[a]], document));
  });
}
