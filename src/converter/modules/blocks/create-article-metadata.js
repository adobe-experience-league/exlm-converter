import yaml from 'js-yaml';
import { toBlock } from '../utils/dom-utils.js';

export default function createArticleMetaData(document, meta) {
  // header is the first h1, h2 or h3 element in the document (really should be h1, but this should not fail because of an authoring mistake)
  const headerElement = document.querySelector('h1, h2, h3');

  const articleMetaDivTag = document.createElement('div');
  const fullMetadata = yaml.load(meta);

  // Article Metadata Last Updated
  if (fullMetadata['last-update']) {
    const lastUpdatedElementTag = document.createElement('div');
    const isodate = new Date(fullMetadata['last-update']);
    const localeDateString = `Last update: ${isodate}`;
    lastUpdatedElementTag.innerHTML = localeDateString;
    articleMetaDivTag.append(lastUpdatedElementTag);
  }

  const cells = [[articleMetaDivTag]];
  const block = toBlock('article-metadata', cells, document);
  headerElement?.parentNode.insertBefore(block, headerElement.nextSibling);
}
