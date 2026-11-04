import yaml from 'js-yaml';
import { toBlock, newHtmlList } from '../utils/dom-utils.js';
import { APPLIES_TO } from '../blocks-translated-labels.js';

export default async function createArticleMetaDataAppliesTo(
  document,
  meta,
  reqLang,
) {
  const fullMetadata = yaml.load(meta);
  const metaElement = document.querySelector('.article-metadata');
  const version = fullMetadata?.version;
  // Article Metadata Applies To
  if (version && version.trim() !== '') {
    const versionDivTag = document.createElement('div');
    const items = [APPLIES_TO[reqLang]];

    // Add version items to the list
    items.push(...version.split(',').map((item) => item.trim()));

    versionDivTag.append(newHtmlList(document, { tag: 'ul', items }));
    const cells = [[versionDivTag]];
    const block = toBlock('article-metadata-appliesto', cells, document);
    metaElement?.insertAdjacentElement('afterend', block);
  }
}
