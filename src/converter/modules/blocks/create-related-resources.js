import yaml from 'js-yaml';
import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createRelatedResources(document, meta) {
  const ullistElements = Array.from(
    document.querySelectorAll('main > div > ul'),
  );
  const fullMetadata = yaml.load(meta);
  if (fullMetadata.type === 'Documentation') {
    if (ullistElements.length) {
      ullistElements.forEach((ullistElement) => {
        const h2 = ullistElement.previousElementSibling;
        if (
          h2.tagName === 'H2' &&
          (h2.id === 'lists-resources' ||
            h2.id === 'lists-release' ||
            h2.id === 'lists-dev')
        ) {
          const ul = document.createElement('ul');
          ul.innerHTML = ullistElement.innerHTML;
          const cells = [[ul]];
          const block = toBlock('related-resources', cells, document);

          replaceElement(ullistElement, block);
        }
      });
    }
  }
}
