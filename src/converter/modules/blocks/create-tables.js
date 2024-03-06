import {
  toBlock,
  replaceElement,
  groupWithParagraphs,
  getAllDecendantTextNodes,
} from '../utils/dom-utils.js';

function rgbToHex(rgbString) {
  // Choose correct separator
  const sep = rgbString.indexOf(',') > -1 ? ',' : ' ';
  // Turn "rgb(r,g,b)" into [r,g,b]
  const rgb = rgbString.substr(4).split(')')[0].split(sep);

  let r = (+rgb[0]).toString(16);
  let g = (+rgb[1]).toString(16);
  let b = (+rgb[2]).toString(16);

  if (r.length === 1) r = `0${r}`;
  if (g.length === 1) g = `0${g}`;
  if (b.length === 1) b = `0${b}`;

  return r + g + b;
}

const convertToStrong = (document, textNode) => {
  const strong = document.createElement('strong');
  strong.innerHTML = textNode.textContent;
  return strong;
};

/**
 * @param {Document} document
 */
export default function createTables(document) {
  const tables = Array.from(document.getElementsByTagName('table'));
  let result = [];
  let tfoot;

  if (tables.length) {
    tables.forEach((table) => {
      const variations = [];

      if (table.querySelector('tfoot')) {
        tfoot = table.querySelector('tfoot');
        table.querySelector('tfoot').remove();
        table.append(tfoot);
        variations.push('with-tfoot');
      }

      // Number of cells in a row.
      let cells = table.querySelectorAll('tr');
      cells.forEach((cell, i) => {
        variations.push(`${i}-row-${cell.children.length}`);
      });

      cells = table.querySelectorAll('tr, th, td');
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
            `${i}-bgcolor-${rgbToHex(cell.style.backgroundColor)}`,
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

        cell.querySelectorAll('strong').forEach((strongElement) => {
          getAllDecendantTextNodes(document, strongElement).forEach(
            (textNode) => {
              const highlightEl = convertToStrong(document, textNode);
              replaceElement(textNode, convertToStrong(document, highlightEl));
            },
          );

          while (strongElement.firstChild) {
            strongElement.parentNode.insertBefore(
              strongElement.firstChild,
              strongElement,
            );
          }
          strongElement.remove();
        });
      });

      // Auto or Fixed variation
      if (table.style.tableLayout)
        variations.push(`layout-${table.style.tableLayout}`);

      // HTML authored variation
      if (!table.querySelector('thead')) {
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

      if (tfoot) {
        const cellChildren = Array.from(tfoot.childNodes);
        result.push([...groupWithParagraphs(document, cellChildren)]);
      }

      replaceElement(
        table,
        toBlock(`table ${variations.join(' ')}`, result, document),
      );
    });
  }
}
