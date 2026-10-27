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
import { getDefaultGainsightOAuth2Service } from './utils/GainsightOAuth2Service.js';
import {
  GainsightProxy,
  getDefaultGainsightProxy,
} from './utils/GainsightProxy.js';

export const aioLogger = Logger('gainsight');
export const main = async function main(params) {
  const {
    // eslint-disable-next-line camelcase
    __ow_path,
    // eslint-disable-next-line camelcase
    __ow_headers,
    imsOrigin,
    gainsightApiUrl,
    gainsightOAuth2ClientId,
    gainsightOAuth2ClientSecret,
    gainsightOAuth2Scope,
    gainsightCommunityUrl,
  } = params;
  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const imsToken = __ow_headers['x-ims-token'] || '';

  const pathWithoutQuery = path.split('?')[0];

  // Basic validation
  if (!GainsightProxy.canHandle(pathWithoutQuery)) {
    return sendError(404, 'Not Found');
  }
  if (!imsOrigin) return sendError(500, 'Missing Config: IMS Origin');
  if (!imsToken) return sendError(401, 'Missing IMS Token');

  const imsService = getDefaultImsService({
    imsOrigin,
  });

  // validate provided ims token
  const isValidToken = await imsService.isValidImsToken(imsToken);
  if (!isValidToken) {
    return sendError(401, 'Invalid IMS Token');
  }

  // Extract user_id from JWT token
  // eslint-disable-next-line camelcase
  const decodedToken = jwtDecode(imsToken);
  // eslint-disable-next-line camelcase
  const { user_id: userId } = decodedToken;

  if (!gainsightApiUrl) {
    return sendError(500, 'Missing Config: Gainsight API URL');
  }
  if (!gainsightOAuth2ClientId) {
    return sendError(500, 'Missing Config: Gainsight OAuth2 Client ID');
  }
  if (!gainsightOAuth2ClientSecret) {
    return sendError(500, 'Missing Config: Gainsight OAuth2 Client Secret');
  }
  if (!gainsightCommunityUrl) {
    return sendError(500, 'Missing Config: Gainsight Community URL');
  }

  const gainsightOAuth2Service = getDefaultGainsightOAuth2Service({
    apiUrl: gainsightApiUrl,
    clientId: gainsightOAuth2ClientId,
    clientSecret: gainsightOAuth2ClientSecret,
    scope: gainsightOAuth2Scope || 'read',
  });

  const gainsightProxy = getDefaultGainsightProxy({
    gainsightApiUrl,
    gainsightCommunityUrl,
    oauth2Service: gainsightOAuth2Service,
  });

  return gainsightProxy.proxyPath({
    path: pathWithoutQuery,
    userId,
    additionalHeaders: {},
  });
};
