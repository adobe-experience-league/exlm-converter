import { h } from 'hastscript';
import { visit } from 'unist-util-visit';

import { TYPE_INLINE_ATTRIBUTE_TEXT } from './hast-handlers/inline-attribute-text.js';

const DIRECTIVE_TYPES = {
  CONTAINER: 'containerDirective',
  LEAF: 'leafDirective',
  TEXT: 'textDirective',
};

const DIRECTIVE_TYPES_VALUES = Object.values(DIRECTIVE_TYPES);

/**
 * Builds a WeakMap that maps each node to its parent.
 */
const buildParentMap = (tree) => {
  const parentMap = new WeakMap();

  visit(tree, (node, _, parent) => {
    if (parent) {
      parentMap.set(node, parent);
    }
  });

  return parentMap;
};

/**
 * Checks if a node has an ancestor of a given type.
 */
const hasAncestorOfAnyType = (node, types, parentMap) => {
  const typeSet = new Set(types);

  let current = parentMap.get(node);
  while (current) {
    if (typeSet.has(current.type)) return true;
    current = parentMap.get(current);
  }

  return false;
};

const normalizeClassName = (str) =>
  str
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

export function remarkDirectivePlugin() {
  return (tree) => {
    const parentMap = buildParentMap(tree);
    visit(tree, (node) => {
      if (DIRECTIVE_TYPES_VALUES.includes(node.type)) {
        const data = node.data || (node.data = {});
        const hast = h(node.name, node.attributes);

        // all directive types are rendered as a div
        data.hName = 'div';

        // container directives are rendered as a div with class properties
        // and only if they are not nested within another container directive
        if (
          node.type === DIRECTIVE_TYPES.CONTAINER &&
          !hasAncestorOfAnyType(node, [DIRECTIVE_TYPES.CONTAINER], parentMap)
        ) {
          const blockOptions = Object.entries(hast.properties).map(
            ([key, value]) => normalizeClassName(`${key}-${value}`),
          );

          const blockName = normalizeClassName(node.name);

          const classNames = [blockName, ...blockOptions];

          data.hProperties = {
            ...hast.properties,
            className: classNames.join(' '),
          };
        } else if (node.type === DIRECTIVE_TYPES.TEXT) {
          // handle text directive as inline attribute text - which is handled on the frontend.
          node.type = TYPE_INLINE_ATTRIBUTE_TEXT;
        }
      }
    });
  };
}
