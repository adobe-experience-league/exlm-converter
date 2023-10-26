import {
  toBlock,
  replaceElement,
  groupWithParagraphs,
} from '../utils/dom-utils.js';

/**
 * @param {Document} document
 */
export default function createTables(document) {
  const tables = Array.from(document.getElementsByTagName('table'));
  let result = [];

  if (tables.length) {
    tables.forEach((table) => {
      const variations = [];
      if (table.style.tableLayout)
        variations.push(`layout-${table.style.tableLayout}`);
      /** @type {HTMLElement[]} */
      const $rows = [];
      Array.from(table.children).forEach((child) => {
        if (
          child.tagName.toLowerCase() === 'thead' ||
          child.tagName.toLowerCase() === 'tbody'
        ) {
          $rows.push(...Array.from(child.children));
        }
      });

      result = $rows.map((row) =>
        Array.from(row.children).map((cell) => {
          const cellChildren = Array.from(cell.childNodes);
          return groupWithParagraphs(document, cellChildren);
        }),
      );

      replaceElement(
        table,
        toBlock(`table ${variations.join(' ')}`, result, document),
      );
    });
  }
}
