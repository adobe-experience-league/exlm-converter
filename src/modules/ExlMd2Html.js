import { afm } from 'adobe-afm-transform';
import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
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
import createVideoTranscript from './blocks/create-video-transcript.js';
import handleNestedBlocks from './blocks/nested-blocks.js';
import createList from './blocks/create-list.js';
import createArticleMetaData from './blocks/create-article-metadata.js';
import markdownItToHtml from './MarkdownIt.js';

async function converter(mdString, meta, lastUpdated, level) {
  const convertedHtml = markdownItToHtml(mdString);

  const main = fromHtml(convertedHtml, { fragment: true });

  const content = {
    hast: main,
  };

  // Add the Left and Right Rail content as part of their respective Placeholders
  const hast = h('html', [
    h('body', [
      h('header', []),
      h('main', [
        h('div', 'Placeholder Content for Left Rail'), // Left Rail Block
        h('div', content.hast), // Base Content
        h('div', 'Placeholder Content for Right Rail'), // Right Rail Block
      ]),
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
  createArticleMetaData(document, meta, lastUpdated, level);
  createVideo(document);
  createBadge(document);
  createRelatedArticles(document);
  createNote(document);
  createTabs(document);
  createTables(document);
  createShadeBox(document);
  createCodeBlock(document);
  createVideoTranscript(document);
  createList(document);
  // leave this at the end
  handleNestedBlocks(document);

  return {
    convertedHtml: dom.serialize(),
    originalHtml: html,
  };
}

export default async function md2html(mdString, meta, lastUpdated, level) {
  return converter(afm(mdString, 'extension'), meta, lastUpdated, level);
}
