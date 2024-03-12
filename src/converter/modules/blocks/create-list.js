import { toBlock, replaceElement } from '../utils/dom-utils.js';

export const createListBlock = (document, listEl) => {
  const isOrdered = listEl.tagName.toLowerCase() === 'ol';
  const rows = [[...listEl.children]];
  const block = toBlock(`list${isOrdered ? ' ordered' : ''}`, rows, document);
  replaceElement(listEl, block);
};

export default function createList(document) {
  document
    .querySelectorAll('ol, ul')
    .filter((listEl) => listEl.querySelector('div'))
    .forEach((listEl) => createListBlock(document, listEl));
}
