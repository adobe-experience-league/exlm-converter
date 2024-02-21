import { toBlock, replaceElement } from '../utils/dom-utils.js';

/**
 * Creats a target insertion block, for Adobe target to insert content into.
 * @param {Document} document
 */
export default function createTargetInsertion(document) {
  // elements whos id start with 'recs-overview-body'
  [...document.querySelectorAll('[id^="recs-overview-body"]')].forEach(
    (element) => {
      const block = toBlock('target-insertion', [[element.id]], document);
      replaceElement(element, block);
    },
  );
}
