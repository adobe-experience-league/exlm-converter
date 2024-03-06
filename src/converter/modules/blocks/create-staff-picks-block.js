import { toBlock, replaceElement } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 */
export default function createStaffPicksBlock(document) {
  const staffPicks = document.getElementById('staff-picks-section');

  if (staffPicks) {
    const div = document.createElement('div');
    div.innerHTML = staffPicks.innerHTML;

    const cells = [[div]];
    const block = toBlock('staff-picks', cells, document);

    replaceElement(staffPicks, block);
  }
}
