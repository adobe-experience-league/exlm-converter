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
import { jwtDecode } from 'jwt-decode';
import { isValidImsToken } from './utils/ims-utils.js';
import { PROFILE_MENU_LIST, getProfileMenu } from './utils/khoros-utils.js';
import { sendError } from '../common/utils/response-utils.js';

export const aioLogger = Logger('khoros');

export const main = async function main(params) {
  const {
    // eslint-disable-next-line camelcase
    __ow_path,
    // eslint-disable-next-line camelcase
    __ow_headers,
    khorosApiSecret,
    khorosOrigin,
    lang = 'en',
  } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const imsToken = __ow_headers['x-ims-token'] || '';

  if (path !== PROFILE_MENU_LIST) {
    return sendError(404, 'Not Found');
  }
  if (!khorosApiSecret) {
    return sendError(401, 'Missing Khoros Token');
  }
  if (!khorosOrigin) {
    return sendError(500, 'Missing Configuration');
  }
  if (!imsToken) {
    return sendError(401, 'Missing IMS Token');
  }

  const isValidToken = await isValidImsToken(imsToken);

  if (!isValidToken) {
    return sendError(401, 'Invalid IMS Token');
  }

  if (path === PROFILE_MENU_LIST) {
    // eslint-disable-next-line camelcase
    const { user_id } = jwtDecode(imsToken);

    try {
      // eslint-disable-next-line camelcase
      const body = await getProfileMenu({
        khorosOrigin,
        // eslint-disable-next-line camelcase
        user_id,
        lang,
        khorosApiSecret,
      });
      return {
        body,
        headers: {
          'Content-Type': 'application/json',
        },
        statusCode: 200,
      };
    } catch (e) {
      return sendError(500, 'Internal Server Error');
    }
  }

  return sendError(404, 'Not Found');
};
