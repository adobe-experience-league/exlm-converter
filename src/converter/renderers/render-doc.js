import { createDefaultExlClient } from '../modules/ExlClient.js';
import md2html from '../modules/ExlMd2Html.js';
import { removeExtension } from '../modules/utils/path-utils.js';
import { DOCPAGETYPE } from '../../common/utils/doc-page-types.js';
import {
  matchAnyPath,
  matchDocsPath,
} from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';
import { paramMemoryStore } from '../modules/utils/param-memory-store.js';

async function renderDocV1({ path, lang, solution, docRelPath }) {
  // construct the path in the articles API
  let apiArticlePath = `/docs/${solution}/${docRelPath.join('/')}`;
  const regex = /\.[0-9a-z]+$/i; // Regular expression to match file extensions

  if (regex.test(apiArticlePath)) {
    apiArticlePath = removeExtension(apiArticlePath);
  }

  const defaultExlClient = await createDefaultExlClient();
  const response = await defaultExlClient.getArticlesByPath(
    apiArticlePath,
    lang,
  );

  const article = response?.data?.find((d) => d.FullMeta && d.FullBody);

  if (article) {
    const md = article.FullBody;
    const meta = article.FullMeta;
    const { convertedHtml, originalHtml } = await md2html({
      mdString: md,
      meta,
      data: article,
      pageType: DOCPAGETYPE.DOC_ARTICLE,
      reqLang: lang,
      path,
    });
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

async function renderDocV2({ path, lang, authorization }) {
  const defaultExlClientv2 = await createDefaultExlClientV2();

  const docHtmlResponse = await defaultExlClientv2.getArticleHtmlByPath(
    path,
    lang,
    {
      headers: {
        ...(authorization && { authorization }),
      },
    },
  );

  if (!docHtmlResponse.ok) {
    return {
      statusCode: docHtmlResponse.status,
      error: new Error(
        `Failed to fetch doc HTML: ${docHtmlResponse.statusText}`,
      ),
    };
  }

  const html = await docHtmlResponse.text();

  return {
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: html,
  };
}

export const matchDocsV2Path = (path) => {
  const v2Paths = paramMemoryStore.get()?.v2Paths?.split(',') || [];
  return matchAnyPath(path, v2Paths);
};

/**
 * handles a markdown doc path
 */
export default async function renderDoc(path, authorization) {
  const {
    params: { lang, solution, docRelPath },
  } = matchDocsPath(path);

  // feature flag on, and path is in the v2 paths, use the v2 renderer
  if (paramMemoryStore.hasFeatureFlag('docs-v2') && matchDocsV2Path(path)) {
    return renderDocV2({ path, lang, authorization });
  }
  return renderDocV1({ path, lang, solution, docRelPath });
}
