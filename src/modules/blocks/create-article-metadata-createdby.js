import yaml from 'js-yaml';
import { toBlock,newHtmlList } from '../utils/dom-utils.js';

export default function createArticleMetaDataCreatedBy(
  document,
  meta,
) {
  const fullMetadata = yaml.load(meta);
  const metaElement = document.querySelector('.article-metadata');

    // Article Metadata Created For
    if(fullMetadata.hasOwnProperty("level") && fullMetadata["level"].trim() !== ""){
      const levels = fullMetadata["level"];
      const level = levels.split(',').map(item => item.trim());
      const levelDivTag = document.createElement('div');
      const items = ['Created for:'];
      level.forEach((tags) => {
        items.push(tags);
      });
      levelDivTag.append(newHtmlList(document, { tag: 'ul', items }));
      const cells = [[levelDivTag]];
      const block = toBlock('article-metadata-createdby', cells, document);
      metaElement.insertAdjacentElement('afterend', block);
    }
  }