import { toBlock, newHtmlList } from '../utils/dom-utils.js';
import { CREATED_FOR } from '../blocks-translated-labels.js';
import { createDefaultExlClient } from '../ExlClient.js';

export default async function createArticleMetaDataCreatedBy(
  document,
  data,
  reqLang,
) {
  const defaultExlClient = await createDefaultExlClient();
  // Article Metadata Created For
  const metaElement = document.querySelector('.article-metadata');
  const parentDiv = document.createElement('div');
  const levelsArray = data?.Level || [];
  const rolesArray = data?.Role || [];

  const levelDivTag = document.createElement('div');
  const createdForDiv = document.createElement('div');
  const paragraph = document.createElement('p');
  paragraph.textContent = CREATED_FOR[`${reqLang}`];
  createdForDiv.append(paragraph);
  parentDiv.append(createdForDiv);
  const items = [];

  if (!(levelsArray.length === 1 && levelsArray[0] === '')) {
    /* eslint-disable-next-line */
    for (const level of levelsArray) {
      if (level.trim() !== '') {
        /* eslint-disable-next-line no-await-in-loop */
        const label = await defaultExlClient.getLabelFromEndpoint(
          'levels',
          level,
          reqLang,
        );
        items.push(label);
      }
    }
  }

  if (!(rolesArray.length === 1 && rolesArray[0] === '')) {
    /* eslint-disable-next-line */
    for (const role of rolesArray) {
      if (role.trim() !== '') {
        /* eslint-disable-next-line no-await-in-loop */
        const label = await defaultExlClient.getLabelFromEndpoint(
          'roles',
          role,
          reqLang,
        );
        items.push(label);
      }
    }
  }

  if (items.length > 0) {
    levelDivTag.append(
      newHtmlList(document, {
        tag: 'ul',
        items,
      }),
    );
    parentDiv.append(levelDivTag);
    const cells = [[parentDiv]];
    const block = toBlock('article-metadata-createdby', cells, document);
    metaElement?.insertAdjacentElement('afterend', block);
  }
}
