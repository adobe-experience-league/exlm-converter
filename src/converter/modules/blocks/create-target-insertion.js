import { toBlock, replaceElement } from '../utils/dom-utils.js';

/**
 * @param {HTMLElement} el
 * @param {string} idPrefix
 */
const getElementsByStartsWithId = (el, idPrefix) =>
  Array.from(el.querySelectorAll(`[id^="${idPrefix}"]`));

/**
 * Convert array of strings to array of elements with tagName
 * @param {Document} document
 * @param {string} tagName
 * @param {string[]} strings
 * @returns
 */
const stringsToElementArray = (document, tagName, strings) => {
  if (!document || strings?.length === 0 || !tagName) return [];
  return strings.map((str) => {
    const el = document.createElement(tagName);
    el.innerHTML = str;
    return el;
  });
};

/**
 * @param {Document} document
 * @param {string} containerId
 * @param {string[]} childIds
 */
export const targetInsertionBlock = (document, containerId, childIds = []) => {
  const childIdElements = stringsToElementArray(document, 'p', childIds);
  return toBlock(
    'target-insertion',
    [[[containerId], childIdElements]],
    document,
  );
};

/**
 * get closest ancestor element with an id that starts with a given prefix
 * @param {HTMLElement} element
 * @param {string} idPrefix
 * @returns {HTMLElement | null}
 */
const getClosestAncestorWhosIdStartsWith = (element, idPrefix) => {
  if (!element) return element;
  return element.parentElement.closest(`[id^="${idPrefix}"]`);
};

/**
 * Creats a target insertion block, for Adobe target to insert content into.
 * @param {Document} document
 */
export default function createTargetInsertion(document) {
  const idPrefix = 'recs-';
  getElementsByStartsWithId(document.body, idPrefix)
    // remove elements that have a parent with an id that starts with 'recs-' (aka nested recs- elements)
    .filter((el) => getClosestAncestorWhosIdStartsWith(el, idPrefix) == null)
    // only divs
    .filter((el) => el.tagName.toLowerCase() === 'div')
    .forEach((el) => {
      const childRecs = getElementsByStartsWithId(el, idPrefix);
      const childIds = childRecs?.map((child) => child.id) || [];
      replaceElement(el, targetInsertionBlock(document, el.id, childIds));
    });
}
