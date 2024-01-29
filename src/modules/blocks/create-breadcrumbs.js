import yaml from 'js-yaml';
import { toBlock } from '../utils/dom-utils.js';
import { rewriteDocsPath } from '../utils/link-utils.js';

export default function createBreadcrumbs(document, meta) {
  const headerElement = document.querySelector('h1');
  const metaDivTag = document.createElement('div');
  const fullMetadata = yaml.load(meta);

  if (fullMetadata.breadcrumbs) {
    const breadcrumbs = JSON.parse(fullMetadata.breadcrumbs) || [];
    
    breadcrumbs.forEach((breadcrumb, index, array) => {
      const anchorTag = document.createElement('a');
      const { title, url, uri } = breadcrumb;
      const href = rewriteDocsPath(
        ((array.length - 1) === index ) ? '#' : // The last breadcrumb is a markdown file and represents the current page
        uri ? uri : url
      );
      
      if (title && href) {
        anchorTag.setAttribute('href', href);
        anchorTag.textContent = title;
        metaDivTag.append(anchorTag);
      }
    });
  }

  const cells = [[metaDivTag]];
  const block = toBlock('breadcrumbs', cells, document);
  
  headerElement.parentNode.insertBefore(block, headerElement);
}
