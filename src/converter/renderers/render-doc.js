import { defaultExlClient } from '../modules/ExlClient.js';
import md2html from '../modules/ExlMd2Html.js';
import { removeExtension } from '../modules/utils/path-utils.js';
import { DOCPAGETYPE } from '../doc-page-types.js';
import { matchDocsPath } from '../modules/utils/path-match-utils.js';

/**
 * handles a markdown doc path
 */
export default async function renderDoc(path) {
  const {
    params: { lang, solution, docRelPath },
  } = matchDocsPath(path);

  // construct the path in the articles API
  let apiArticlePath = `/docs/${solution}/${docRelPath.join('/')}`;
  const regex = /\.[0-9a-z]+$/i; // Regular expression to match file extensions

  if (regex.test(apiArticlePath)) {
    apiArticlePath = removeExtension(apiArticlePath);
  }

  const response = await defaultExlClient.getArticlesByPath(
    apiArticlePath,
    lang,
  );

  const article = response?.data?.find((d) => d.FullMeta && d.FullBody);

  if (article) {
    const md = article.FullBody;
    const meta = article.FullMeta;
    const { convertedHtml, originalHtml } = await md2html(
      md,
      meta,
      article,
      DOCPAGETYPE.DOC_ARTICLE,
      lang,
    );
    return {
      body: convertedHtml,
      headers: {
        'Content-Type': 'text/html',
      },
      md,
      original: originalHtml,
    };
  }
  return {
    error: new Error(`No Page found for: ${path}`),
  };
}
