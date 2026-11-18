/**
 * Create a text with inline attributes
 * @param {string} text
 * @param {Object.<string, string>} attributes
 * @returns {string}
 */
export const createTextWithInlineAttributes = (text, attributes) => {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value || ''}"`)
    .join(' ');
  return `[${text}]{${attrs}}`;
};
