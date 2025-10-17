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
import { main as videosMain } from '../src/videos/index.js';
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
  IMS_CLIENT_ID,
  IMS_CLIENT_SECRET,
  IMS_AUTHORIZATION_CODE,
  IPASS_API_KEY,
  EXL_API_HOST,
  FEATURE_FLAGS,
  V2_PATHS,
  MPC_GITHUB_PAT,
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
  const { path, query, headers: reqHeaders } = req;

  let { authorization } = reqHeaders;
  if (!authorization && ACCESS_TOKEN) {
    authorization = `Bearer ${ACCESS_TOKEN}`;
  }

  const params = {
    ...query,
    __ow_headers: reqHeaders,
    aemAuthorUrl: AEM_AUTHOR_URL,
    aemOwner: OWNER,
    aemRepo: REPO,
    aemBranch: BRANCH,
    authorization,
    exlApiHost: EXL_API_HOST,
    featureFlags: FEATURE_FLAGS,
    v2Paths: V2_PATHS,
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
  res.status(statusCode || 200);
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
  const params = {
    __ow_path: path,
    __ow_headers: headers,
    khorosApiSecret: KHOROS_API_SECRET,
    imsOrigin: IMS_ORIGIN,
    imsClientId: IMS_CLIENT_ID,
    imsClientSecret: IMS_CLIENT_SECRET,
    imsAuthorizationCode: IMS_AUTHORIZATION_CODE,
    ipassApiKey: IPASS_API_KEY,
    khorosOrigin: KHOROS_ORIGIN,
    ...query,
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

const videosHandler = async (req, res) => {
  console.log('video id handler');
  const { path: originalPath, query } = req;
  const path = originalPath.replace('/videos', '');
  const lang = query.lang || 'en';
  const { videoId } = query;
  const params = {
    __ow_path: path,
    lang,
    videoId,
    mpcGithubToken: MPC_GITHUB_PAT,
  };

  const { body, statusCode } = await videosMain(params);
  res.status(statusCode || 200);
  res.send(body);
};

app.get('/khoros/**', khorosHandler);
app.get('/toc/**', tocHandler);
app.get('/videos', videosHandler);
app.get('/**', converterHandler);

app.listen(port, () =>
  console.log(`
  
  Converter: http://localhost:${port}/en/docs
  Khoros: http://localhost:${port}/khoros
  Toc: http://localhost:${port}/toc
  Videos: http://localhost:${port}/videos
`),
);
