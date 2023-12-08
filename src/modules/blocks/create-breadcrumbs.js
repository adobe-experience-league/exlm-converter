import yaml from 'js-yaml';
import { toBlock } from '../utils/dom-utils.js';

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
        if (url) {
          anchorTag.setAttribute('href', url);
          anchorTag.textContent = breadcrumb.title;
          metaDivTag.append(anchorTag);
        }
        if (uri) {
          anchorTag.setAttribute('href', uri);
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
