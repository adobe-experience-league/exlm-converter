import { createExliaTaxonomyLabelResolver } from '../../modules/exlia-taxonomy-client.js';

// List of blocks and position of the tags inside blocks to translate.
const MAPPING_TO_TRANSLATE = [
  {
    name: 'browse-filters',
    tagsPositions: [2, 5, 6],
  },
];

const taxonomyUuidRegex =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

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
    if (!response.ok) {
      console.error(`getTaxonomy HTTP ${response.status} for ${uuid}`);
      return { prefLabel: null, displayLabel: null };
    }

    const body = await response.json();
    if (
      body?.success !== true ||
      !Array.isArray(body.data) ||
      body.data.length < 1
    ) {
      console.error(`getTaxonomy returned no labels for ${uuid}`);
      return { prefLabel: null, displayLabel: null };
    }

    return {
      prefLabel: body.data[0]?.prefLabel || null,
      displayLabel: body.data[0]?.displayLabel || null,
    };
  } catch (error) {
    console.error(`Failed to fetch taxonomy labels for ${uuid}`, error);
    return { prefLabel: null, displayLabel: null };
  }
}

/**
 * Resolve TQ UUIDs in Browse filter cells via exlia getTaxonomy.
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

      const enLabel = prefLabel || displayLabel;
      return `tq/${uuid}/${enLabel}:${displayLabel}`;
    }),
  );

  return parts.filter(Boolean).join(',');
}

/**
 * Adds a row containing translated TQ tags to Browse filter blocks.
 * @param {Document} document
 * @param {string} lang
 */
export const translateBlockTags = async (document, lang) => {
  const taxonomyResolver = await createExliaTaxonomyLabelResolver();
  await Promise.all(
    MAPPING_TO_TRANSLATE.map(async (blockDetails) => {
      const block = document.querySelector(`.${blockDetails.name}`);
      if (!block) return;

      const allTranslations = await Promise.all(
        blockDetails.tagsPositions.map(async (position) => {
          const tagElement = block.children[position]?.firstElementChild;
          if (!tagElement) return '';

          const rawTags = tagElement.textContent.trim();
          if (!rawTags) return '';

          if (!rawTags.startsWith('[') || !rawTags.includes('{')) return '';

          return translateTaxonomySegmentsInRawTags(
            rawTags,
            lang,
            taxonomyResolver,
          );
        }),
      );

      const allTags = allTranslations.filter(Boolean).join(',');
      if (allTags) {
        const outerDiv = document.createElement('div');
        const innerDiv = document.createElement('div');
        innerDiv.textContent = allTags;
        outerDiv.appendChild(innerDiv);
        block.appendChild(outerDiv);
      }
    }),
  );
};
