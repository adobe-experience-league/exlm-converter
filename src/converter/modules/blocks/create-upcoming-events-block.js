import { toBlock, replaceElement } from '../utils/dom-utils.js';

/**
 * @param {Document} document
 */
export default function createUpcomingEventsBlock(document) {
  const upcomingEvents = document.getElementById('upcoming-events');

  if (upcomingEvents) {
    const div = document.createElement('div');
    div.innerHTML = upcomingEvents.innerHTML;

    const cells = [[div]];
    const block = toBlock('upcoming-events', cells, document);

    replaceElement(upcomingEvents, block);
  }
}
