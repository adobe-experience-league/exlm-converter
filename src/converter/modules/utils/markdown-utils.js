import { raw } from 'hast-util-raw';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { removePosition } from 'unist-util-remove-position';

import inlineAttributeText, {
  TYPE_INLINE_ATTRIBUTE_TEXT,
} from './hast-handlers/inline-attribute-text.js';
import { remarkDirectivePlugin } from './remark-directive-plugin.js';

/**
 * @typedef {Parent} Section
 * @property {'section'} type
 */

/**
 * @param {Root} mdast
 */
export const splitSections = (mdast) => {
  // filter all children that are break blocks
  const dividers = mdast.children
    .filter((node) => node.type === 'thematicBreak')
    // then get their index in the list of children
    .map((node) => mdast.children.indexOf(node));

  // find pairwise permutations of spaces between blocks
  // include the very start and end of the document
  const starts = [0, ...dividers];
  const ends = [...dividers, mdast.children.length];

  mdast.children = starts
    .map((k, i) => [k, ends[i]])
    // but filter out empty section
    .filter(([start, end]) => start !== end)
    // then return all nodes that are in between
    .map(([start, end]) => ({
      type: 'section',
      children: mdast.children.slice(start, end),
    }));
};

/**
 * Turns the markdown into a MDAST structure
 * @param {string} md - The markdown string
 * @returns {Promise<Root>} The MDAST structure
 */
export const md2mdast = async (md) => {
  if (typeof md !== 'string') {
    throw new Error('md2mdast expects a string parameter');
  }
  const mdFixedNewLines = md.replace(/(\r\n|\n|\r)/gm, '\n');
  const processor = unified()
    .use(remarkParse, {
      gfm: true,
      commonmark: true,
      footnotes: true,
      pedantic: false,
    })
    .use(remarkDirective)
    .use(remarkDirectivePlugin)
    .use(remarkFrontmatter, ['yaml', 'toml']);

  const mdast = processor.parse(mdFixedNewLines);

  await processor.run(mdast);

  splitSections(mdast);

  removePosition(mdast, { force: true });

  return mdast;
};

/**
 * Turns the MDAST into a HAST structure
 * @param {Root} mdast
 * @returns {Nodes}
 */
export const mdast2hast = (mdast) => {
  const hast = toHast(mdast, {
    allowDangerousHtml: false,
    handlers: {
      ...defaultHandlers,
      /** @ts-expect-error - This is a custom handler */
      [TYPE_INLINE_ATTRIBUTE_TEXT]: inlineAttributeText(),
    },
  });

  return raw(hast);
};
