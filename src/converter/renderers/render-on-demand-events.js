import { matchOnDemandEventPath } from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';

/**
 * Renders on demand event from filesystem at given path
 * @param {string} path - path to on demand event from 'src'
 * @param {string} parentFolderPath - path to parent folder of `on-demand-events`
 */
export default async function renderOnDemandEvent(path, authorization) {
  const {
    params: { lang, onDemandEventId },
  } = matchOnDemandEventPath(path);
  const defaultExlClientv2 = await createDefaultExlClientV2();
  const onDemandEventHtmlResponse =
    await defaultExlClientv2.getOnDemandEventById(onDemandEventId, lang, {
      headers: {
        ...(authorization && { authorization }),
      },
    });

  if (!onDemandEventHtmlResponse.ok) {
    return {
      statusCode: onDemandEventHtmlResponse.status,
      error: new Error(
        `Failed to fetch on demand event HTML: ${onDemandEventHtmlResponse.statusText}`,
      ),
    };
  }

  const html = await onDemandEventHtmlResponse.text();

  return {
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
  };
}
