import yaml from 'js-yaml';
import { toBlock, newHtmlList } from '../utils/dom-utils.js';

export default function createArticleMetaData(
  document,
  meta,
) {
  // Article Metadata Title
  const headerElement = document.querySelector('h1');
  const articleMetaDivTag = document.createElement('div');
  const fullMetadata = yaml.load(meta);

  // Article Metadata Last Updated
  if (fullMetadata.hasOwnProperty("last-update")) {
    const lastUpdatedElementTag = document.createElement('div');
    const isodate = new Date(fullMetadata["last-update"]);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = isodate.toLocaleDateString('en-US', options);
    const localeDateString = `Last update: ${formattedDate}`;
    lastUpdatedElementTag.innerHTML = localeDateString;
    articleMetaDivTag.append(lastUpdatedElementTag);
  }

  const cells = [[articleMetaDivTag]];
  const block = toBlock('article-metadata', cells, document);
  headerElement.parentNode.insertBefore(block, headerElement.nextSibling);
}
