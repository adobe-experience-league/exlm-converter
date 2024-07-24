import jsdom from 'jsdom';
import { getMetadata, setMetadata } from '../../modules/utils/dom-utils.js';

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
