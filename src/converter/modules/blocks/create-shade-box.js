import { toBlock } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function createShadeBox(document) {
  Array.from(document.querySelectorAll('.sp-wrapper')).forEach(
    (shadeBoxElement) => {
      const section = shadeBoxElement.parentElement;
      const shadeBoxSection = document.createElement('div');
      const subsequenSection = document.createElement('div');
      section.after(shadeBoxSection);

      let nextPointer = shadeBoxElement.nextElementSibling;
      if (nextPointer) {
        shadeBoxSection.after(subsequenSection);
        while (nextPointer) {
          const next = nextPointer.nextElementSibling;
          subsequenSection.append(nextPointer);
          nextPointer = next;
        }
      }

      shadeBoxSection.append(...shadeBoxElement.children);
      shadeBoxSection.append(
        toBlock('section-metadata', [['style', 'shade-box']], document),
      );
      shadeBoxElement.remove();
    },
  );
}
