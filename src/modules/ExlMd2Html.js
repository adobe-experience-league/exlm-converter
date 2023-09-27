import markdownit from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItAnchor from 'markdown-it-anchor';
import {afm} from 'adobe-afm-transform';
import {fromHtml} from 'hast-util-from-html'
import createPageBlocks from '@adobe/helix-html-pipeline/src/steps/create-page-blocks.js';
import { h } from 'hastscript';
import fixSections from '@adobe/helix-html-pipeline/src/steps/fix-sections.js';
import {replace } from '@adobe/helix-html-pipeline/src/utils/hast-utils.js';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import { selectAll, select } from 'hast-util-select';

function tableBlock({content}) {
  const { hast } = content;
  selectAll('table', hast).forEach(($table) => {
    const $newTable = h('table', [
      h('thead', [
        h('tr', [
          h('th', 'Table'),
        ])
      ]),
      ...$table.children
    ]);
    replace(hast, $table, $newTable);
  });
}

function converter (mdString, nested = false) {
  const convertedHtml = markdownit({
    html: true,
    breaks: true,
    typographer: true
  })
  .use(markdownItAttrs, {allowedAttributes: ['id', 'class']})
  .use(markdownItAnchor, {level: [1, 2, 3, 4, 5, 6]})
  .render(mdString);

  const main = fromHtml(convertedHtml, {fragment: true})


  const content = {
    hast: main
  };


  fixSections({ content });
  tableBlock({content})
  // createPageBlocks({ content });

  const hast = h('html', [
    h('body', [
      h('header', []),
      h('main', [
        h('div', content.hast)
      ]),
      h('footer', [])]),
  ]);

  raw(hast);
  rehypeFormat()(hast);

  return toHtml(hast, {
    upperDoctype: true,
  });

}

export default function md2html (mdString) {
  return converter(afm(mdString, 'extension', larg => converter(larg, true)))
}