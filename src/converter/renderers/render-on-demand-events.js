import jsdom from 'jsdom';
import {
  matchOnDemandEventPath,
  matchAnyPathOrUnrestricted,
} from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';
import { getMetadata, setMetadata } from '../modules/utils/dom-utils.js';
import { paramMemoryStore } from '../modules/utils/param-memory-store.js';

export const matchEventsV2Path = (path) =>
  matchAnyPathOrUnrestricted(path, paramMemoryStore.get()?.eventsV2Paths);

export default async function renderOnDemandEvent(path, authorization) {
  const {
    params: { lang, onDemandEventId },
  } = matchOnDemandEventPath(path);

  if (!onDemandEventId) {
    return {
      error: new Error(`On-demand id is required but none was provided`),
    };
  }

  // Interim readiness gate: on-demand events have no V1 fallback, so this checks a path
  // allowlist before serving V2 content. Expected to be retired once a real
  // author-controlled visibility field is built and enforced (separate future ticket).
  if (!matchEventsV2Path(path)) {
    // Deliberately does not echo the request path into the client-facing message: the
    // response has no explicit Content-Type here, and reflecting unescaped user input into
    // a body that could be interpreted as HTML is a reflected-content vector (PR #794 review,
    // Matt Lawrence). The path is still visible in the platform's own activation/request logs.
    return {
      statusCode: 404,
      error: new Error('On-demand event not yet available at this path'),
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
  let transformedHtml = onDemandHtml;
  try {
    const dom = new jsdom.JSDOM(onDemandHtml);
    const { document } = dom.window;

    if (!getMetadata(document, 'coveo-content-type')) {
      setMetadata(document, 'coveo-content-type', 'Event');
    }
    if (!getMetadata(document, 'type')) {
      setMetadata(document, 'type', 'Event');
    }

    transformedHtml = dom.serialize();
  } catch (error) {
    return {
      error: new Error(`Failed to process DOM manipulation: ${error.message}`),
    };
  }

  return {
    body: transformedHtml,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: onDemandHtml,
  };
}
