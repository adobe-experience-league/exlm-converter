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
  } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';

  try {
    const url = `https://experienceleague.adobe.com/api/tocs${path}?lang=${lang}&cachebust=${Date.now()}`;
    console.log(`Fetching TOC from ${url}`);
    const resp = await fetch(url, {
      headers: {
        Pragma:
          'akamai-x-cache-on, akamai-x-cache-remote-on, akamai-x-check-cacheable, akamai-x-get-cache-key, akamai-x-get-extracted-values, akamai-x-get-nonces, akamai-x-get-ssl-client-session-id, akamai-x-get-true-cache-key, akamai-x-serial-no',
      },
    });
    console.log(`Response: ${resp}`);
    console.log(`Response: ${resp.status}`);
    console.log(`Response Headers:`, ...resp.headers);
    if (resp.ok) {
      const json = await resp.json();
      console.log(`JSON: ${JSON.stringify(json)}`);
      // V1 API structure: json.data.HTML
      if (json?.data?.HTML) {
        return {
          body: {
            data: {
              ...json.data,
              HTML: rewriteRedirects(json.data.HTML, lang),
            },
          },
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=7200',
          },
          statusCode: 200,
        };
      }

      // V1 API didn't return data, try V2 API
      console.log('V1 API did not return HTML, falling back to V2 API');
      const tocId = path.replace(/^\//, '');
      const exlv2Client = await createDefaultExlClientV2();
      const v2Resp = await exlv2Client.getTocHtmlById(tocId, lang);

      if (v2Resp.ok) {
        const v2Json = await v2Resp.json();
        console.log(`V2 API response:`, JSON.stringify(v2Json));

        // V2 API structure: json.data.transformedContent[].raw
        if (v2Json?.data?.transformedContent) {
          const htmlContent = v2Json.data.transformedContent.find(
            (content) => content.contentType === 'text/html',
          )?.raw;

          if (htmlContent) {
            return {
              body: {
                data: {
                  ...v2Json.data,
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
        }
      } else {
        console.log(`V2 API failed: ${v2Resp.status} ${v2Resp.statusText}`);
      }
    } else {
      const responseText = await resp.text();
      console.log(`Response Text 2:`, responseText);
    }
  } catch (e) {
    return sendError(500, 'Internal Server Error');
  }

  return sendError(404, 'Not Found');
};
