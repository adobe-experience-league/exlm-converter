import { createDefaultExlClient } from '../../modules/ExlClient.js';
import { createExliaTaxonomyLabelResolver } from '../../modules/exlia-taxonomy-client.js';

// List of blocks and position of the tags inside blocks to translate.
const MAPPING_TO_TRANSLATE = [
  {
    name: 'browse-filters',
    tagsPositions: [2, 5, 6],
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

const taxonomyUuidRegex =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

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
 * Fetch taxonomy data directly from API to get both prefLabel and displayLabel
 * @param {string} uuid
 * @param {string} lang
 * @param {string} baseUrl
 * @returns {Promise<{prefLabel: string|null, displayLabel: string|null}>}
 */
async function fetchTaxonomyLabels(uuid, lang, baseUrl) {
  try {
    const url = new URL(`${baseUrl}/getTaxonomy`);
    url.searchParams.set('uri', uuid);
    url.searchParams.set('lang', lang);

    const response = await fetch(url.toString());
    if (!response.ok) return { prefLabel: null, displayLabel: null };

    const body = await response.json();
    if (
      body?.success !== true ||
      !Array.isArray(body.data) ||
      body.data.length < 1
    ) {
      return { prefLabel: null, displayLabel: null };
    }

    return {
      prefLabel: body.data[0]?.prefLabel || null,
      displayLabel: body.data[0]?.displayLabel || null,
    };
  } catch {
    return { prefLabel: null, displayLabel: null };
  }
}

/**
 * Browse-filters / author dialog may include bare TQ UUIDs or unified_taxonomy URLs in the tag cell.
 * Resolve them via exlia getTaxonomy (parallel to legacy ExL tag translation).
 * @param {string} rawTags
 * @param {string} lang
 * @param {Awaited<ReturnType<typeof createExliaTaxonomyLabelResolver>>} resolver
 * @returns {Promise<string>}
 */
async function translateTaxonomySegmentsInRawTags(rawTags, lang, resolver) {
  if (
    !rawTags ||
    !lang ||
    lang.toLowerCase() === 'en' ||
    !resolver.isEnabled()
  ) {
    return '';
  }

  const uuids = new Set(
    [...rawTags.matchAll(taxonomyUuidRegex)].map((m) => m[1].toLowerCase()),
  );

  if (uuids.size === 0) return '';

  // Get base URL from params
  const { paramMemoryStore } = await import(
    '../../modules/utils/param-memory-store.js'
  );
  const params = paramMemoryStore.get();
  const baseUrl = params?.exliaTaxonomyBaseUrl?.replace(/\/$/, '') || '';

  if (!baseUrl) return '';

  const parts = await Promise.all(
    [...uuids].map(async (uuid) => {
      const { prefLabel, displayLabel } = await fetchTaxonomyLabels(
        uuid,
        lang,
        baseUrl,
      );
      if (!displayLabel) return null;

      // Use prefLabel for English, displayLabel for translated
      const enLabel = prefLabel || displayLabel;
      return `tq/${uuid}/${enLabel}:${displayLabel}`;
    }),
  );

  return parts.filter(Boolean).join(',');
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
  const defaultExlClient = await createDefaultExlClient();
  const taxonomyResolver = await createExliaTaxonomyLabelResolver();
  await Promise.all(
    MAPPING_TO_TRANSLATE.map(async (blockDetails) => {
      const block = document.querySelector(`.${blockDetails.name}`);
      if (!block) return;

      // Collect translations from all positions first
      const allTranslations = await Promise.all(
        blockDetails.tagsPositions.map(async (position) => {
          const tagElement = block.children[position]?.firstElementChild;
          if (!tagElement) return '';

          const rawTags = tagElement.textContent.trim();
          if (!rawTags) return '';

          let legacyTags = '';
          let taxonomyTags = '';

          // Check if rawTags is in JSON format [{uri:'', label:''}]
          if (rawTags.startsWith('[') && rawTags.includes('{')) {
            // TQ format - translate via taxonomy resolver
            taxonomyTags = await translateTaxonomySegmentsInRawTags(
              rawTags,
              lang,
              taxonomyResolver,
            );
          }

          if (rawTags.includes('exl:')) {
            // Legacy ExL format - translate via ExL client
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

            legacyTags = translatedTags
              .map((translatedTag) => {
                const { solution, key, tag, result } = translatedTag;
                return solution
                  ? `${key}/${solution}/${tag}:${result}`
                  : `${key}/${tag}:${result}`;
              })
              .join(',');

            // Also check for any taxonomy UUIDs in legacy format
            const additionalTaxonomyTags =
              await translateTaxonomySegmentsInRawTags(
                rawTags,
                lang,
                taxonomyResolver,
              );
            if (additionalTaxonomyTags) {
              taxonomyTags = additionalTaxonomyTags;
            }
          }

          return [legacyTags, taxonomyTags].filter(Boolean).join(',');
        }),
      );

      // Combine all translations from all positions into a single div
      const allTags = allTranslations.filter(Boolean).join(',');
      if (allTags) {
        const tagsContainer = document.createElement('div');
        tagsContainer.textContent = allTags;
        block.append(tagsContainer);
      }
    }),
  );
};
