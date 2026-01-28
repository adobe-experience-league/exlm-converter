import jsdom from 'jsdom';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';
import { matchTocPath } from '../modules/utils/path-match-utils.js';

const { JSDOM } = jsdom;

export default async function renderToc(path, authorization) {
  const {
    params: { lang, tocId },
  } = matchTocPath(path);
  const defaultExlClientv2 = await createDefaultExlClientV2();
  const tocHtmlResponse = await defaultExlClientv2.getTocHtmlById(tocId, lang, {
    headers: {
      ...(authorization && { authorization }),
    },
  });

  if (!tocHtmlResponse.ok) {
    return {
      statusCode: tocHtmlResponse.status,
      error: new Error(
        `Failed to fetch TOC HTML: ${tocHtmlResponse.statusText}`,
      ),
    };
  }

  const html = await tocHtmlResponse.text();

  // Parse HTML and add proper section wrapper classes for left rail support
  const dom = new JSDOM(html);
  const { document } = dom.window;

  // Find the main div that contains the TOC content and add required classes
  const main = document.querySelector('main');
  if (main) {
    const tocDiv = main.querySelector('div');
    if (tocDiv && !tocDiv.classList.contains('toc-container')) {
      // Add required classes for left navigation rail to appear
      tocDiv.classList.add('section', 'toc-container');
    }
  }

  return {
    body: dom.serialize(),
    headers: {
      'Content-Type': 'text/html',
    },
  };
}
