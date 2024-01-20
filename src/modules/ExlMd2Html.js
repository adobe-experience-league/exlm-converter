import { afm } from 'adobe-afm-transform';
import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
import { createMetaData, handleExternalUrl } from './utils/dom-utils.js';
import { docPageType } from '../doc-page-types.js';
import handleAbsoluteUrl from './utils/link-utils.js';
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
import createArticleMetaDataTopics from './blocks/create-article-metadata-topics.js';
import createArticleMetaDataCreatedBy from './blocks/create-article-metadata-createdby.js';
import markdownItToHtml from './MarkdownIt.js';
import createMiniTOC from './blocks/create-mini-toc.js';
import createImgBlock from './blocks/create-img-block.js';
import createAccordion from './blocks/create-accordion.js';
import createTOC from './blocks/create-toc.js';
import createBreadcrumbs from './blocks/create-breadcrumbs.js';
import createDocActions from './blocks/create-doc-actions.js';
import createCloudSolutions from './blocks/create-cloud-solutions.js';

const doAmf = (md) => {
  // AMF has a bug where it doesn't handle tripple-backticks correctly.
  // it assumes ALL backticks are the start/end of a code block.
  // in some doc markdowns, we saw a few ``` in the middle of a sentence.
  // code below fixes that by encoding the backticks that are not preceded with a new line
  // before passing to AMF, and then decoding them after.
  // this: `(?<!\n)` means not preceded by a new line
  const backTickEncoded = md.replace(/(?<!\n)```/g, '&grave;&grave;&grave;');
  const amfProcessed = afm(backTickEncoded, 'extension');
  return amfProcessed.replace(/(?<!\n)&grave;&grave;&grave;/g, '```');
};

export default async function md2html(mdString, meta, data, pageType) {
  const amfProcessed = doAmf(mdString, 'extension');
  const convertedHtml = markdownItToHtml(amfProcessed);
  const main = fromHtml(convertedHtml, { fragment: true });

  const content = {
    hast: main,
  };

  // Add the Left and Right Rail content as part of their respective Placeholders
  const hast = h('html', [
    h('body', [
      h('header', []),
      h('main', [
        h('div', content.hast), // Base Content - Must be first child for proper rendering
        h('div', []), // Left Rail Block - TOC - Must be second child for proper rendering
        h('div', []), // Right Rail Block - mini TOC - Must be third child for proper rendering
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
  if (pageType === docPageType.DOC_LANDING) {
    createCloudSolutions(document);
  } else if (pageType === docPageType.SOLUTION_LANDING) {
    // Blocks for Solution landing page will go here
  } else {
    // createSections(document);
    handleAbsoluteUrl(document);
    createMetaData(document, meta, data);
    createArticleMetaData(document, meta);
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
    createArticleMetaDataCreatedBy(document, data);
    createArticleMetaDataTopics(document, meta);
    handleExternalUrl(document);
    createMiniTOC(document);
    createTOC(document, data);
    createImgBlock(document);
    createAccordion(document);
    createBreadcrumbs(document, meta);
    createDocActions(document);
    // leave this at the end
    handleNestedBlocks(document);
  }
  return {
    convertedHtml: dom.serialize(),
    originalHtml: html,
  };
}
