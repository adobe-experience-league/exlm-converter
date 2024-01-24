import yaml from 'js-yaml';
import { toBlock } from '../utils/dom-utils.js';
import { rewriteDocsPath } from '../utils/link-utils.js';
import { DOCPAGETYPE } from '../../doc-page-types.js';

export default function createBreadcrumbs(document, meta, pageType) {
  const headerElement = document.querySelector('h1');
  const metaDivTag = document.createElement('div');
  const fullMetadata = yaml.load(meta);
  if (pageType === DOCPAGETYPE.DOC_ARTICLE) {
    if (fullMetadata.breadcrumbs) {
      const breadcrumbs = JSON.parse(fullMetadata.breadcrumbs);
      // Article Metadata breadcrumbs
      if (breadcrumbs) {
        breadcrumbs.forEach((breadcrumb) => {
          const anchorTag = document.createElement('a');
          const { url, uri } = breadcrumb;
          let href = url || uri; // in case the metadta value contains url or uri
          if (href) {
            href = rewriteDocsPath(href); // rewrite docs path to fix language path
            anchorTag.setAttribute('href', href);
            anchorTag.textContent = breadcrumb.title;
            metaDivTag.append(anchorTag);
          }
        });
      }
    }
  }
  if (pageType === DOCPAGETYPE.SOLUTION_LANDING) {
    const docsTitle = fullMetadata.type ? fullMetadata.type : 'Documentation';
    const productTitle = fullMetadata['breadcrumb-name'] ? fullMetadata['breadcrumb-name'] : fullMetadata.solution;

    if (docsTitle) {
      const docAnchorTag = document.createElement('a');
      docAnchorTag.setAttribute('href', '/en/docs');
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
