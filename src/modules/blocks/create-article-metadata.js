import yaml from 'js-yaml';
import { toBlock, replaceElement, newHtmlList } from '../utils/dom-utils.js';

export default function createArticleMetaData(
  document,
  meta,
  lastUpdated,
  level,
) {
  // Article Metadata Title
  const headerElements = document.querySelector('h1');
  const articleMetaDivTag = document.createElement('div');

  // Article Metadata Last Updated
  if (lastUpdated.length !== 0) {
    const lastUpdatedElementTag = document.createElement('div');
    const isodate = new Date(lastUpdated);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = isodate.toLocaleDateString('en-US', options);
    const localeDateString = `Last update: ${formattedDate}`;
    lastUpdatedElementTag.innerHTML = localeDateString;
    articleMetaDivTag.append(lastUpdatedElementTag);
  }

   //Article Metadata Topics
   const fullMetadata = yaml.load(meta);
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
  if (level.length !== 0) {
    const items = ['Created for:'];
    level.forEach((tags) => {
      items.push(tags);
    });
    articleMetaDivTag.append(newHtmlList(document, { tag: 'ul', items }));
  }

  const cells = [[articleMetaDivTag]];
  const block = toBlock('article-metadata', cells, document);
  headerElements.parentNode.insertBefore(block, headerElements.nextSibling);
}
