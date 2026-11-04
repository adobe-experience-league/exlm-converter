import { toBlock } from '../utils/dom-utils.js';

export default function createCloudSolutions(document) {
  const mainContainer = document.querySelector('main > div');
  const h1Element = mainContainer.querySelector('h1');
  const h2Elements = Array.from(mainContainer.querySelectorAll('h2'));

  if (h1Element && h2Elements.length) {
    // Create a document fragment to build the new structure
    const fragment = document.createDocumentFragment();
    fragment.appendChild(h1Element.cloneNode(true));

    // Append the content from h1 to the first h2 to the fragment
    let sibling = h1Element.nextElementSibling;
    while (sibling && sibling.tagName !== 'H2') {
      fragment.appendChild(sibling.cloneNode(true));
      sibling = sibling.nextElementSibling;
    }

    h2Elements.forEach((h2Element) => {
      const siblingDiv = document.createElement('div');
      siblingDiv.appendChild(h2Element.cloneNode(true));

      // Iterate over the siblings until the next h2 is encountered
      sibling = h2Element.nextElementSibling;
      while (sibling && sibling.tagName !== 'H2') {
        siblingDiv.appendChild(sibling.cloneNode(true));
        sibling = sibling.nextElementSibling;
      }

      const cells = [[siblingDiv]];
      const block = toBlock('cloud-solutions', cells, document);
      fragment.appendChild(block);
    });
    mainContainer.innerHTML = '';
    mainContainer.appendChild(fragment);
  }
}
