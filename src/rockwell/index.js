import Logger from '@adobe/aio-lib-core-logging';
import { getDefaultRockwellProxy } from './utils/RockwellProxy.js';

export const aioLogger = Logger('Rockwell');

export const main = async function main(params) {
  const {
    // eslint-disable-next-line camelcase
    __ow_path,
    // eslint-disable-next-line camelcase
    // __ow_headers,
    rockwellOrigin,
    rockwellClientId,
    rockwellClientSecret,
  } = params;

  // eslint-disable-next-line camelcase
  const path = __ow_path || '';
  // eslint-disable-next-line camelcase
  // const imsToken = __ow_headers['x-ims-token'] || '';

  const rockwellProxy = getDefaultRockwellProxy({
    origin: rockwellOrigin,
    clientId: rockwellClientId,
    clientSecret: rockwellClientSecret,
  });

  return rockwellProxy.proxyPath({
    path,
    params: {
      modifiedBefore: '2024-01-01 00:00:00',
    },
  });
};
