import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('GenerateTagsClient');

const GENERATE_TAGS_PATH = '/api/v1/web/exlia/generateTags';

/**
 * Calls the IA exlmia generateTags endpoint.
 * @param {'perspectives'|'course'} contentType
 * @param {Object} payload - the full request body ({ perspective: {...} } or { course: {...} })
 * @param {string} exlmiaHost - base URL, e.g. https://51837-exlmia.adobeioruntime.net
 */
export async function callGenerateTags(contentType, payload, exlmiaHost) {
  if (!exlmiaHost) {
    aioLogger.warn('callGenerateTags: exlmiaHost not configured, skipping.');
    return null;
  }
  const url = `${exlmiaHost}${GENERATE_TAGS_PATH}?contentType=${contentType}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      aioLogger.warn(
        `generateTags [${contentType}]: non-JSON response (${response.status})`,
        text?.slice(0, 200),
      );
      return null;
    }
    if (json.success) {
      aioLogger.info(
        `generateTags [${contentType}]: success - ${json.message}`,
      );
      return json.response || null;
    }
    aioLogger.warn(`generateTags [${contentType}]: unexpected response`, json);
    return null;
  } catch (e) {
    aioLogger.error(`generateTags [${contentType}]: failed`, e);
    return null;
  }
}
