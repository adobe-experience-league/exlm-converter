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
import { fileURLToPath } from 'url';
import fs from 'fs';
import { join, dirname } from 'path';
import md2html from './modules/ExlMd2Html.js';
import ExlClient from './modules/ExlClient.js';
import { addExtension, removeExtension } from './modules/utils/path-utils.js';
import isBinary from './modules/utils/media-utils.js';
import aemConfig from './aem-config.js';

// need this to work with both esm and commonjs
let dir;
try {
  dir = __dirname; // if commonjs, this will get current directory
} catch (e) {
  dir = dirname(fileURLToPath(import.meta.url)); // if esm, this will get current directory
}

const aioLogger = Logger('App');

const exlClient = new ExlClient({
  domain: 'https://experienceleague.adobe.com',
});

/**
 * handles a markdown doc path
 */
const renderDoc = async function renderDocs(path) {
  const response = await exlClient.getArticleByPath(removeExtension(path));
  if (response.data.length > 0) {
    const md = response.data[0].FullBody;
    const meta = response.data[0].FullMeta;
    const { convertedHtml, originalHtml } = await md2html(md, meta);
    return {
      md,
      html: convertedHtml,
      original: originalHtml,
    };
  }
  return {
    error: new Error(`No Page found for: ${path}`),
  };
};

/**
 * Renders fragment from filesystem at given path
 */
const renderFragment = async (path) => {
  if (path) {
    const fragmentPath = join(dir, addExtension(path, '.html'));
    // Get header and footer static content from Github
    if (fs.existsSync(fragmentPath)) {
      return {
        html: fs.readFileSync(fragmentPath, 'utf-8'),
      };
    }
    return {
      error: new Error(`Fragment: ${path} not found`),
    };
  }
  return {
    error: new Error(`Fragment: ${path} not found`),
  };
};

/**
 * Renders content from AEM UE pages
 */
const renderContent = async (path, params) => {
  const { authorization } = params;

  /**
   * FIXME: Page extension to be handled dynamically. Revisit this implementation and identify a proper
   * fix.
   * */

  const aemURL = `${aemConfig.aemEnv}${path}.html?wcmmode=disabled`;
  // console.log(aemURL);
  const url = new URL(aemURL);

  const fetchHeaders = { 'cache-control': 'no-cache' };
  if (authorization) {
    fetchHeaders.authorization = authorization;
  }

  const resp = await fetch(url, { headers: fetchHeaders });

  if (!resp.ok) {
    return { error: { code: resp.status, message: resp.statusText } };
  }

  let contentType = resp.headers.get('content-type') || 'text/html';
  [contentType] = contentType.split(';');

  const respHeaders = {
    'content-type': contentType,
  };

  if (isBinary(contentType)) {
    const data = Buffer.from(await resp.arrayBuffer());
    return { data, respHeaders };
  }

  const html = await resp.text();
  // console.log(html);
  return { html };
};

export const render = async function render(path) {
  if (path.startsWith('/docs')) {
    return renderDoc(path);
  }
  // Handle fragments as static content (eg: header, footer ...etc.)
  if (path.startsWith('/fragments')) {
    return renderFragment(path);
  }
  // Handle AEM UE Pages
  if (path.startsWith('/content')) {
    return renderContent(path);
  }
  // error if all else fails
  return { error: new Error(`Path not supported: ${path}`) };
};

export const main = async function main(params) {
  aioLogger.info({ params });
  /* eslint-disable-next-line no-underscore-dangle */
  const path = params.__ow_path ? params.__ow_path : '';
  /* eslint-disable-next-line no-underscore-dangle */
  const authorization = params.__ow_headers
    ? params.__ow_headers.authorization
    : '';
  const { html, error } = await render(path, { ...params, authorization });
  if (!error) {
    return {
      statusCode: 200,
      headers: {
        'x-html2md-img-src': 'https://experienceleague.adobe.com', // tells franklin services to index images starting with this
      },
      body: html,
    };
  }

  return { statusCode: 404, body: error.message };
};
