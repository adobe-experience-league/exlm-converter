import { toBlock, newHtmlList } from '../utils/dom-utils.js';

export default function createArticleMetaDataCreatedBy(document, data) {
  // Article Metadata Created For
  if (data.Level || data.Role) {
    const metaElement = document.querySelector('.article-metadata');
    const levelDivTag = document.createElement('div');
    const createdForDiv = document.createElement('div');
    const paragraph = document.createElement('p');
    const parentDiv = document.createElement('div');
    paragraph.textContent = 'CREATED FOR:';
    createdForDiv.append(paragraph);
    parentDiv.append(createdForDiv);
    const items = [];
    if (data.Level && data.Level !== '') {
      const levels = data.Level;
      levels.forEach((tags) => {
        items.push(tags);
      });
    }
    if (data.Role && data.Role !== '') {
      const roles = data.Role;
      roles.forEach((role) => {
        items.push(role);
      });
    }
    levelDivTag.append(
      newHtmlList(document, {
        tag: 'ul',
        items,
      }),
    );
    parentDiv.append(levelDivTag);
    const cells = [[parentDiv]];
    const block = toBlock('article-metadata-createdby', cells, document);
    metaElement.insertAdjacentElement('afterend', block);
  }
}
