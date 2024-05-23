import yaml from 'js-yaml';
import { DOCPAGETYPE } from '../../../common/utils/doc-page-types.js';

/**
 * Generates an SEO-friendly string by combining input arguments.
 *
 * @param {string} arg - The main argument for the SEO string.
 * @param {string} additive - Additional content to be included in the SEO string.
 * @param {string} req - The required content, used if additive does not include it.
 * @returns {string} - The SEO-friendly string.
 */
const seo = (arg = '', additive = '', req = 'Adobe') =>
  `${arg} | ${additive.includes(req) ? additive : `${req} ${additive}`}`;

/**
 * Consolodate CSV properties into one unique CSV property under a new name.
 * @param {string} prop1 the first property to consolodate, in obj
 * @param {string} prop2 the second property to consolodate, in obj
 * @param {Object} obj the object containing the properties
 * @param {string} newPropName the new property name to store the consolodated values
 */
const consolodateCSVProperties = (prop1, prop2, obj, newPropName) => {
  if (obj[prop1] && obj[prop2]) {
    const csvArray1 =
      obj[prop1].split(',')?.map((s) => s.trim().toLowerCase()) || [];
    const csvArray2 =
      obj[prop2]?.split(',')?.map((s) => s.trim().toLowerCase()) || [];
    const combined = new Set([...csvArray1, ...csvArray2]);
    delete obj[prop1];
    delete obj[prop2];
    obj[newPropName] = Array.from(combined).join(', ');
  }
};

/**
 * a copy of the coversion logic from Clue.
 * @param {string} arg
 * @param {Array} solutions
 * @returns
 */
function coveoSolution(arg = [], solutions = []) {
  const lsolutions = solutions.filter((i) => arg.includes(i.Name));
  const lsubproducts = [];
  const result = lsolutions
    .map((i, idx) => {
      i.SubProducts = lsolutions.slice(idx).filter((s) => {
        const lresult =
          s.Nested === true && s.Name !== i.Name && s.Name.startsWith(i.Name);

        if (lresult) {
          lsubproducts.push(s.Name);
          s.ParentName = i.Name;
        }

        return lresult;
      });

      return i;
    })
    .filter((i) => lsubproducts.includes(i.Name) === false);

  return result
    .reduce(
      (a, v) => [
        ...a,
        v.Name,
        ...v.SubProducts.map((x) => `${x.ParentName}|${x.Name}`),
      ],
      [],
    )
    .join(';');
}

/**
 * Creates and appends meta elements to the document's head based on the provided meta string.
 *
 * @param {Document} document - The Document object representing the web page.
 * @param {string} meta - The string containing key-value pairs to be converted into meta elements.
 * @returns {void}
 */
export const createMetaData = (
  document,
  meta,
  data,
  pageType,
  solutions = [],
) => {
  const fragment = document.createDocumentFragment();
  const fullMetadata = typeof meta === 'string' ? yaml.load(meta) : meta;
  // EXL API returns both "robots" and "ROBOTS" properties. Combine them into one.
  consolodateCSVProperties('robots', 'ROBOTS', fullMetadata, 'robots');

  //     result.push(`<meta name="coveo-solution" content="${}">`);

  // Metadata from data key API Response
  const metaProperties = ['id', 'Keywords']
    .filter((key) => data[key])
    .map((key) => ({ name: key.toLowerCase(), content: data[key] }));

  if (fullMetadata.solution) {
    metaProperties.push({
      name: 'coveo-solution',
      content: coveoSolution(
        (fullMetadata.solution || '').split(','),
        solutions,
      ),
    });
  }

  metaProperties.forEach((property) => {
    const metaTag = document.createElement('meta');
    Object.entries(property).forEach(([key, value]) => {
      metaTag.setAttribute(key, value);
    });
    document.head.appendChild(metaTag);
  });

  // Dynamic Metadata from API
  Object.entries(fullMetadata).forEach(([key, value]) => {
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', key);

    // Handle title and solution combination
    if (
      pageType === DOCPAGETYPE.DOC_ARTICLE &&
      key === 'title' &&
      fullMetadata.solution
    ) {
      let solution;

      if (typeof fullMetadata.solution === 'string') {
        // eslint-disable-next-line prefer-destructuring
        solution = fullMetadata.solution.split(',')[0];
      } else if (Array.isArray(fullMetadata.solution)) {
        // eslint-disable-next-line prefer-destructuring
        solution = fullMetadata.solution[0];
      } else {
        solution = fullMetadata.solution;
      }
      // In case of "General" solution, defaults to "Experience Cloud".
      if (solution === 'General') {
        solution = 'Experience Cloud';
      }
      metaTag.setAttribute('content', seo(value, solution, 'Adobe'));
    } else {
      metaTag.setAttribute('content', value);
    }

    fragment.appendChild(metaTag);
  });

  document.head.appendChild(fragment);
};
