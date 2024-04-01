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

    const newImg = document.createElement('img');
    newImg.src = img.src;
    if (hasAttributes) {
      // add text node after img
      const attributesAsText = Object.entries(attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      const text = document.createTextNode(`{${attributesAsText}}`);
      img.parentNode.insertBefore(text, img.nextSibling);
    } else {
      newImg.alt = img.alt;
      newImg.title = img.title;
    }
    // replace img with newImg
    img.parentNode.replaceChild(newImg, img);
  });
}
