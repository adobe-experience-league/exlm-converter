import { toBlock, replaceElement } from '../utils/dom-utils.js';

 export default function createArticleMetaData(document,meta,lastUpdated,level) {

  //Article Metadata Title
  const headerElements = document.querySelector("h1");
  const articleMetaDivTag = document.createElement('div');
  const headerElementTag = document.createElement('h1');
  headerElementTag.textContent= (headerElements.innerHTML);
  articleMetaDivTag.append(headerElementTag);
  
  //Article Metadata Last Updated
  if(lastUpdated.length !== 0){
    const lastUpdatedElementTag = document.createElement('div');
    const isodate = new Date(lastUpdated);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = isodate.toLocaleDateString('en-US', options);
    const localeDateString = `Last update: ${ formattedDate}`;
    lastUpdatedElementTag.innerHTML= localeDateString;
    articleMetaDivTag.append(lastUpdatedElementTag);
  }

  //Article Metadata Topics
  const fullMetadata = meta.split('\n');
  fullMetadata.forEach((line) => {
  const [key, value] = line.split(': ');

  if(key === "feature"){
    const topics = value;
    const topicMetadata = topics.split(',');
    const uiElementTag = document.createElement('ul');
    const levelTitle = document.createElement('li');
    levelTitle.innerHTML = 'Topics:';
    uiElementTag.append(levelTitle);
    topicMetadata.forEach(tags => {
     const tagElementTag = document.createElement('li');
     const aElementTag = document.createElement('a');
     aElementTag.setAttribute('href', "#");
     aElementTag.textContent = tags;
     tagElementTag.append(aElementTag);
     uiElementTag.append(tagElementTag);
    });
    articleMetaDivTag.append(uiElementTag);
    }
  })

    //Article Metadata Created For
    if(level.length !== 0) {
      const uiElementTag = document.createElement('ul');
      const levelTitle = document.createElement('li');
      levelTitle.innerHTML= 'Created for:';
      uiElementTag.append(levelTitle);
      level.forEach(tags => {
        const tagElementTag = document.createElement('li');
        tagElementTag.innerHTML= tags;
        uiElementTag.append(tagElementTag);
      });
      articleMetaDivTag.append(uiElementTag);
    }
    
  const cells = [[articleMetaDivTag],];
  const block = toBlock('article-metadata', cells, document);
  replaceElement(headerElements, block);
}