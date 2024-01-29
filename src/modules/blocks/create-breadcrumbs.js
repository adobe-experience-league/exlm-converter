import yaml from 'js-yaml';
import { toBlock } from '../utils/dom-utils.js';
import { rewriteDocsPath } from '../utils/link-utils.js';

export default function createBreadcrumbs(document, meta, pageType, reqLang) {
  const headerElement = document.querySelector('h1');
  const metaDivTag = document.createElement('div');
  const fullMetadata = yaml.load(meta);

  if (pageType === DOCPAGETYPE.DOC_ARTICLE && fullMetadata.breadcrumbs) {
    const breadcrumbs = JSON.parse(fullMetadata.breadcrumbs) || [];

    breadcrumbs.forEach((breadcrumb, index, array) => {
      const anchorTag = document.createElement('a');
      const { title, url, uri } = breadcrumb;
      const href = rewriteDocsPath(
        array.length - 1 === index
          ? '#' // The last breadcrumb is a markdown file and represents the current page
          : uri
          ? uri
          : url,
      );

      if (title && href) {
        anchorTag.setAttribute('href', href);
        anchorTag.textContent = title;
        metaDivTag.append(anchorTag);
      }
    });
  }

  if (pageType === DOCPAGETYPE.SOLUTION_LANDING) {
    const docsTitle = fullMetadata.type ? fullMetadata.type : 'Documentation';
    const productTitle = fullMetadata['breadcrumb-name']
      ? fullMetadata['breadcrumb-name']
      : fullMetadata.solution;

    if (docsTitle) {
      const docAnchorTag = document.createElement('a');
      docAnchorTag.setAttribute('href', `/${reqLang}/docs`);
      docAnchorTag.textContent = docsTitle;
      metaDivTag.append(docAnchorTag);
    }

    if (productTitle) {
      const productAnchorTag = document.createElement('a');
      productAnchorTag.textContent = productTitle;
      metaDivTag.append(productAnchorTag);
    }
  }
  const cells = [[metaDivTag]];
  const block = toBlock('breadcrumbs', cells, document);
  headerElement.parentNode.insertBefore(block, headerElement);
}
