import { blockToTable, replaceElement } from '../utils/dom-utils.js';

/**
 * retroactively converts any nested blocks into tables.
 * hlx converter does not handle nested blocks, for good reason. but we do have use-cases where block are nested
 * For that, this conversion turns only nested blocks into tables, and those tables will be handled at the frontend.
 * @param {Document} document
 */
export default function handleNestedBlocks(document) {
  // Add container block classes this array
  const blockClasses = [
    'table',
    'tabs',
    'code',
    'note',
    'related-articles',
    'Badge',
    'embed',
    'accordion',
    'img-md',
  ];

  // top level blocks (container blocks) blocks have the strict structure body > main > div > div
  const blocks = Array.from(
    document.querySelectorAll('body > main > div > div'),
  );

  // find nested blocks (converted in previous steps), and convert it to a table
  blocks.forEach((block) => {
    blockClasses.forEach((nestedBlockClass) => {
      const nestedBlocks = [...block.getElementsByClassName(nestedBlockClass)];
      nestedBlocks.forEach((nestedBlock) => {
        const table = blockToTable(nestedBlock, document);
        replaceElement(nestedBlock, table);
        const parent = table.parentElement;
        if (parent.tagName.toLowerCase() === 'p') {
          // if the parent is a p tag, then we need to replace the p with it's children: https://jira.corp.adobe.com/browse/UGP-10614
          // if the nested block is with a <p> tag, the grid-table md would be invalid and would result in bad chars rendered.
          parent.replaceWith(...parent.childNodes);
        }
      });
    });
  });
}
