import { jwtDecode } from 'jwt-decode';
import Logger from '@adobe/aio-lib-core-logging';

export const aioLogger = Logger('khoros-ims-utils');

export const isValidImsToken = async (token) => {
  // eslint-disable-next-line camelcase
  const { client_id, type } = jwtDecode(token);
  // eslint-disable-next-line camelcase
  const validationUrl = `https://ims-na1.adobelogin.com/ims/validate_token/v1?client_id=${client_id}&type=${type}`;
  const response = await fetch(validationUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  try {
    const json = await response.json();
    return json?.valid || false;
  } catch (e) {
    aioLogger.error(e);
    return false;
  }
};
