/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import Logger from '@adobe/aio-lib-core-logging';
import { JSDOM } from 'jsdom';
import { sendError } from '../common/utils/response-utils.js';
import handleUrls from '../common/utils/link-utils.js';
import { createDefaultExlClientV2 } from '../converter/modules/ExlClientV2.js';
import { paramMemoryStore } from '../converter/modules/utils/param-memory-store.js';

export const aioLogger = Logger('toc');

const rewriteRedirects = (html, lang) => {
  // rewrite redirects
  const dom = new JSDOM(html);
  const { document } = dom.window;
  handleUrls(document, lang);
  return document.body.innerHTML;
};

export const main = async function main(params) {
  // Set params in memory store so ExlClientV2 can access them
  paramMemoryStore.set(params);

  const {
    // eslint-disable-next-line camelcase
    __ow_path,
    lang = 'en',
    exlApiHost = 'https://experienceleague.adobe.com',
  } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';

  try {
    const url = `${exlApiHost}/api/tocs${path}?lang=${lang}&cachebust=${Date.now()}`;
    aioLogger.debug(`Fetching TOC from V1 API: ${url}`);
    const resp = await fetch(url, {
      headers: {
        Pragma:
          'akamai-x-cache-on, akamai-x-cache-remote-on, akamai-x-check-cacheable, akamai-x-get-cache-key, akamai-x-get-extracted-values, akamai-x-get-nonces, akamai-x-get-ssl-client-session-id, akamai-x-get-true-cache-key, akamai-x-serial-no',
      },
    });

    // Check if V1 API returned HTML
    let htmlFromV1 = null;
    if (resp.ok) {
      const json = await resp.json();
      aioLogger.debug(`V1 API response: ${JSON.stringify(json)}`);
      if (json?.data?.HTML) {
        htmlFromV1 = json.data.HTML;
        aioLogger.debug('V1 API returned HTML successfully');
      }
    } else {
      const responseText = await resp.text();
      aioLogger.debug(
        `V1 API failed with status ${resp.status}:`,
        responseText,
      );
    }

    // If V1 returned HTML, use it
    if (htmlFromV1) {
      return {
        body: {
          data: {
            HTML: rewriteRedirects(htmlFromV1, lang),
          },
        },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=7200',
        },
        statusCode: 200,
      };
    }

    // V1 API didn't return HTML (either failed or returned no HTML), try V2 API
    aioLogger.info('V1 API did not return HTML, falling back to V2 API');
    const tocId = path.replace(/^\//, '');
    const exlv2Client = await createDefaultExlClientV2();
    const v2Resp = await exlv2Client.getTocHtmlById(tocId, lang);

    if (v2Resp.ok) {
      // V2 API returns HTML directly (not JSON)
      const htmlContent = await v2Resp.text();
      aioLogger.debug(`V2 API returned HTML, length: ${htmlContent.length}`);

      if (htmlContent) {
        return {
          body: {
            data: {
              HTML: rewriteRedirects(htmlContent, lang),
            },
          },
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=7200',
          },
          statusCode: 200,
        };
      }
    } else {
      aioLogger.error(`V2 API failed: ${v2Resp.status} ${v2Resp.statusText}`);
    }
  } catch (e) {
    aioLogger.error('Error in TOC handler:', e);
    return sendError(500, `Internal Server Error: ${e.message}`);
  }

  return sendError(404, 'Not Found');
};
