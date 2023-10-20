import yaml from 'js-yaml';
import { toBlock, replaceElement, newHtmlList } from '../utils/dom-utils.js';

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

   //Article Metadata Topics
   if(fullMetadata.hasOwnProperty("feature") && fullMetadata["feature"].trim() !== ""){
     const feature = fullMetadata["feature"];
     const topicMetadata = feature.split(', ').map(item => item.trim());
     const items = ['Topics:'];
     topicMetadata.forEach((tags) => {
      const a = document.createElement('a');
      a.setAttribute('href', '#');
      a.textContent = tags;
      items.push(a);
    });
    articleMetaDivTag.append(newHtmlList(document, { tag: 'ul', items }));
    }

  // Article Metadata Created For
  if(fullMetadata.hasOwnProperty("level") && fullMetadata["level"].trim() !== ""){
    const levels = fullMetadata["level"];
    const level = levels.split(', ').map(item => item.trim());
    const items = ['Created for:'];
    level.forEach((tags) => {
      items.push(tags);
    });
    articleMetaDivTag.append(newHtmlList(document, { tag: 'ul', items }));
  }

  const cells = [[articleMetaDivTag]];
  const block = toBlock('article-metadata', cells, document);
  headerElement.parentNode.insertBefore(block, headerElement.nextSibling);
}
