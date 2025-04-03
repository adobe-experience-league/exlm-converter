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
    const appliesToDiv = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = APPLIES_TO[reqLang];
    appliesToDiv.append(paragraph);
    versionDivTag.append(appliesToDiv);

    const items = [version.trim()];

    versionDivTag.append(
      newHtmlList(document, {
        tag: 'ul',
        items,
      }),
    );
    const cells = [[versionDivTag]];
    const block = toBlock('article-metadata-appliesto', cells, document);
    metaElement?.insertAdjacentElement('afterend', block);
  }
}
