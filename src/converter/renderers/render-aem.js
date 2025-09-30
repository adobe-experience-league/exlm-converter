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
  decodeCQMetadata,
  generateHash,
  createTranslatedMetadata,
} from './utils/aem-page-meta-utils.js';
import { getMetadata, setMetadata } from '../modules/utils/dom-utils.js';
import { writeStringToFileAndGetPresignedURL } from '../../common/utils/file-utils.js';
import FranklinServletClient from './utils/franklin-servlet-client.js';
import { translateBlockTags } from './utils/tag-translation-utils.js';
import hashQuizAnswers from './utils/hash-quiz-answers.js';

export const aioLogger = Logger('render-aem');

const byteSize = (str) => new Blob([str]).size;
const isLessThanOneMB = (str) => byteSize(str) < 1024 * 1024 - 1024; // -1024 for good measure :)

/**
 * Transforms page metadata
 */
async function transformAemPageMetadata(htmlString, params, path) {
  const dom = new jsdom.JSDOM(htmlString);
  const { document } = dom.window;

  const lang = path.split('/')[1];
  decodeCQMetadata(document, 'cq-tags');
  if (path.includes('/courses/') && !path.includes('/courses/instructors')) {
    updateTQTagsMetadata(document);
  } else {
    updateEncodedMetadata(document, 'role');
    updateEncodedMetadata(document, 'level');
    updateCoveoSolutionMetadata(document);
    await createTranslatedMetadata(document, lang);
  }

  const publishedTime = getMetadata(document, 'published-time');
  const lastUpdate = publishedTime ? new Date(publishedTime) : new Date();
  setMetadata(document, 'last-update', lastUpdate);

  if (
    path.includes('/perspectives/') &&
    !path.includes('/perspectives/authors')
  ) {
    const authorBioPages = getMetadata(document, 'author-bio-page');
    if (authorBioPages) {
      const authorBioUrls = Array.from(
        new Set(
          authorBioPages
            .split(',')
            .map((url) => url.trim())
            .filter((url) => url),
        ),
      );

      const promises = authorBioUrls.map(async (authorBioUrl) => {
        // eslint-disable-next-line no-use-before-define
        const { body } = await renderAem(authorBioUrl, params);
        return getAuthorBioData(body);
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
    const slug = path.split('/courses/')[1].split('/')[0];

    // Base course page only
    if (path.endsWith(`/courses/${slug}`)) {
      setMetadata(document, 'coveo-content-type', 'Course');
      setMetadata(document, 'type', 'Course');
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
    return sendError(401, 'Missing Authorization');
  }
  if (!aemAuthorUrl || !aemOwner || !aemRepo || !aemBranch) {
    return sendError(500, 'Missing AEM configuration');
  }

  let resp;
  try {
    const client = new FranklinServletClient(params);
    resp = await client.fetchFromServlet(path, sourceLocation);
  } catch (e) {
    aioLogger.error('Error fetching AEM content', e);
    return sendError(500, 'Internal Server Error');
  }

  if (!resp.ok) {
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
