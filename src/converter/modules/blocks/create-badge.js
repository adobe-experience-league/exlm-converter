import { createTextWithInlineAttributes } from '../utils/inline-attributes-util.js';

/**
 * @param {Document} document
 */
export default function createBadge(document) {
  Array.from(document.getElementsByClassName('sp-badge-wrapper')).forEach(
    (element) => {
      const spBadge = element.querySelector('sp-badge');
      const { textContent } = spBadge;
      const variant = spBadge.getAttribute('variant');
      const title = spBadge.getAttribute('title');

      const attrs = {
        class: variant ? `badge ${variant.toLowerCase()}` : 'badge',
      };

      if (title) {
        attrs.title = title;
      }

      // will be decorated on the FE.
      const textReplacement = createTextWithInlineAttributes(
        textContent,
        attrs,
      );
      element.replaceWith(document.createTextNode(textReplacement));
    },
  );
}
