import { afm } from 'adobe-afm-transform';
import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import { raw } from 'hast-util-raw';
import rehypeFormat from 'rehype-format';
import { toHtml } from 'hast-util-to-html';
import jsdom from 'jsdom';
import { handleExternalUrl, createSections } from './utils/dom-utils.js';
import { DOCPAGETYPE } from '../../common/utils/doc-page-types.js';
import handleUrls from '../../common/utils/link-utils.js';
import createVideo from './blocks/create-video.js';
import createBadge from './blocks/create-badge.js';
import createRelatedArticles from './blocks/create-article.js';
import createNote from './blocks/create-note.js';
import createHighlight from './blocks/create-highlight.js';
import createTabs from './blocks/create-tabs.js';
import createTables from './blocks/create-tables.js';
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
import createImg from './blocks/create-img.js';
import createAccordion from './blocks/create-accordion.js';
import createTOC from './blocks/create-toc.js';
import createBreadcrumbs from './blocks/create-breadcrumbs.js';
import createBackToBrowsing from './blocks/create-back-to-browsing.js';
import createDocActions from './blocks/create-doc-actions.js';
import createCloudSolutions from './blocks/create-cloud-solutions.js';
import createLandingLists from './blocks/create-landing-lists.js';
import createStaffPicksBlock from './blocks/create-staff-picks-block.js';
import createUpcomingEventsBlock from './blocks/create-upcoming-events-block.js';
import { updateAnchors } from './utils/update-anchors.js';
import createTargetInsertion from './blocks/create-target-insertion.js';
import { createRecommendationMoreHelp } from './blocks/create-recommendation-more-help.js';
import createDocsCards from './blocks/create-docs-cards.js';
import { createMetaData } from './utils/metadata-util.js';
import { createDefaultExlClient } from './ExlClient.js';
import handleTooManyImages from './blocks/too-many-images.js';

const doAmf = (md) => {
  // AMF has a bug where it doesn't handle tripple-backticks correctly.
  // it assumes ALL backticks are the start/end of a code block.
  // in some doc markdowns, we saw a few ``` in the middle of a sentence.
  // code below fixes that by encoding the backticks that are not preceded with a new line
  // before passing to AMF, and then decoding them after.
  // this: `(?<!\n)` means not preceded by a new line
  if (!md) return md;
  const backTickEncoded = md.replace(/(?<!\n)```/g, '&grave;&grave;&grave;');
  const amfProcessed = afm(backTickEncoded, 'extension');
  return amfProcessed.replace(/(?<!\n)&grave;&grave;&grave;/g, '```');
};

export default async function md2html({
  mdString,
  meta,
  data,
  pageType,
  reqLang,
  path,
}) {
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
        h('div', { class: 'section' }, []), // Left Rail Block - TOC - Must be second-last section for proper rendering
        h('div', { class: 'section' }, []), // Right Rail Block - mini TOC - Must be last section for proper rendering
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
  const defaultExlClient = await createDefaultExlClient();
  const solutions = await defaultExlClient.getSolutions();
  createMetaData(document, meta, data, pageType, solutions);
  handleUrls(document, reqLang, pageType);
  updateAnchors(document);
  const asyncDecorationPromises = [];
  if (pageType === DOCPAGETYPE.DOC_LANDING) {
    createCloudSolutions(document);
    handleExternalUrl(document);
  } else if (pageType === DOCPAGETYPE.SOLUTION_LANDING) {
    handleExternalUrl(document);
    createMiniTOC(document);
    createBreadcrumbs(document, meta, pageType, reqLang);
    createLandingLists(document);
  } else {
    createArticleMetaData(document, meta);
    // we dont want to block the rendering of the page
    asyncDecorationPromises.push(createVideo(document));
    createBadge(document);
    createRelatedArticles(document);
    createNote(document);
    createHighlight(document);
    createTabs(document);
    createStaffPicksBlock(document);
    createUpcomingEventsBlock(document);
    createTables(document);
    createShadeBox(document);
    createCodeBlock(document);
    createVideoTranscript(document);
    createList(document);
    await createArticleMetaDataCreatedBy(document, data, reqLang);
    await createArticleMetaDataTopics(document, meta, reqLang);
    handleExternalUrl(document);
    createMiniTOC(document);
    createTOC(document, data);
    createImg(document);
    createAccordion(document);
    createBreadcrumbs(document, meta, pageType, reqLang);
    createDocActions(document);
    createTargetInsertion(document);
    createDocsCards(document);
    createBackToBrowsing(document);
    // leave this at the end - UGP-10241
    createRecommendationMoreHelp(document);
    // leave this at the end
    handleNestedBlocks(document);
    // leave this at the end - UGP-10894 Handle Too Many Images
    handleTooManyImages(document, path);
    // leave this at the end - EXLM 1442 1510 Splitting into multiple Sections
    createSections(document);
    // wait till all async blocks are done rendering
    await Promise.allSettled(asyncDecorationPromises);
  }

  return {
    convertedHtml: dom.serialize(),
    originalHtml: html,
  };
}
