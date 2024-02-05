import { toBlock, createNewSectionForBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createShadeBox(document) {
  Array.from(document.querySelectorAll('.sp-wrapper')).forEach(
    (shadeBoxElement) => {
      const shadeBoxSection = createNewSectionForBlock(
        document,
        shadeBoxElement,
      );

      shadeBoxSection.append(...shadeBoxElement.children);
      shadeBoxSection.append(
        toBlock('section-metadata', [['style', 'shade-box']], document),
      );
      shadeBoxElement.remove();
    },
  );
}
