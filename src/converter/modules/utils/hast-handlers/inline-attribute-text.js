import { toString } from 'hast-util-to-string';

export const TYPE_INLINE_ATTRIBUTE_TEXT = 'exlInlineAttributeText';

/**
 * @param {Record<string, string>} obj
 * @returns {string}
 */
const objectToInlineAttributeText = (obj) =>
  Object.entries(obj)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

/**
 * @returns {Handler}
 */
export default function inlineAttributeText() {
  return function handler(state, node) {
    const text = toString(node);
    const attributesText = objectToInlineAttributeText(node.attributes);

    return {
      type: 'text',
      value: `[${text}]{${attributesText}}`,
    };
  };
}
