import { toBlock, newHtmlList } from '../utils/dom-utils.js';

export default function createArticleMetaDataCreatedBy(document, data) {
  // Article Metadata Created For
  if (data.Level || data.Role) {
    const metaElement = document.querySelector('.article-metadata');
    const levelDivTag = document.createElement('div');
    const items = ['Created for:'];
    if (data.Level) {
      const levels = data.Level;
      levels.forEach((tags) => {
        items.push(tags);
      });
    }
    if (data.Role) {
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
    const cells = [[levelDivTag]];
    const block = toBlock('article-metadata-createdby', cells, document);
    metaElement.insertAdjacentElement('afterend', block);
  }
}
