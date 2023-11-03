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
import { render } from '../src/index.js';

const dotEnvFile = 'build/.local.env';
dotenv.config({ path: dotEnvFile });
const { AEM_AUTHOR_URL, OWNER, REPO, BRANCH, ACCESS_TOKEN } = process.env;

// show warning if any of the required variables for AEM are not set
const requireMember = (name, obj) => {
  if (!obj[name]) {
    console.warn(
      `[WARNING] ${name} variable not set in ${dotEnvFile}. AEM Pages will not work.`,
    );
  }
};
['AEM_AUTHOR_URL', 'OWNER', 'REPO', 'BRANCH', 'ACCESS_TOKEN'].forEach((name) =>
  requireMember(name, process.env),
);

const app = express();
const port = 3030;

const handler = async (req, res) => {
  const { path, query } = req;

  const params = {
    ...query,
    aemAuthorUrl: AEM_AUTHOR_URL,
    aemOwner: OWNER,
    aemRepo: REPO,
    aemBranch: BRANCH,
    authorization: `Bearer ${ACCESS_TOKEN}`,
  };

  const { html, md, original, error } = await render(path, params);
  if (error) {
    res.status(error.code || 503);
    res.send(error.message);
    return;
  }
  res.status(200);
  if (path.endsWith('.md')) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(md);
  } else if (path.endsWith('.original')) {
    res.send(original);
  } else {
    res.send(html);
  }
};

app.get('/**', handler);

app.listen(port, () => console.log(`Converter listening on port ${port}`));
