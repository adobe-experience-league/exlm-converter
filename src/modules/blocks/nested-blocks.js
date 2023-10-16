import { blockToTable, replaceElement } from '../utils/dom-utils.js';

/**
 *
 * @param {Document} document
 */
export default function handleNestedBlocks(document) {
  // Add container block classes this array
  const containerBlockClasses = ['shade-box', 'table', 'tabs'];

  // Add content block classes this array
  const contentBlockClasses = [
    'code',
    'note',
    'related-articles',
    'Badge',
    'embed',
  ];

  containerBlockClasses.forEach((containerBlock) => {
    // container blocks have the strict structure body > main > div > .${containerBlock}
    const containers = Array.from(
      document.querySelectorAll(`body > main > div > .${containerBlock}`),
    );

    // find nested blocks (converted in previous steps), and convert it to a table
    containers.forEach((container) => {
      [...containerBlockClasses, ...contentBlockClasses].forEach(
        (nestedBlockClass) => {
          const nestedBlocks = [
            ...container.getElementsByClassName(nestedBlockClass),
          ];
          nestedBlocks.forEach((nestedBlock) => {
            const table = blockToTable(nestedBlock, document);
            replaceElement(nestedBlock, table);
          });
        },
      );
    });
  });
}
