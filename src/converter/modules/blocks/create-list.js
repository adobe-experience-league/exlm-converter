import { toBlock, replaceElement } from '../utils/dom-utils.js';

export const createListBlock = (document, listEl) => {
  const tag = listEl.tagName.toLowerCase();
  const cloneList = document.createElement(tag);
  cloneList.innerHTML = listEl.innerHTML;
  const block = toBlock('list', [[cloneList]], document);
  replaceElement(listEl, block);
};

export default function createList(document) {
  const ollistElements = Array.from(document.querySelectorAll('ol'));
  const ullistElements = Array.from(document.querySelectorAll('ul'));

  const allLists = [...ollistElements, ...ullistElements];

  allLists.forEach((listEl) => createListBlock(document, listEl));
}
