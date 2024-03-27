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
import express from 'express';
import dotenv from 'dotenv';
import { render } from '../src/converter/index.js';
import { main as khorosMain } from '../src/khoros/index.js';
import { main as tocMain } from '../src/tocs/index.js';
import { ensureExpressEnv } from './ensure-env.js';

const dotEnvFile = 'build/.local.env';
dotenv.config({ path: dotEnvFile });
const {
  AEM_AUTHOR_URL,
  OWNER,
  REPO,
  BRANCH,
  ACCESS_TOKEN,
  KHOROS_ORIGIN,
  KHOROS_API_SECRET,
  IMS_ORIGIN,
} = process.env;

// https://stackoverflow.com/a/75916716
const isBase64 = (str) => {
  const base64RegExp =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
  return base64RegExp.test(str);
};

// ensure env variables are set
try {
  ensureExpressEnv();
} catch (e) {
  // this is used for local development, logging an error instead of throwing is sufficient
  // so devs can use this locally if they dont need working AEM pages.
  console.error(e.message);
}

const app = express();
const port = 3030;

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns
 */
const converterHandler = async (req, res) => {
  const { path, query } = req;

  const params = {
    ...query,
    aemAuthorUrl: AEM_AUTHOR_URL,
    aemOwner: OWNER,
    aemRepo: REPO,
    aemBranch: BRANCH,
    authorization: `Bearer ${ACCESS_TOKEN}`,
  };

  const { body, headers, md, original, error, statusCode } = await render(
    path,
    params,
  );

  if (error) {
    res.status(error.code || statusCode || 503);
    res.send(error);
    return;
  }
  // set headers as they are.
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(200);
  if (path.endsWith('.md')) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(md);
  } else if (path.endsWith('.original')) {
    res.send(original);
  } else if (isBase64(body)) {
    // action can return base64, in AIO this is handled automatically, but not in express, so we handle it here for local dev.
    res.send(Buffer.from(body, 'base64'));
  } else {
    res.send(body);
  }
};

const khorosHandler = async (req, res) => {
  const { path: originalPath, query, headers } = req;
  const path = originalPath.replace('/khoros', '');

  console.log({
    query,
  });

  const params = {
    __ow_path: path,
    __ow_headers: headers,
    khorosApiSecret: KHOROS_API_SECRET,
    imsOrigin: IMS_ORIGIN,
    khorosOrigin: KHOROS_ORIGIN,
  };

  const { body, statusCode } = await khorosMain(params);
  res.status(statusCode || 200);
  res.send(body);
};

const tocHandler = async (req, res) => {
  console.log('toc handler');
  const { path: originalPath, query } = req;
  const path = originalPath.replace('/toc', '');
  const lang = query.lang || 'en';
  const params = {
    __ow_path: path,
    lang,
  };

  const { body, statusCode } = await tocMain(params);
  res.status(statusCode || 200);
  res.send(body);
};

app.get('/khoros/**', khorosHandler);
app.get('/toc/**', tocHandler);
app.get('/**', converterHandler);

app.listen(port, () => console.log(`Converter listening on port ${port}`));
