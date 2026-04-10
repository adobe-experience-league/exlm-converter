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

  const schemaScript = document.createElement('script');
  schemaScript.id = scriptId;
  schemaScript.type = 'application/ld+json';
  schemaScript.textContent = JSON.stringify(schema).replace(
    /<\/script>/gi,
    '<\\/script>',
  );
  document.head.appendChild(schemaScript);
  return true;
};
