import Logger from '@adobe/aio-lib-core-logging';
import { matchDocsPath } from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';

export const aioLogger = Logger('render-doc');

export default async function renderDoc(path, authorization) {
  const {
    params: { lang },
  } = matchDocsPath(path);
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
