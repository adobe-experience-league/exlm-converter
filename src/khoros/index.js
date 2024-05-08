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
import { sendError } from '../common/utils/response-utils.js';
import { getDefaultImsService } from './utils/IMSService.js';
import { KhorosProxy, getDefaultKhorosProxy } from './utils/KhorosProxy.js';

export const aioLogger = Logger('khoros');
export const main = async function main(params) {
  const {
    // eslint-disable-next-line camelcase
    __ow_path,
    // eslint-disable-next-line camelcase
    __ow_headers,
    khorosApiSecret,
    khorosOrigin,
    imsOrigin,
    imsClientId,
    imsClientSecret,
    imsAuthorizationCode,
    ipassApiKey,
    lang = 'en',
  } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const imsToken = __ow_headers['x-ims-token'] || '';

  const khorosProxy = getDefaultKhorosProxy({
    khorosOrigin,
    khorosApiSecret,
  });

  // check if request and env are valid
  if (!KhorosProxy.canHandle(path)) return sendError(404, 'Not Found');
  if (!khorosApiSecret) return sendError(401, 'Missing Khoros Token');
  if (!khorosOrigin) return sendError(500, 'Missing Config: Khoros Origin');
  if (!imsOrigin) return sendError(500, 'Missing Config: IMS Origin');
  if (!imsToken) return sendError(401, 'Missing IMS Token');

  const shouldUseIpass =
    imsClientId && imsClientSecret && imsAuthorizationCode && ipassApiKey;

  const imsService = getDefaultImsService({
    imsOrigin,
    clientId: imsClientId,
    clientSecret: imsClientSecret,
    authorizationCode: imsAuthorizationCode,
  });

  // validate provided ims token
  const isValidToken = await imsService.isValidImsToken(imsToken);
  if (!isValidToken) {
    return sendError(401, 'Invalid IMS Token');
  }

  const additionalHeaders = {};
  // get access token if we should use ipass
  if (shouldUseIpass) {
    const token = await imsService.getAccessToken();
    additionalHeaders.Authorization = `${token}`;
    additionalHeaders.api_key = ipassApiKey;
  }

  // eslint-disable-next-line camelcase
  const { user_id } = jwtDecode(imsToken);

  return khorosProxy.proxyPath({
    path,
    pathPrefix: shouldUseIpass ? '' : '/plugins/custom/adobe/adobedx',
    // eslint-disable-next-line camelcase
    params: { user: user_id, lang },
    additionalHeaders,
  });
};
