/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { EXIT, visit } from 'unist-util-visit';
import { h } from 'hastscript';

export function replace(tree, oldNode, newNode) {
  // $table.parentNode.replaceChild($div, $table);
  // replace child in parent
  visit(tree, oldNode, (node, idx, parent) => {
    parent.children[idx] = newNode;
    return EXIT;
  });
}

export function childNodes(node) {
  return node.children.filter((n) => n.type === 'element');
}

export function wrapContent($parent, $node) {
  $parent.children.push(...$node.children);
  $node.children = [$parent];
}

/**
 * @typedef {Object} EdsHastDocOptions
 * @property {Nodes} mainHast
 * @property {string} htmlLang
 * @property {Nodes} [head]
 */

/**
 * @param {EdsHastDocOptions} options
 * @returns {Root}
 */
export function toEdsHast(options) {
  return {
    type: 'root',
    children: [
      { type: 'doctype' },
      h('html', { lang: options.htmlLang }, [
        h('head', options.head || []),
        h('body', [
          h('header', []),
          h('main', options.mainHast),
          h('footer', []),
        ]),
      ]),
    ],
  };
}
