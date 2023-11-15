import { toBlock } from '../utils/dom-utils.js';

// ideally second argument meta should be passed once API response is working fine
export default function createBreadcrumbs(document) {
  // Breadcrumbs metadata extraction
  const mockMetaBreadcrumbs =
    '{"breadcrumbs" : [{"title": "Documentation","url": "/docs/?lang=en"},{"title":"Target","url": "/docs/target.html?lang=en"},{"title":"Target Guide","url":"/docs/target/using/target-home.html?lang=en"},{"title":"How","url":""}]}';
  // TODO relapce mockMetaBreadcrumbs with meta once the API response is in correct format
  // const fullMetadata = yaml.load(meta);
  const headerElement = document.querySelector('h1');

  const mockBreadcrumbs = JSON.parse(mockMetaBreadcrumbs);
  // TODO replace mockMetaBreadcrumbs with fullMetadata once line 8 gets uncommented
  const { breadcrumbs } = mockBreadcrumbs;
  const metaDivTag = document.createElement('div');
  // Article Metadata breadcrumbs
  if (breadcrumbs) {
    breadcrumbs.forEach((breadcrumb) => {
      const anchorTag = document.createElement('a');
      const { url } = breadcrumb;
      if (url) {
        anchorTag.setAttribute('href', url);
        anchorTag.textContent = breadcrumb.title;
        metaDivTag.append(anchorTag);
      }
    });
  }
  const cells = [[metaDivTag]];
  const block = toBlock('breadcrumbs', cells, document);
  headerElement.parentNode.insertBefore(block, headerElement);
}
