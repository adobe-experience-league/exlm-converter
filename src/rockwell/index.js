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
import { sendError } from '../common/utils/response-utils.js';
import { getDefaultImsService } from '../common/utils/ims/IMSService.js';
import {
  RockwellProxy,
  getDefaultRockwellProxy,
} from './utils/RockwellProxy.js';

export const aioLogger = Logger('Rockwell');
export const main = async function main(params) {
  const {
    // eslint-disable-next-line camelcase
    __ow_path,
    // eslint-disable-next-line camelcase
    __ow_headers,
    rockwellOrigin,
    rockwellClientId,
    rockwellClientSecret,
    imsOrigin,
  } = params;

  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  const imsToken = __ow_headers['x-ims-token'] || '';

  // check if request and env are valid
  if (!RockwellProxy.canHandle(path)) return sendError(404, 'Not Found');
  if (!rockwellClientSecret)
    return sendError(401, 'Missing Rockwell Client Secret Token');
  if (!rockwellOrigin) return sendError(500, 'Missing Config: Rockwell Origin');
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

  const rockwellProxy = getDefaultRockwellProxy({
    origin: rockwellOrigin,
    clientId: rockwellClientId,
    clientSecret: rockwellClientSecret,
  });

  function removeEmpty(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value != null),
    );
  }

  const rawParams = {
    email: params.email,
    modifiedBefore: params.modifiedBefore,
    modifiedAfter: params.modifiedAfter,
  };

  return rockwellProxy.proxyPath({
    path,
    params: removeEmpty(rawParams),
  });
};
