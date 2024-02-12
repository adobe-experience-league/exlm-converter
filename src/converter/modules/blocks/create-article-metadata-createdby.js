import { toBlock, newHtmlList } from '../utils/dom-utils.js';
import { CREATED_FOR } from '../blocks-translated-labels.js';

export default function createArticleMetaDataCreatedBy(
  document,
  data,
  reqLang,
) {
  // Article Metadata Created For
  const metaElement = document.querySelector('.article-metadata');
  const parentDiv = document.createElement('div');

  if (data.Level || data.Role) {
    if (Array.isArray(data.Level) && Array.isArray(data.Role)) {
      const levelsArray = data.Level;
      const rolesArray = data.Role;
      if (
        !(levelsArray.length === 1 && levelsArray[0] === '') ||
        !(rolesArray.length === 1 && rolesArray[0] === '')
      ) {
        const levelDivTag = document.createElement('div');
        const createdForDiv = document.createElement('div');
        const paragraph = document.createElement('p');
        paragraph.textContent = CREATED_FOR[`${reqLang}`];
        createdForDiv.append(paragraph);
        parentDiv.append(createdForDiv);
        const items = [];

        levelsArray.forEach((tags) => {
          if (tags.trim() !== '') {
            items.push(tags.trim());
          }
        });
        rolesArray.forEach((role) => {
          if (role.trim() !== '') {
            items.push(role.trim());
          }
        });
        levelDivTag.append(
          newHtmlList(document, {
            tag: 'ul',
            items,
          }),
        );
        parentDiv.append(levelDivTag);
      }
    }
  }
  const cells = [[parentDiv]];
  const block = toBlock('article-metadata-createdby', cells, document);
  metaElement.insertAdjacentElement('afterend', block);
}
