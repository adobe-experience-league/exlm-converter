import { toBlock, replaceElement } from '../utils/dom-utils.js';
import { LANDING_IDS } from '../../renderers/utils/landing-utils.js';

const createLandingList = (document, headerId, blockName) => {
  const headers = Array.from(
    document.querySelectorAll(`main > div > [id^='${headerId}']`),
  );

  headers
    ?.map((h) => h.nextElementSibling)
    ?.filter((s) => !!s)
    ?.filter((s) => s.tagName === 'UL' || s.tagName === 'OL')
    ?.forEach((ul) => {
      const newList = document.createElement(ul.tagName);
      newList.innerHTML = ul.innerHTML;
      const block = toBlock(blockName, [[newList]], document);
      replaceElement(ul, block);
    });

  // remove ids. even if they are deduped, they are not correct and should be removed for cleaner markup.
  // thes ids are used for style purposes only on old EXL.
  // EDS overrides it anyway.
  headers?.forEach((h) => h.removeAttribute('id'));
};

export default function createLandingLists(document) {
  createLandingList(document, LANDING_IDS.LISTS_DOCUMENTATION, 'guides-list');
  createLandingList(document, LANDING_IDS.TILES_TUTORIALS, 'tutorial-list');

  // remove ids. even if they are deduped, they are not correct and should be removed for cleaner markup.
  // thes ids are used for style purposes only on old EXL.
  // EDS overrides it anyway.
  const headers = Array.from(
    document.querySelectorAll(
      `main > div > [id^='${LANDING_IDS.LISTS_RESOURCES}']`,
    ),
  );
  headers?.forEach((h) => h.removeAttribute('id'));
}
