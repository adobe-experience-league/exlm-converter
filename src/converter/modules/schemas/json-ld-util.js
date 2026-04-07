import { htmlToElement } from '../utils/dom-utils.js';

/**
 * Upserts a JSON-LD script in document head.
 * Returns true when a script is injected, false if schema is invalid.
 *
 * @param {Document} document
 * @param {Object} schema
 * @param {string} scriptId
 * @returns {boolean}
 */
export const upsertJsonLdScript = (document, schema, scriptId) => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  const existing = document.getElementById(scriptId);
  if (existing) existing.remove();

  const createElement = htmlToElement(document);
  const schemaScript = createElement(
    `<script id="${scriptId}" type="application/ld+json"></script>`,
  );
  schemaScript.textContent = JSON.stringify(schema);
  document.head.appendChild(schemaScript);
  return true;
};
