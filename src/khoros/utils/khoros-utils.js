import Logger from '@adobe/aio-lib-core-logging';

export const aioLogger = Logger('khoros-utils');

export const PROFILE_MENU_LIST =
  '/plugins/custom/adobe/adobedx/profile-menu-list';

export const getProfileMenu = async ({
  khorosOrigin,
  // eslint-disable-next-line camelcase
  user_id,
  lang,
  khorosApiSecret,
}) => {
  // eslint-disable-next-line camelcase
  const khorosUrl = `${khorosOrigin}/${PROFILE_MENU_LIST}?user=${user_id}&lang=${lang}`;
  const response = await fetch(khorosUrl, {
    headers: {
      'x-api-secret': khorosApiSecret,
    },
  });
  const json = await response.json();
  return json;
};
