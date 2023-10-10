import markdownit from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItAnchor from 'markdown-it-anchor';
import { afm } from 'adobe-afm-transform';
import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import fixSections from '@adobe/helix-html-pipeline/src/steps/fix-sections.js';
import { replace } from '@adobe/helix-html-pipeline/src/utils/hast-utils.js';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import { selectAll, select } from 'hast-util-select';
import jsdom from 'jsdom';
import createVideo from './blocks/create-video.js';
import createBadge from './blocks/create-badge.js';
import createRelatedArticles from './blocks/create-article.js';
import createNote from './blocks/create-note.js';
import createTabs from './blocks/create-tabs.js';
import createTable from './blocks/create-table.js';

// attempt to make table blocks by adding a heading to each table with value "Table"
// in hopes that the html pipeline will maintain them as tables
// per: https://www.hlx.live/developer/block-collection/table
function tableBlock({ content }) {
  const { hast } = content;
  selectAll('table', hast).forEach(($table) => {
    // old header th to td
    const $tds = selectAll('thead > tr > th', $table).map(($th) =>
      h('td', $th.children),
    );

    const $tbody = select('tbody', $table);
    const $newTBody = h('tbody', [h('tr', $tds), ...$tbody.children]);

    const $newTable = h('table', [
      h('thead', [h('tr', [h('th', 'Table')])]),
      $newTBody,
    ]);
    replace(hast, $table, $newTable);
  });
}

function converter(mdString) {
  const convertedHtml = markdownit({
    html: true,
    breaks: true,
    typographer: true,
  })
    .use(markdownItAttrs, { allowedAttributes: ['id', 'class'] })
    .use(markdownItAnchor, { level: [1, 2, 3, 4, 5, 6] })
    .render(mdString);

  const main = fromHtml(convertedHtml, { fragment: true });

  const content = {
    hast: main,
  };

  fixSections({ content });
  tableBlock({ content });
  // createPageBlocks({ content });

  const hast = h('html', [
    h('body', [
      h('header', []),
      h('main', content.hast),
      h('footer', []),
    ]),
  ]);

  raw(hast);
  rehypeFormat()(hast);

  const html = toHtml(hast, {
    upperDoctype: true,
  });

  // Custom HTML transformations.
  const dom = new jsdom.JSDOM(html);
  const { document } = dom.window;

  createVideo(document);
  createBadge(document);
  createRelatedArticles(document);
  createNote(document);
  createTabs(document);
  createTable(document);

  return dom.serialize();
}

export default function md2html(mdString) {
  return converter(afm(mdString, 'extension', (larg) => converter(larg, true)));
}
