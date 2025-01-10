import { createDefaultExlClient } from '../../modules/ExlClient.js';

// List of blocks and position of the tags inside blocks to translate.
const MAPPING_TO_TRANSLATE = [
  {
    name: 'browse-filters',
    tagsPosition: 2,
  },
];

// List of tags key mapping
const TAGS_LABEL_MAPPING = {
  'content-type': 'types',
  'experience-level': 'levels',
  feature: 'features',
  industry: 'industries',
  role: 'roles',
  solution: null,
  topic: 'topics',
};

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

/**
 * Translate the required tags in a block
 * (Update MAPPING_TO_TRANSLATE in tag-translation-utils.js
 * to add new tags for translation).
 * @param {HTMLAllCollection} document - The document object.
 * @param {string} lang - The language to translate to.
 * @summary This function adds a new div with the translated tags to the block.
 */
export const translateBlockTags = async (document, lang) => {
  await Promise.all(
    MAPPING_TO_TRANSLATE.map(async (blockDetails) => {
      const block = document.querySelector(`.${blockDetails.name}`);
      if (!block) return;

      const defaultExlClient = await createDefaultExlClient();
      const rawTags =
        block.children[blockDetails.tagsPosition].firstElementChild.textContent;

      // Wait for all tag translations to complete
      const translatedTags = await Promise.all(
        formattedTags(rawTags).map(async (rawTag) => {
          const values = rawTag.split('/').reverse();
          const tag = values.shift().trim();
          const key = `${values.pop().replace('exl:', '').trim()}`;
          const keyMapping = TAGS_LABEL_MAPPING[key];
          const solution = values.length ? values[0] : '';
          if (!keyMapping) return { solution, key, tag, result: tag };
          const result = await defaultExlClient.getLabelFromEndpoint(
            keyMapping,
            tag,
            lang,
          );
          return { solution, key, tag, result };
        }),
      );

      // Create the tags string in format : [ feature : tag_en : tag_translated : solution if present ]
      const tags = translatedTags
        .map((translatedTag) => {
          const { solution, key, tag, result } = translatedTag;
          return solution
            ? `${key}/${solution}/${tag}:${result}:`
            : `${key}/${tag}:${result}:`;
        })
        .join(',');

      // Create and append the translated tags container
      const tagsContainer = document.createElement('div');
      tagsContainer.innerHTML = `<div>${tags}</div>`;
      block.append(tagsContainer);
    }),
  );
};
