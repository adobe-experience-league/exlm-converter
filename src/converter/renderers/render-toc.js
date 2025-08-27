import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';
import { matchTocPath } from '../modules/utils/path-match-utils.js';

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

  return {
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
  };
}
