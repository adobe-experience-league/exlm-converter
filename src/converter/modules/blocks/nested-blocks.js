import { toBlock } from '../utils/dom-utils.js';

let fragmentIndex = 0;
function createFragmentSection(block, document) {
  const fragmentSection = document.createElement('div');
  const fragmentReference = document.createElement('p');
  const blockName = block.classList[0];

  const fragmentId = `inline-fragment-${blockName}-${fragmentIndex}`;
  fragmentReference.innerHTML = `<a href="#${fragmentId}">${fragmentId}</a>`;
  fragmentSection.append(block.cloneNode(true));
  fragmentSection.append(
    toBlock(
      'section-metadata',
      [
        ['style', 'inline-fragment'],
        ['id', fragmentId],
      ],
      document,
    ),
  );

  fragmentIndex += 1;
  return { fragmentSection, fragmentReference };
}

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
        // const table = blockToTable(nestedBlock, document);
        // replaceElement(nestedBlock, table);
        const { fragmentSection, fragmentReference } = createFragmentSection(
          nestedBlock,
          document,
        );
        const section = block.parentElement;
        section.after(fragmentSection);
        nestedBlock.replaceWith(fragmentReference);
      });
    });
  });
}
