import {
  toBlock,
  replaceElement,
  groupWithParagraphs,
} from '../utils/dom-utils.js';

function rgbaToHex(rgba) {
  let hex = '';
  const match = rgba.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*\.\d+|\d+)\)$/,
  );
  if (!match) {
    return null;
  }
  for (let i = 1; i <= 3; i += 1) {
    const component = parseInt(match[i], 10).toString(16);
    hex += component.length === 1 ? `0${component}` : component;
  }
  const alpha = Math.round(parseFloat(match[4]) * 255).toString(16);
  hex += alpha.length === 1 ? `0${alpha}` : alpha;
  return hex;
}

/**
 * @param {Document} document
 */
export default function createTables(document) {
  const tables = Array.from(document.getElementsByTagName('table'));
  let result = [];

  if (tables.length) {
    tables.forEach((table) => {
      const variations = [];

      // Number of cells in a row.
      let cells = table.querySelectorAll('tr');
      cells.forEach((cell, i) => {
        variations.push(`${i}-row-${cell.children.length}`);
      });

      cells = table.querySelectorAll('th, td');
      cells.forEach((cell, i) => {
        // colspan variation
        if (cell.getAttribute('colspan')) {
          variations.push(`${i}-colspan-${cell.getAttribute('colspan')}`);
        }

        // rowspan variation
        if (cell.getAttribute('rowspan')) {
          variations.push(`${i}-rowspan-${cell.getAttribute('rowspan')}`);
        }

        // Cell text-align variation
        if (cell.style.textAlign) {
          variations.push(`${i}-align-${cell.style.textAlign}`);
        }

        // border variation
        if (cell.style.border) {
          variations.push(`${i}-border-${cell.style.border}`);
        }

        // background colour variation
        if (cell.style.backgroundColor) {
          variations.push(
            `${i}-bgcolor-${rgbaToHex(cell.style.backgroundColor)}`,
          );
        }

        // width variation
        if (cell.getAttribute('width')) {
          variations.push(`${i}-width-${cell.getAttribute('width')}`);
        }

        // height variation
        if (cell.getAttribute('height')) {
          variations.push(`${i}-height-${cell.getAttribute('height')}`);
        }
      });

      // Auto or Fixed variation
      if (table.style.tableLayout)
        variations.push(`layout-${table.style.tableLayout}`);

      // HTML authored variation
      if (table.children[0].tagName !== 'THEAD') {
        variations.push('html-authored');

        // Without header variation
        if (!table.querySelector('th')) {
          variations.push('no-header');
        }
      }

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
