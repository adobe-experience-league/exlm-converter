import { replaceElement, toBlock } from '../utils/dom-utils.js';

// Function to check if two elements are adjacent siblings
function areAdjacentElements(element1, element2) {
  return (
    element1.nextElementSibling === element2 ||
    element1.previousElementSibling === element2
  );
}

export default function createBadge(document) {
  const badgesInsideSingleP = document.querySelectorAll('p .sp-badge-wrapper');

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < badgesInsideSingleP.length; i++) {
    const currentBadge = badgesInsideSingleP[i];
    const nextBadge = badgesInsideSingleP[i + 1];

    if (areAdjacentElements(currentBadge, nextBadge)) {
      currentBadge.classList.add('same-p-tag');
      nextBadge.classList.add('same-p-tag');
    }
  }

  const badgeElements = Array.from(
    document.getElementsByClassName('sp-badge-wrapper'),
  );

  badgeElements.forEach((element) => {
    if (element.parentElement.closest('a')) {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const a = document.createElement('a');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const target = element.parentNode.getAttribute('target');
      const href = element.parentNode.getAttribute('href');
      const spBadge = element.querySelector('sp-badge');
      a.textContent = spBadge.textContent;

      if (target) {
        const newHref = `${href}#${target}`;
        a.setAttribute('href', newHref);
      } else {
        a.setAttribute('href', href);
      }
      p.append(a);
      div1.append(p);

      const variant = spBadge.getAttribute('variant');
      const title = spBadge.getAttribute('title');

      let cells = [[div1]];

      if (title !== null) {
        p2.textContent = title;
        div2.append(p2);

        cells = [[div1], [div2]];
      }

      const block = toBlock(`badge ${variant}`, cells, document);
      element.parentNode.parentNode.replaceChild(block, element.parentNode);
    } else {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const p2 = document.createElement('p');
      const spBadge = element.querySelector('sp-badge');
      div1.textContent = element.querySelector('sp-badge').textContent;

      const variant = spBadge.getAttribute('variant');
      const title = spBadge.getAttribute('title');
      let elClass = '';
      if (element.getAttribute('class').indexOf('same-p-tag') > 0) {
        elClass = 'same-p-tag';
      }
      let cells = [[div1]];

      if (title !== null) {
        p2.textContent = title;
        div2.append(p2);

        cells = [[div1], [div2]];
      }

      const block = toBlock(`badge ${variant} ${elClass}`, cells, document);
      replaceElement(element, block);
    }
  });
}
