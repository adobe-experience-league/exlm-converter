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

export const aioLogger = Logger('toc');

export const main = async function main() {
  const url = 'https://experienceleague-stage.adobe.com/api';
  const resp = await fetch(url, {
    headers: {
      Pragma:
        'akamai-x-cache-on, akamai-x-cache-remote-on, akamai-x-check-cacheable, akamai-x-get-cache-key, akamai-x-get-extracted-values, akamai-x-get-nonces, akamai-x-get-ssl-client-session-id, akamai-x-get-true-cache-key, akamai-x-serial-no',
    },
  });
  const text = await resp.text();
  console.log(`Response:`, JSON.stringify(resp));
  console.log(`Response:`, text);
  console.log(`Response: ${resp.status}`);
  console.log(`Response Headers:`, ...resp.headers);
  return {
    body: text,
    statusCode: resp.status,
  };
};
