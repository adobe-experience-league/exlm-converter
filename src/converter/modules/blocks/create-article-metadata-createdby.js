import { toBlock, newHtmlList } from '../utils/dom-utils.js';
import { CREATED_FOR } from '../blocks-translated-content.js';

export default function createArticleMetaDataCreatedBy(
  document,
  data,
  reqLang,
) {
  // Article Metadata Created For
  if (data.Level || data.Role) {
    const metaElement = document.querySelector('.article-metadata');
    const levelDivTag = document.createElement('div');
    const createdForDiv = document.createElement('div');
    const paragraph = document.createElement('p');
    const parentDiv = document.createElement('div');
    paragraph.textContent = CREATED_FOR[`${reqLang.replace('-', '_')}`];
    createdForDiv.append(paragraph);
    parentDiv.append(createdForDiv);
    const items = [];
    if (data.Level && data.Level !== '') {
      const levels = data.Level;
      levels.forEach((tags) => {
        if (tags.trim() !== '') {
          items.push(tags.trim());
        }
      });
    }
    if (data.Role && data.Role !== '') {
      const roles = data.Role;
      roles.forEach((role) => {
        if (role.trim() !== '') {
          items.push(role.trim());
        }
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
