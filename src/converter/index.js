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

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import renderDoc from './renderers/render-doc.js';
import renderFragment from './renderers/render-fragment.js';
import renderAem from './renderers/render-aem.js';
import renderLanding from './renderers/render-landing.js';
import {
  isCoursesPath,
  isDocsPath,
  isFragmentPath,
  isIoFile,
  isLandingPath,
  isOnDemandEventPath,
  isPlaylistsPath,
  isSlidesPath,
  isTocPath,
} from './modules/utils/path-match-utils.js';
import renderPlaylist from './renderers/render-playlist.js';
import { paramMemoryStore } from './modules/utils/param-memory-store.js';
import renderIoFile from './renderers/render-io-file.js';
import renderSlide from './renderers/render-slide.js';
import renderToc from './renderers/render-toc.js';
import renderOnDemandEvent from './renderers/render-on-demand-events.js';

// need this to work with both esm and commonjs
let dir;
try {
  dir = __dirname; // if commonjs, this will get current directory
} catch (e) {
  dir = dirname(fileURLToPath(import.meta.url)); // if esm, this will get current directory
}

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
  paramMemoryStore.set(params);

  // specifically return 404 for courses, untill they are migrated.
  if (isCoursesPath(path)) {
    return {
      statusCode: 404,
      headers: {},
      body: 'Courses are not supported at this time',
    };
  }

  if (isLandingPath(path)) {
    return renderLanding(path, params?.authorization);
  }

  if (isDocsPath(path)) {
    return renderDoc(path, params?.authorization);
  }

  if (isTocPath(path)) {
    return renderToc(path, params?.authorization);
  }

  if (isPlaylistsPath(path)) {
    return renderPlaylist(path, params?.authorization);
  }

  if (isSlidesPath(path)) {
    return renderSlide(path, params?.authorization);
  }

  if (isOnDemandEventPath(path)) {
    return renderOnDemandEvent(path, params?.authorization);
  }

  // Handle fragments as static content (eg: header, footer ...etc.)
  if (isFragmentPath(path)) {
    return renderFragment(path, dir);
  }

  if (isIoFile(path)) {
    return renderIoFile(path);
  }

  // Handle AEM UE Pages by default
  return renderAem(path, params);
};

export const main = async function main(params) {
  // eslint-disable-next-line camelcase
  const { __ow_path, __ow_headers, authorization: authorizationParam } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const authorization = __ow_headers?.authorization || authorizationParam || '';
  // eslint-disable-next-line camelcase
  const sourceLocation = __ow_headers?.['x-content-source-location'] || '';
  const { body, headers, statusCode, error } = await render(path, {
    ...params,
    authorization,
    sourceLocation,
  });

  if (!error) {
    return {
      statusCode: error?.code || statusCode || 200,
      headers,
      body,
    };
  }

  return { statusCode: statusCode || 404, body: error.message };
};
