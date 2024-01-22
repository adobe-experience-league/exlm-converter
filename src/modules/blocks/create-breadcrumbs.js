import yaml from 'js-yaml';
import { toBlock } from '../utils/dom-utils.js';
import { rewriteDocsPath } from '../utils/link-utils.js';

export default function createBreadcrumbs(document, meta) {
  const headerElement = document.querySelector('h1');
  const metaDivTag = document.createElement('div');
  const fullMetadata = yaml.load(meta);

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
  const cells = [[metaDivTag]];
  const block = toBlock('breadcrumbs', cells, document);
  headerElement.parentNode.insertBefore(block, headerElement);
}
