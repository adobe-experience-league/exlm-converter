import markdownit from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItAnchor from 'markdown-it-anchor';
import { afm } from 'adobe-afm-transform';
import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
// import prettier from 'prettier/standalone';
// import prettierPluginHTML from 'prettier/plugins/html';
import { createMetaData } from './utils/dom-utils.js';
import createVideo from './blocks/create-video.js';
import createBadge from './blocks/create-badge.js';
import createRelatedArticles from './blocks/create-article.js';
import createNote from './blocks/create-note.js';
import createTabs from './blocks/create-tabs.js';
import createTables from './blocks/create-tables.js';
// import { createSections } from './utils/dom-utils.js';
import createShadeBox from './blocks/create-shade-box.js';
import createCodeBlock from './blocks/create-code-block.js';

async function converter(mdString, meta) {
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

  const hast = h('html', [
    h('body', [
      h('header', []),
      h('main', [h('div', content.hast)]),
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
  // createSections(document);
  createMetaData(document, meta);
  createVideo(document);
  createBadge(document);
  createRelatedArticles(document);
  createNote(document);
  createTabs(document);
  createTables(document);
  createShadeBox(document);
  createCodeBlock(document);

  /* FIXME: Page breaking - docs/authoring-guide-exl/using/markdown/syntax-style-guide
  return prettier.format(dom.serialize(), {
    parser: 'html',
    plugins: [prettierPluginHTML],
  }); */
  return dom.serialize();
}

export default async function md2html(mdString, meta) {
  return converter(afm(mdString, 'extension'), meta);
}
