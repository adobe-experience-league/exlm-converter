import jsdom from 'jsdom';
import crypto from 'crypto';
import { getMetadata, setMetadata } from '../../modules/utils/dom-utils.js';
import {
  createDefaultExlClient,
  EXL_LABEL_ENDPOINTS,
} from '../../modules/ExlClient.js';

/**
 * Generates a unique immutable hash for a given input string and truncates it under 50 characters.
 */
export function generateHash(input) {
  return Object.freeze(
    crypto.createHash('sha256').update(input).digest('hex').substring(0, 49),
  );
}

/**
 * Formats aem tagpicker data
 */
export function formatPageMetaTags(inputString) {
  return inputString
    .replace(/exl:[^/]*\/*/g, '')
    .split(',')
    .map((part) => part.trim());
}

/**
 * Decodes base64 strings
 */
export function decodeBase64(encodedString) {
  return Buffer.from(encodedString, 'base64').toString('utf-8');
}

/**
 * @typedef {Object} AuthorBioData
 * @property {string} authorName
 * @property {string} authorType
 */

/**
 *
 * @param {string} authorBioHtml author bio html
 * @returns {AuthorBioData}
 */
export function getAuthorBioData(authorBioHtml) {
  const {
    window: { document },
  } = new jsdom.JSDOM(authorBioHtml);
  const authorBioDiv = document.querySelector('.author-bio');
  const getNthRowText = (n) =>
    authorBioDiv.querySelector(`div:nth-child(${n})`).textContent.trim();
  if (authorBioDiv) {
    const authorName = getNthRowText(2);
    const authorType = getNthRowText(4);
    return { authorName, authorType };
  }
  return {};
}

/**
 * Decode and update metadata
 * @param {Document} document
 * @param {string} metaName
 * @returns
 */
export function updateEncodedMetadata(document, metaName) {
  const metaValues = getMetadata(document, metaName);
  if (!metaValues || metaValues.length === 0) return;
  const formattedMetaValues = formatPageMetaTags(metaValues);
  const decodedMetaValues = formattedMetaValues.map((m) => decodeBase64(m));
  setMetadata(document, metaName, decodedMetaValues);
}

/**
 * Decode cq-meta metadata in AEM Page properties
 * @param {Document} document
 * @param {string} metaName
 * @returns
 */
export function decodeCQMetadata(document, metaName) {
  const metaValues = getMetadata(document, metaName);
  if (!metaValues || metaValues.length === 0) return;
  const decodedCQTags = metaValues.split(', ').map((segment) => {
    const parts = segment.split('/');
    return parts
      .map((part, index) => (index > 0 ? decodeBase64(part) : part))
      .join('/');
  });
  setMetadata(document, metaName, decodedCQTags.join(', '));
}

// HTML entity decoder utility
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str;

  const { JSDOM } = jsdom;
  const dom = new JSDOM();
  const textarea = dom.window.document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

/**
 * Update TQ Tags metadata
 * @param {Document} document
 */
export function updateTQTagsMetadata(document) {
  const keysToUpdate = [
    'tq-role',
    'tq-level',
    'tq-products',
    'tq-features',
    'tq-industries',
    'tq-topics',
  ];

  keysToUpdate.forEach((key) => {
    const metaTag = getMetadata(document, key);
    if (!metaTag) return;

    try {
      const decoded = decodeHtmlEntities(metaTag);

      const parsed = JSON.parse(decoded);

      if (Array.isArray(parsed)) {
        const labels = parsed
          .map((item) => item.label)
          .filter(Boolean)
          .join(', ');
        if (labels) {
          setMetadata(document, `${key}-labels`, labels);
        }
      }
    } catch (e) {
      console.error(`Failed to parse metadata for ${key}:`, e);
    }
  });
}

/**
 * Update Coveo Solution metadata
 * @param {Document} document
 */
export function updateCoveoSolutionMetadata(document) {
  const coveoSolutionMeta = getMetadata(document, 'coveo-solution');
  const featureMeta = getMetadata(document, 'feature');

  const decodeAEMTagValues = (values) =>
    values
      .map((val) => val.split('/'))
      .map((parts) => parts.map((part) => decodeBase64(part.trim())));

  let coveoSolution = '';
  if (coveoSolutionMeta) {
    const solutions = formatPageMetaTags(coveoSolutionMeta);
    // Decode and split each solution into parts
    const decodedSolutions = decodeAEMTagValues(solutions);

    // Transform the solutions to coveo compatible format
    const transformedSolutions = decodedSolutions.map((parts) => {
      if (parts.length > 1) {
        const solution = parts[0];
        const subSolution = parts[1];
        return `${solution}|${solution} ${subSolution}`;
      }
      return parts[0];
    });

    coveoSolution = transformedSolutions.join(';');
    setMetadata(document, 'coveo-solution', coveoSolution);

    // Adding version meta tag
    decodedSolutions.forEach((parts) => {
      if (parts.length > 1) {
        const version = parts[parts.length - 1];
        setMetadata(document, 'version', version);
      }
    });
  }

  if (featureMeta) {
    const features = formatPageMetaTags(featureMeta);
    // Decode and split each feature into parts
    const decodedFeatures = decodeAEMTagValues(features);

    // Flatten the decoded features and join them with '|'
    const flattenedDecodedFeatures = decodedFeatures
      .map((parts) => parts.join('|'))
      .join(',');

    setMetadata(document, 'feature-solution', flattenedDecodedFeatures);

    // Transform the features to coveo compatible format
    const transformedFeatures = decodedFeatures
      .map((parts) => {
        if (parts.length > 1) {
          const feature = parts[1];
          if (!coveoSolution.includes(parts[0])) {
            coveoSolution += (coveoSolution ? ';' : '') + parts[0];
            setMetadata(document, 'coveo-solution', coveoSolution);
          }
          return `${feature}`;
        }
        // Append parts[0] to coveo-solution if it exists
        if (parts[0] && !coveoSolution.includes(parts[0])) {
          coveoSolution += (coveoSolution ? ';' : '') + parts[0];
          setMetadata(document, 'coveo-solution', coveoSolution);
        }
        return '';
      })
      .filter(Boolean);
    const coveoFeature = transformedFeatures.join(',');
    setMetadata(document, 'feature', coveoFeature);
  }
  // Add "solution" meta tag
  if (coveoSolution) {
    const solutionParts = coveoSolution.split(';');
    const solutionsMeta = solutionParts.map((part) =>
      part.includes('|') ? part.split('|')[1] : part,
    );
    setMetadata(document, 'solution', solutionsMeta.join(','));
    setMetadata(document, 'original-solution', solutionsMeta.join(', '));
  }
}

/**
 * Utility function to map meta tags to titles based on a taxonomy data set.
 *
 * @param {string} meta
 * @param {Array} taxonomyData
 * @returns {string[]}
 */
export const mapTagsToTitles = (meta, taxonomyData) => {
  let locTitles = [];
  if (!meta?.length) return [];
  if (!Array.isArray(taxonomyData) || !taxonomyData?.length) {
    return [];
  }

  const tags = meta.split(',').map((tag) => tag.trim());
  locTitles = tags
    .map((tag) => {
      const match = taxonomyData.find((item) => item.tag.trim() === tag);
      return match ? match.title : null;
    })
    .filter(Boolean);

  if (locTitles.length) {
    locTitles = locTitles.join(', ');
  }
  return locTitles;
};

/**
 * Creates translated metadata for role, level, and feature meta types.
 *
 * @param {Document} document
 * @param {string} lang
 * @returns {Promise<void>} A promise that resolves once all metadata is updated.
 */
export const createTranslatedMetadata = async (document, lang) => {
  const defaultExlClient = await createDefaultExlClient();

  const metaTypes = {
    roles: 'role',
    levels: 'level',
    features: 'feature',
  };

  await Promise.all(
    Object.keys(metaTypes).map(async (key) => {
      const metaType = metaTypes[key];
      const metaContent = getMetadata(document, metaType);

      if (metaContent) {
        const tags = metaContent.split(',').map((tag) => tag.trim());

        const translatedLabels = await Promise.allSettled(
          tags.map(async (tag) => {
            try {
              const label = await defaultExlClient.getLabelFromEndpoint(
                EXL_LABEL_ENDPOINTS[key.toUpperCase()],
                tag,
                lang,
              );
              // fallback if label is empty or null
              return label?.trim() !== '' ? label : tag;
            } catch (error) {
              console.error(
                `Error fetching translated label for ${metaType} with Tag: ${tag}`,
                error,
              );
              return tag;
            }
          }),
        );

        const localizedLabels = translatedLabels.map((result, index) =>
          result.status === 'fulfilled' ? result.value : tags[index],
        );

        setMetadata(document, `loc-${metaType}`, localizedLabels.join(','));
      }
    }),
  );
};
