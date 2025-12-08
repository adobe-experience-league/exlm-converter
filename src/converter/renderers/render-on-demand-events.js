import jsdom from 'jsdom';
import { matchOnDemandEventPath } from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';
import { setMetadata } from '../modules/utils/dom-utils.js';

export default async function renderOnDemandEvent(path, authorization) {
  const {
    params: { lang, onDemandEventId },
  } = matchOnDemandEventPath(path);

  if (!onDemandEventId) {
    return {
      error: new Error(`On-demand id is required but none was provided`),
    };
  }

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

  const onDemandHtml = await onDemandEventHtmlResponse.text();

  const dom = new jsdom.JSDOM(onDemandHtml);
  const { document } = dom.window;
  setMetadata(document, 'coveo-content-type', 'Event');
  setMetadata(document, 'type', 'Event');
  const transformedHtml = dom.serialize();

  return {
    body: transformedHtml,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: onDemandHtml,
  };
}
