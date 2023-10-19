import { replaceElement, toBlock } from '../utils/dom-utils.js';

export default function createMiniTOC(document) {
  // get hold of div section of content before any DOM changes; review this once template changes are in place
  const contentDivNode = document.querySelector('main > div');
  // section container div
  const sectionContainerDivNode = document.createElement('div');
  // derive anchors from h2, h3 elements
  const anchorElements = Array.from(document.querySelectorAll('h2,h3'));
  const rightNavDivNode = document.createElement('div');
  const ulElement = document.createElement('ul');
  anchorElements.forEach((element) => {
    const liElement = document.createElement('li');
    const aTag = document.createElement('a');
    aTag.setAttribute('href', `#${element.getAttribute('id')}`);
    aTag.textContent = element.innerHTML;
    liElement.appendChild(aTag);
    if (element.tagName !== 'H2') {
      liElement.classList.add('is-padded-left-big');
    }
    ulElement.append(liElement);
  });
  rightNavDivNode.append(ulElement);

  const tocHeadingDivNode = document.createElement('div');
  const tocHeadingElement = document.createElement("h2");
  tocHeadingElement.textContent = "On this page";
  tocHeadingDivNode.appendChild(tocHeadingElement);

  const cells = [[tocHeadingDivNode], [rightNavDivNode]];
  const block = toBlock(`mini-toc`, cells, document);
  sectionContainerDivNode.appendChild(block);

  contentDivNode.parentNode.insertBefore(sectionContainerDivNode, contentDivNode.nextSibling);
}
