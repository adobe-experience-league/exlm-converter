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
/* eslint-disable import/no-relative-packages */
/* eslint-disable no-underscore-dangle */

import Logger from '@adobe/aio-lib-core-logging';
import md2html from './modules/ExlMd2Html.js';
import ExlClient from './modules/ExlClient.js';
import { mappings } from './url-mapping.js';
let aioLogger = Logger("App");


const exlClient = new ExlClient();
const renderDoc = async function renderDocs(path) {
  const id = lookupId(path);
  if (id) {
    // in today's ExL site, this ID is in the HTML as meta[name="id"], example:
    // this page: https://experienceleague.adobe.com/docs/experience-manager-cloud-service/content/overview/introduction.html?lang=en
    // has:  <meta name="id" content="recXh9qG5sL543CUD">
    // ExL API does not provide a way to lookup by path, so for now, we hard code it.
    const response = await exlClient.getArticle(id);
    const md = response.data.FullBody;
    const html = md2html(md);
    return { md, html };
  } else {
    return { error: new Error(`No ID found for path: ${path}, see the url-mapping file for a list of available paths`) };
  }
}

const removeExtension = (path) => {
  const parts = path.split(".");
  if (parts.length === 1) return parts[0];
  else {
    return parts.slice(0, -1).join(".");
  }
}

const lookupId = (path) => {
  const noExtension = removeExtension(path);
  const mapping = mappings.find((mapping) => {
    return mapping.path.trim() === noExtension.trim();
  });
  return mapping?.id;
}

export const render = async function render(path) {
  if (path.startsWith("/docs")) {
    return renderDoc(path);
  } else {
    // handle other things that are not docs
    return { error: new Error(`Path not supported: ${path}`) };
  }
}

export const main = async function main(params) {
  aioLogger.info({ params });
  const path = params.__ow_path ? params.__ow_path : "";
  const { html, error } = await render(path, { ...params });
  if (!error) {
    return {
      statusCode: 200,
      headers: {
        "x-html2md-img-src": "https://experienceleague.adobe.com",
      },
      body: html,
    };
  }

  return { statusCode: 404, body: error.message };
}
