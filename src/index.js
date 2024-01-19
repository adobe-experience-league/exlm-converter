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
import { dirname } from 'path';
import renderDoc from './renderers/render-doc.js';
import renderFragment from './renderers/render-fragment.js';
import renderAem from './renderers/render-aem.js';
import renderLanding from './renderers/render-landing.js';
import renderToc from './renderers/render-toc.js';

// need this to work with both esm and commonjs
let dir;
try {
  dir = __dirname; // if commonjs, this will get current directory
} catch (e) {
  dir = dirname(fileURLToPath(import.meta.url)); // if esm, this will get current directory
}

const aioLogger = Logger('App');

/**
 * @typedef {Object} Params
 * @property {string} __ow_path - path of the request
 * @property {Object} __ow_headers - headers of the request
 * @property {authorization} authorization - authorization header
 * @property {string} aemAuthorUrl - AEM Author URL
 * @property {string} aemOwner - AEM Owner
 * @property {string} aemRepo - AEM Repo
 * @property {string} aemBranch - AEM Branch
 */

/**
 *
 * @param {string} path
 * @param {Params} params
 * @returns
 */
export const render = async function render(path, params) {
  if (path.startsWith('/docs')) {
    if (path.split('/').length < 4) {
      // landing pages less than 4 parts (inclusive of empty first part from the leading slash)
      return renderLanding(path, dir);
    }
    return renderDoc(path);
  }
  // Handle fragments as static content (eg: header, footer ...etc.)
  // Regular expression pattern for toc.
  const tocPattern = /^\/fragments\/[a-zA-Z]+\/toc/;

  if (path.startsWith('/fragments')) {
    // Handle TOC
    if (tocPattern.test(path)) {
      return renderToc(path);
    }
    return renderFragment(path, dir);
  }
  // Handle AEM UE Pages by default
  return renderAem(path, params);
};

export const main = async function main(params) {
  aioLogger.info({ params });
  // eslint-disable-next-line camelcase
  const { __ow_path, __ow_headers } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const authorization = __ow_headers?.authorization || '';
  const { body, headers, statusCode, error } = await render(path, {
    ...params,
    authorization,
  });

  if (!error) {
    return {
      statusCode: statusCode || 200,
      headers,
      body,
    };
  }

  return { statusCode: 404, body: error.message };
};
