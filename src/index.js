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
import mappings from './url-mapping.js';
import { addExtension, removeExtension } from './modules/utils/path-utils.js';

// need this to work with both esm and commonjs
let dir;
try {
  dir = __dirname; // if commonjs, this will get current directory
} catch (e) {
  dir = dirname(fileURLToPath(import.meta.url)); // if esm, this will get current directory
}

const aioLogger = Logger('App');

const exlClient = new ExlClient();

/**
 * lookup the id of a document by path from the maintained list.
 * This is temporary.
 */
const lookupId = (path) => {
  const noExtension = removeExtension(path);
  const mapping = mappings.find(
    (map) => map.path.trim() === noExtension.trim(),
  );
  return mapping?.id;
};

/**
 * handles a markdown doc path
 */
const renderDoc = async function renderDocs(path) {
  const id = lookupId(path);
  if (id) {
    // in today's ExL site, this ID is in the HTML as meta[name="id"], example:
    // this page: https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/overview/introduction.html?lang=en
    // has:  <meta name="id" content="recXh9qG5sL543CUD">
    // ExL API does not provide a way to lookup by path, so for now, we hard code it.
    const response = await exlClient.getArticle(id);
    const md = response.data.FullBody;
    const meta = response.data.FullMeta;
    const { convertedHtml, originalHtml } = await md2html(md, meta);
    return {
      md,
      html: convertedHtml,
      original: originalHtml,
    };
  }
  return {
    error: new Error(
      `No ID found for path: ${path}, see the url-mapping file for a list of available paths`,
    ),
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

export const render = async function render(path) {
  if (path.startsWith('/docs')) {
    return renderDoc(path);
  }
  // Handle fragments as static content (eg: header, footer ...etc.)
  if (path.startsWith('/fragments')) {
    return renderFragment(path);
  }
  // error if all else fails
  return { error: new Error(`Path not supported: ${path}`) };
};

export const main = async function main(params) {
  aioLogger.info({ params });
  /* eslint-disable-next-line no-underscore-dangle */
  const path = params.__ow_path ? params.__ow_path : '';
  const { html, error } = await render(path, { ...params });
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
