import { createDefaultExlClient } from '../../modules/ExlClient.js';

// List of blocks and position of the tags inside blocks to translate.
const MAPPING_TO_TRANSLATE = [
  {
    name: 'browse-filters',
    tagsPosition: 2,
  },
];

// TODO: List of tags key mapping
// const TAGS_LABEL_MAPPING = {
//     "roles": "role",
//     "levels": "level",
//     "features": "feature",
//     "topics": "topic",
//     "solution": "solution",
// }

/**
 * formattedTags returns the array of base64 encoded tags after extracting from the tags selected in dialog
 * @param {string} inputString - The topics tag. E.g. exl:topic/QXBwIEJ1aWxkZXI=
 * @returns the topic tag. E.g. QXBwIEJ1aWxkZXI=
 */
function formattedTags(inputString) {
  const resultArray = [];
  const items = inputString.split(',');

  items.forEach((item) => {
    let base64EncodedTagsArray;
    let product;
    let version;

    const [type, productBase64, versionBase64] = item.split('/');
    if (productBase64) {
      product = atob(productBase64);
    }
    if (versionBase64) {
      version = atob(versionBase64);
    }

    // Check if product and version are not undefined before appending to base64EncodedTagsArray
    if (product || version) {
      base64EncodedTagsArray = `${type}${product ? `/${product}` : ''}${
        version ? `/${version}` : ''
      }`;
      resultArray.push(base64EncodedTagsArray);
    }
  });
  return resultArray;
}

export const translateBlockTags = async (document, lang) => {
  await Promise.all(
    MAPPING_TO_TRANSLATE.map(async (blockDetails) => {
      const block = document.querySelector(`.${blockDetails.name}`);
      if (!block) return;

      const defaultExlClient = await createDefaultExlClient();
      const rawTags =
        block.children[blockDetails.tagsPosition].firstElementChild.textContent;

      const translatedTagsPromises = formattedTags(rawTags).map(
        async (rawTag) => {
          const values = rawTag.split('/').reverse();
          const tag = values[0].trim();
          const key = `${values.pop().replace('exl:', '').trim()}s`; // Create a mapping for the key
          return defaultExlClient.getLabelFromEndpoint(key, tag, lang);
        },
      );

      // Wait for all tag translations to complete
      const translatedTags = await Promise.all(translatedTagsPromises);
      const tags = translatedTags.join(',');

      // Create and append the translated tags container
      const tagsContainer = document.createElement('div');
      tagsContainer.innerHTML = `<div>${tags}</div>`;
      block.append(tagsContainer);
    }),
  );
};
