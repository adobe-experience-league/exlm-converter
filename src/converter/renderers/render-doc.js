import Logger from '@adobe/aio-lib-core-logging';
import jsdom from 'jsdom';
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
import { setMetadata } from '../modules/utils/dom-utils.js';
import { isHTML } from '../modules/utils/media-utils.js';

export const aioLogger = Logger('render-doc');

/** Prefer the row matching `path`; otherwise first list item or object payload. */
export const articleFromSearchPayload = (payload, path = '') => {
  const data = payload?.data;
  if (Array.isArray(data)) {
    if (path) {
      return data.find((row) => row?.path === path) || null;
    }
    return data[0] || null;
  }
  return data || null;
};

/** Pull git.created from articles/search JSON (object or list payload). */
export const gitCreatedFromArticleSearch = (payload, path = '') => {
  const item = articleFromSearchPayload(payload, path);
  return item?.git?.created ? String(item.git.created) : '';
};

/** HTML body from articles/search JSON transformedContent (text/html). */
export const htmlFromArticleSearch = (payload, path = '') => {
  const item = articleFromSearchPayload(payload, path);
  const blocks = item?.transformedContent;
  if (!Array.isArray(blocks)) return '';
  const htmlBlock = blocks.find(
    (block) => isHTML(block?.contentType) && block?.raw,
  );
  return htmlBlock?.raw ? String(htmlBlock.raw) : '';
};

const withCreatedTimeMeta = (html, gitCreated) => {
  if (!gitCreated) return html;
  const dom = new jsdom.JSDOM(html);
  setMetadata(dom.window.document, 'created-time', gitCreated);
  return dom.serialize();
};

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
  const authHeaders = {
    headers: {
      ...(authorization && { authorization }),
    },
  };

  let gitCreated = '';
  let htmlFromJson = '';

  // Prefer one JSON fetch: HTML in transformedContent + git.created for schema.
  try {
    const docJsonResponse = await defaultExlClientv2.getArticleJsonByPath(
      path,
      lang,
      authHeaders,
    );
    if (docJsonResponse.ok) {
      const payload = await docJsonResponse.json();
      gitCreated = gitCreatedFromArticleSearch(payload, path);
      htmlFromJson = htmlFromArticleSearch(payload, path);
    }
  } catch (error) {
    aioLogger.warn(`Failed to fetch docs v2 article JSON: path=${path}`, error);
  }

  if (htmlFromJson) {
    const html = withCreatedTimeMeta(htmlFromJson, gitCreated);
    return {
      body: html,
      headers: {
        'Content-Type': 'text/html',
      },
      md: '',
      original: html,
    };
  }

  const docHtmlResponse = await defaultExlClientv2.getArticleHtmlByPath(
    path,
    lang,
    authHeaders,
  );

  if (!docHtmlResponse.ok) {
    const errorBody = await docHtmlResponse.text().catch(() => '');
    aioLogger.error(
      `Failed to fetch doc HTML: path=${path} lang=${lang} url=${docHtmlResponse.url} status=${docHtmlResponse.status} statusText=${docHtmlResponse.statusText} body=${errorBody}`,
    );
    return {
      statusCode: docHtmlResponse.status,
      error: new Error(
        `Failed to fetch doc HTML: ${docHtmlResponse.statusText}`,
      ),
    };
  }

  // Keep git.created from the JSON attempt when falling back to HTML Accept.
  const html = withCreatedTimeMeta(await docHtmlResponse.text(), gitCreated);
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
