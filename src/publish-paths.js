/* eslint-disable */

import { mappings } from './url-mapping.js';

const previewPath = async (
  path,
  helixSite = 'https://admin.hlx.page/preview/adobe-experience-league/exlm/main',
) => {
  const response = await fetch(`${helixSite}${path}`, {
    method: 'POST',
  });
  const json = await response.json();
  console.log(`published: ${json.preview.url}`);
};

mappings.forEach(async (mapping) => {
  await previewPath(mapping.path);
});
