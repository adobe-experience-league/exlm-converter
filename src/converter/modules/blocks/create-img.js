import { isOneOfTags, removeAllAttributesExcept } from '../utils/dom-utils.js';

const ALLOWED_ALIGN_VALUES = ['left', 'right', 'center'];

/**
 * @param {HTMLImageElement} img
 * @returns
 */
const getImageAttributes = (img) => {
  if (!img) return {};
  // only supported attributes are: align and width
  // Additionally, the classes modal-image and modal-image-full are also supported.
  // see: https://experienceleague.corp.adobe.com/docs/authoring-guide-exl/using/markdown/cheatsheet.html?lang=en#images
  const attr = {};
  // althought align attributes is depricated, it's value will be handled on the FE with CSS.
  if (img.align) {
    const alignValue = img.align?.toLowerCase();
    if (ALLOWED_ALIGN_VALUES.includes(alignValue)) {
      attr.align = alignValue;
    }
  }
  if (img.parentNode?.tagName?.toLowerCase() === 'center') {
    attr.align = 'center';
    // remove center tag
    img?.parentNode?.parentNode?.replaceChild(img, img?.parentNode);
  }
  if (img.hasAttribute('width')) attr.width = img.getAttribute('width');
  if (img.className?.includes('modal-image')) attr.modal = 'regular';
  if (img.className?.includes('modal-image-full')) attr.modal = 'full';
  return attr;
};

/**
 * @param {Document} document
 */
export default function createImg(document) {
  Array.from(document.querySelectorAll('img')).forEach((img) => {
    const isParentAnchor =
      img?.parentNode?.tagName?.trim()?.toLowerCase() === 'a';
    if (isParentAnchor) {
      return; // skip if parent is anchor
    }

    const attributes = getImageAttributes(img);
    const hasAttributes = Object.keys(attributes).length > 0;

    if (hasAttributes) {
      // add text node after img
      const attributesAsText = Object.entries(attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      const text = document.createTextNode(`{${attributesAsText}}`);
      // images that have following attributes should be wrapped in a paragraph
      // except images already within a paragraph or list item
      // why? the frontend expects a text node (attributes) to be after the image.
      //  There are some cases where Edge Delivery puts images and text in separate paragraphs (if no parent paragraph is present), this avoids that.
      // @see: UGP-13667
      if (!isOneOfTags(img.parentNode, ['p', 'li'])) {
        const p = document.createElement('p');
        img.parentNode.insertBefore(p, img.nextSibling);
        p.append(img);
      }
      // insert text after img
      img.parentNode.insertBefore(text, img.nextSibling);
    }
    // remove all attributes except src, alt, title
    removeAllAttributesExcept(img, ['src', 'alt', 'title']);
  });
}
