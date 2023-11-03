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
import renderDoc from './renderers/render-doc.js';
import renderFragment from './renderers/render-fragment.js';
import renderAem from './renderers/render-aem.js';

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
    return renderDoc(path);
  }
  // Handle fragments as static content (eg: header, footer ...etc.)
  if (path.startsWith('/fragments')) {
    return renderFragment(path);
  }
  // Handle AEM UE Pages by default
  return renderAem(path, params);
};

export const main = async function main(params) {
  aioLogger.info({ params });
  // eslint-disable-next-line camelcase
  const { __ow_path, __ow_headers, aemAuthorUrl } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const authorization = __ow_headers?.authorization || '';
  const { html, error } = await render(path, { ...params, authorization });
  if (!error) {
    return {
      statusCode: 200,
      headers: {
        'x-html2md-img-src': aemAuthorUrl, // tells franklin services to index images starting with this and use auth with it.
      },
      body: html,
    };
  }

  return { statusCode: 404, body: error.message };
};
