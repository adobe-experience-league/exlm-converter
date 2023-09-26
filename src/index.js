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

function addExtensionIfNotExists(str, ext) {
  if (!str.endsWith(ext)) {
    return str + ext;
  }
  return str;
}

const parseDocsPath = (path) => {
  if (!path.startsWith("/")) {
    throw new Error("path must start with /");
  }
  const [, org, repo, branch, ...rest] = path.split("/");
  const fileName = rest[rest.length - 1];
  const folderPath = `/${rest.slice(0, -1).join("/")}`;
  return {
    org,
    repo,
    branch,
    fileName,
    folderPath,
  };
};

const getLastPart = (path) => {
  const parts = path.split("/");
  return parts[parts.length - 1];
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

export const main = async function main(params) {
  aioLogger.info({ params });
  const path = params.__ow_path ? params.__ow_path : "";
  const { html, error } = await render(path, { ...params });
  if (!error) {
    return {
      statusCode: 200,
      body: html,
    };
  }

  return { statusCode: 404, body: error.message };
}
