import jsdom from 'jsdom';
import Logger from '@adobe/aio-lib-core-logging';
import { AioCoreSDKError } from '@adobe/aio-lib-core-errors';
import { isBinary, isHTML } from '../modules/utils/media-utils.js';
import renderAemAsset from './render-aem-asset.js';
import {
  isAbsoluteURL,
  relativeToAbsolute,
} from '../../common/utils/link-utils.js';
import {
  getAuthorBioData,
  updateEncodedMetadata,
  updateCoveoSolutionMetadata,
  updateTQTagsMetadata,
  createTranslatedV2TQMetadata,
  decodeCQMetadata,
  generateHash,
  createTranslatedMetadata,
  getModuleCount,
  getCourseDuration,
  getChildPageIds,
  updateLegacyAndV2Tags,
} from './utils/aem-page-meta-utils.js';
import { getMetadata, setMetadata } from '../modules/utils/dom-utils.js';
import { paramMemoryStore } from '../modules/utils/param-memory-store.js';
import { writeStringToFileAndGetPresignedURL } from '../../common/utils/file-utils.js';
import FranklinServletClient from './utils/franklin-servlet-client.js';
import { translateBlockTags } from './utils/tag-translation-utils.js';
import hashQuizAnswers from './utils/hash-quiz-answers.js';

export const aioLogger = Logger('render-aem');

const byteSize = (str) => new Blob([str]).size;
const isLessThanOneMB = (str) => byteSize(str) < 1024 * 1024 - 1024; // -1024 for good measure :)

// DEBUG: temporary author-metadata diagnostics. Revert after investigation.
const debugLog = (event, details) =>
  console.log(`[debug-author] ${event} ${JSON.stringify(details)}`);

// Strip query string/fragment so signed values are never logged.
const debugSafeUrl = (value) => {
  if (!value) return { value: '(none)' };
  const str = String(value);
  const cut = str.search(/[?#]/);
  return {
    value: cut === -1 ? str : str.substring(0, cut),
    hadQueryOrFragment: cut !== -1,
  };
};

const debugAuthScheme = (authorization) =>
  authorization ? String(authorization).split(' ')[0] : '(none)';

// Identifies which page AEM actually returned, without logging the whole body.
const debugSummarizeHtml = (html) => {
  if (typeof html !== 'string' || !html) return { empty: true };
  try {
    const { document } = new jsdom.JSDOM(html).window;
    const meta = (name) =>
      document.querySelector(`meta[name="${name}"]`)?.content ||
      document.querySelector(`meta[property="${name}"]`)?.content ||
      '';
    const authorBio = document.querySelector('.author-bio');
    const main = document.querySelector('main');
    return {
      length: html.length,
      title: document.title,
      canonical:
        document.querySelector('link[rel="canonical"]')?.href ||
        meta('canonical'),
      ogUrl: meta('og:url'),
      template: meta('template'),
      theme: meta('theme'),
      authorBioPageMeta: meta('author-bio-page'),
      bodyAueResource: document.body?.getAttribute('data-aue-resource') || '',
      mainAueResource: main?.getAttribute('data-aue-resource') || '',
      hasMain: Boolean(main),
      hasAuthorBio: Boolean(authorBio),
      authorBioRowCount: authorBio ? authorBio.children.length : 0,
      authorBioRows: authorBio
        ? [...authorBio.children].map((row) =>
            row.textContent.trim().replace(/\s+/g, ' ').substring(0, 80),
          )
        : [],
      blockClasses: [
        ...(main || document.body || document).querySelectorAll('div[class]'),
      ]
        .map((el) => el.className)
        .filter(Boolean)
        .slice(0, 15),
      bodyStart: (document.body?.innerHTML || html)
        .replace(/\s+/g, ' ')
        .substring(0, 600),
    };
  } catch (e) {
    return { parseError: e.message, start: html.substring(0, 300) };
  }
};

/**
 * Transforms page metadata
 */
async function transformAemPageMetadata(htmlString, params, path) {
  const dom = new jsdom.JSDOM(htmlString);
  const { document } = dom.window;

  const lang = path.split('/')[1];
  decodeCQMetadata(document, 'cq-tags');
  updateTQTagsMetadata(document);
  await createTranslatedV2TQMetadata(document, lang);
  updateEncodedMetadata(document, 'role');
  updateEncodedMetadata(document, 'level');
  updateCoveoSolutionMetadata(document);
  await createTranslatedMetadata(document, lang);

  // If usetq feature flag is on, rename legacy to _v1 tags and update legacy tags with _v2 tags
  if (paramMemoryStore.hasFeatureFlag('usetq')) {
    updateLegacyAndV2Tags(document);
  }

  // Fetch and set cq:translationMethod from jcr:content.json
  // Note: fetchJson uses 24-hour cache - fetches from cache if available, otherwise from API
  if (lang !== 'en') {
    try {
      const client = new FranklinServletClient(params);
      const json = await client.fetchPageJcrJson(path);
      const translationMap = {
        HUMAN_TRANSLATION: 'HT',
        MACHINE_TRANSLATION: 'MT',
        GENAI_TRANSLATION: 'MT',
      };

      const translationMethod =
        json?.['cq:translationMethod'] &&
        translationMap[json['cq:translationMethod']];

      if (translationMethod) {
        setMetadata(document, 'translation-mechanism', translationMethod);
      }
    } catch (error) {
      aioLogger.warn('Failed to fetch or set cq:translationMethod', error);
    }
  }

  const publishedTime = getMetadata(document, 'published-time');
  const contentModifiedTime = getMetadata(document, 'content-modified-time');

  const parseDate = (dateStr) =>
    dateStr?.endsWith('Z') ? new Date(dateStr) : new Date(`${dateStr}Z`);

  const lastUpdate = contentModifiedTime
    ? parseDate(contentModifiedTime)
    : parseDate(publishedTime);

  setMetadata(document, 'last-update', lastUpdate.toString());

  if (
    path.includes('/perspectives/') &&
    !path.includes('/perspectives/authors')
  ) {
    const authorBioPages = getMetadata(document, 'author-bio-page');
    // DEBUG: temporary marker to confirm this converter build produced the page
    setMetadata(document, 'debug-author-metadata', 'debug-author-metadata-v2');
    debugLog('article-context', {
      path,
      authorBioPages: authorBioPages || '(none)',
      sourceLocation: debugSafeUrl(params.sourceLocation),
      authScheme: debugAuthScheme(params.authorization),
      aemAuthorUrl: params.aemAuthorUrl,
      aemOwner: params.aemOwner,
      aemRepo: params.aemRepo,
      aemBranch: params.aemBranch,
      // eslint-disable-next-line no-underscore-dangle
      incomingHeaderNames: Object.keys(params.__ow_headers || {}).sort(),
      articleTitle: document.title,
      articleBodyAueResource:
        document.body?.getAttribute('data-aue-resource') || '',
    });
    if (authorBioPages) {
      const authorBioUrls = Array.from(
        new Set(
          authorBioPages
            .split(',')
            .map((url) => url.trim())
            .filter((url) => url),
        ),
      );

      // DEBUG: refetch the raw bio with/without the article's source-location
      // header and log what AEM returns, to pinpoint why extraction fails.
      const probeBio = async (authorBioUrl, label, sourceLocation) => {
        try {
          const client = new FranklinServletClient(params);
          const resp = await client.fetchFromServlet(
            authorBioUrl,
            sourceLocation,
          );
          const raw = await resp.text();
          let extracted;
          try {
            extracted = getAuthorBioData(raw);
          } catch (e) {
            extracted = { extractError: e.message };
          }
          debugLog('bio-probe', {
            authorBioUrl,
            probe: label,
            sentSourceLocation: debugSafeUrl(sourceLocation),
            status: resp.status,
            contentType: resp.headers.get('Content-Type'),
            responseHeaders: Object.fromEntries(
              [...resp.headers.entries()].filter(
                ([name]) => !/cookie|authorization/i.test(name),
              ),
            ),
            extracted,
            summary: debugSummarizeHtml(raw),
          });
        } catch (e) {
          aioLogger.error(
            `[debug-author] bio-probe ${label} threw for ${authorBioUrl}`,
            e,
          );
        }
      };

      const promises = authorBioUrls.map(async (authorBioUrl) => {
        // eslint-disable-next-line no-use-before-define
        const { body, statusCode, error } = await renderAem(
          authorBioUrl,
          params,
        );
        if (!body || error) {
          // DEBUG: fallback so the failure is visible in published metadata
          const reason = `status-${statusCode || error?.code || 'unknown'}`;
          aioLogger.error(
            `[debug-author] author bio fetch failed for ${authorBioUrl} (${reason})`,
            error?.message || '',
          );
          await probeBio(
            authorBioUrl,
            'raw-with-source-location',
            params.sourceLocation,
          );
          await probeBio(
            authorBioUrl,
            'raw-without-source-location',
            undefined,
          );
          return {
            authorName: `DEBUG-NO-AUTHOR-BIO-${reason}`,
            authorType: 'DEBUG-NO-AUTHOR-BIO',
          };
        }
        const bioData = getAuthorBioData(body);
        if (!bioData.authorName) {
          aioLogger.error(
            `[debug-author] no .author-bio data extracted from ${authorBioUrl} (status ${statusCode})`,
          );
          debugLog('bio-transformed-body', {
            authorBioUrl,
            statusCode,
            summary: debugSummarizeHtml(body),
          });
          await probeBio(
            authorBioUrl,
            'raw-with-source-location',
            params.sourceLocation,
          );
          await probeBio(
            authorBioUrl,
            'raw-without-source-location',
            undefined,
          );
          return {
            authorName: 'DEBUG-NO-AUTHOR-BIO-BLOCK',
            authorType: 'DEBUG-NO-AUTHOR-BIO',
          };
        }
        debugLog('bio-ok', {
          authorBioUrl,
          authorName: bioData.authorName,
          authorType: bioData.authorType,
          sourceLocation: debugSafeUrl(params.sourceLocation),
          title: debugSummarizeHtml(body).title,
        });
        return bioData;
      });

      const results = await Promise.all(promises);

      const authorNames = results
        .map((result) => result.authorName)
        .filter(Boolean);
      const authorTypes = results
        .map((result) => result.authorType)
        .filter(Boolean);

      if (authorNames.length > 0)
        setMetadata(document, 'author-name', authorNames.join(','));

      if (authorTypes.includes('External')) {
        setMetadata(document, 'author-type', 'External');
      } else if (authorTypes.length > 0) {
        setMetadata(document, 'author-type', authorTypes.join(','));
      }
    }
  }
  return dom.serialize();
}

/**
 * @param {string} htmlString
 */
async function transformHTML(htmlString, aemAuthorUrl, path) {
  // FIXME: Converting images from AEM to absolue path. Revert once product fix in place.
  const dom = new jsdom.JSDOM(htmlString);
  const { document } = dom.window;
  const images = document.querySelectorAll('img');
  images.forEach((el) => {
    const uri = el.getAttribute('src');
    if (!isAbsoluteURL(uri)) el.src = relativeToAbsolute(uri, aemAuthorUrl);
  });
  const metaTags = document.querySelectorAll('meta[name="image"]');
  metaTags.forEach((el) => {
    const uri = el.getAttribute('content');
    if (uri.startsWith('/') && !isAbsoluteURL(uri))
      el.setAttribute('content', relativeToAbsolute(uri, aemAuthorUrl));
  });
  // no indexing rule for author bio, templates, signup-flow-modal, nav and fragment pages
  const noIndexPaths = [
    '/authors/',
    '/templates/',
    '/signup-flow-modal',
    '/home-fragment',
    '/home/nav',
    '/global-fragments',
    '/event-fragment',
    '/instructors/',
    '/test-folder/',
    '/course-fragments',
  ];

  if (noIndexPaths.some((segment) => path.includes(segment))) {
    setMetadata(document, 'robots', 'NOINDEX, NOFOLLOW, NOARCHIVE, NOSNIPPET');
  }

  if (
    path.includes('/perspectives/') &&
    !path.includes('/perspectives/authors')
  ) {
    const pagePath = path.substring(path.indexOf('/perspectives/'));
    const perspectiveID = generateHash(pagePath);
    setMetadata(document, 'coveo-content-type', 'Perspective');
    setMetadata(document, 'type', 'Perspective');
    setMetadata(document, 'perspective-id', perspectiveID);
  }

  const lang = path.split('/')[1];
  await translateBlockTags(document, lang);

  if (
    path.includes('/courses/') &&
    !path.includes('/courses/instructors') &&
    !path.includes('/courses/course-fragments')
  ) {
    const segments = path.split('/courses/')[1].split('/').filter(Boolean);
    const [course, module, step] = segments;

    const courseID = generateHash(`/courses/${course}`);
    setMetadata(document, 'course-id', courseID);

    // Base course page only
    if (segments.length === 1) {
      setMetadata(document, 'coveo-content-type', 'Course');
      setMetadata(document, 'type', 'Course');

      const moduleCount = getModuleCount(document);
      if (moduleCount) {
        setMetadata(document, 'course-module-count', moduleCount);
      }

      const courseDuration = getCourseDuration(document);
      if (courseDuration) {
        setMetadata(document, 'course-duration', courseDuration);
      }

      const moduleIDs = getChildPageIds(document, [course]);
      if (moduleIDs.length) {
        setMetadata(document, 'module-ids', moduleIDs.join(','));
      }
    } else if (segments.length === 2) {
      // Module page
      const moduleID = generateHash(`/courses/${course}/${module}`);
      setMetadata(document, 'module-id', moduleID);

      const stepIDs = getChildPageIds(document, [course, module]);
      if (stepIDs.length) {
        setMetadata(document, 'step-ids', stepIDs.join(','));
      }
    } else if (segments.length >= 3) {
      // Step page
      const moduleID = generateHash(`/courses/${course}/${module}`);
      const stepID = generateHash(`/courses/${course}/${module}/${step}`);
      setMetadata(document, 'module-id', moduleID);
      setMetadata(document, 'step-id', stepID);
    }

    // Quiz check
    if (document.querySelector('div.quiz')) {
      await hashQuizAnswers(document, path);
    }
  }
  return dom.serialize();
}

function sendError(code, message) {
  return {
    statusCode: code,
    error: {
      code,
      message,
    },
  };
}

/**
 * Renders content from AEM UE pages
 */
export default async function renderAem(path, params) {
  const {
    aemAuthorUrl,
    aemOwner,
    aemRepo,
    aemBranch,
    authorization,
    sourceLocation,
  } = params;

  if (!authorization) {
    aioLogger.error(`[debug-author] Missing Authorization for ${path}`);
    return sendError(401, 'Missing Authorization');
  }
  if (!aemAuthorUrl || !aemOwner || !aemRepo || !aemBranch) {
    aioLogger.error(`[debug-author] Missing AEM configuration for ${path}`);
    return sendError(500, 'Missing AEM configuration');
  }

  let resp;
  try {
    const client = new FranklinServletClient(params);
    resp = await client.fetchFromServlet(path, sourceLocation);
  } catch (e) {
    aioLogger.error(`[debug-author] Error fetching AEM content for ${path}`, e);
    return sendError(500, 'Internal Server Error');
  }

  debugLog('aem-response', {
    path,
    requestUrl: `${aemAuthorUrl}/bin/franklin.delivery/${aemOwner}/${aemRepo}/${aemBranch}${path}`,
    status: resp.status,
    contentType: resp.headers.get('Content-Type'),
    sourceLocation: debugSafeUrl(sourceLocation),
    authScheme: debugAuthScheme(authorization),
  });

  if (!resp.ok) {
    aioLogger.error(`[debug-author] AEM returned ${resp.status} for ${path}`);
    return sendError(resp.status, 'Internal Server Error');
  }
  // note that this can contain charset, example 'text/html; charset=utf-8'
  const contentType = resp.headers.get('Content-Type');

  let body;
  let headers = { 'Content-Type': contentType };
  let statusCode = resp.status;
  if (isBinary(contentType)) {
    const { assetBody, assetHeaders, assetStatusCode } = await renderAemAsset(
      path,
      resp,
    );
    body = assetBody; // convert to base64 string, see: https://github.com/apache/openwhisk/blob/master/docs/webactions.md
    headers = { ...headers, ...assetHeaders };
    statusCode = assetStatusCode;
  } else if (isHTML(contentType)) {
    body = await transformHTML(await resp.text(), aemAuthorUrl, path);
    // Update page metadata for AEM Pages
    body = await transformAemPageMetadata(body, params, path);
    // add custom header `x-html2md-img-src` to let helix know to use authentication with images with that src domain
    headers = { ...headers, 'x-html2md-img-src': aemAuthorUrl };
  } else {
    body = await resp.text();
    if (!isLessThanOneMB(body)) {
      try {
        const location = await writeStringToFileAndGetPresignedURL({
          filePath: path,
          str: body,
        });
        body = '';
        headers = { ...headers, location };
        statusCode = 302;
      } catch (e) {
        if (e instanceof AioCoreSDKError) {
          body = `Error while serving this path: ${path}. See error logs.`;
          headers = { 'Content-Type': 'text/plain' };
          statusCode = 500;
          console.error(e);
        } else {
          throw e;
        }
      }
    }
  }

  // handle AEM response larger than 1MB, for example redirects json

  // passthrough the same content type from AEM.
  return { body, headers, statusCode };
}
