import { blockToTable, replaceElement } from '../utils/dom-utils.js';

/**
 * retroactively converts any nested blocks into tables.
 * hlx converter does not handle nested blocks, for good reason. but we do have use-cases where block are nested
 * For that, this conversion turns only nested blocks into tables, and those tables will be handled at the frontend.
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
