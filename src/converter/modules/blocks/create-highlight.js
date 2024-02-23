import { replaceElement } from '../utils/dom-utils.js';

export default function createHighlight(document) {
  [...document.querySelectorAll('.preview')].forEach((spanEl) => {
    const em = document.createElement('em');
    const u = document.createElement('u');
    em.appendChild(u);
    u.innerHTML = spanEl.innerHTML;
    replaceElement(spanEl, em);
  });
}
