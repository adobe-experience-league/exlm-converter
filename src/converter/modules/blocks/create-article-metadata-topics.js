import yaml from 'js-yaml';
import { toBlock, newHtmlList } from '../utils/dom-utils.js';
import { TOPICS } from '../blocks-translated-labels.js';
import { createDefaultExlClient } from '../ExlClient.js';

export default async function createArticleMetaDataTopics(
  document,
  meta,
  reqLang,
) {
  const defaultExlClient = await createDefaultExlClient();
  const fullMetadata = yaml.load(meta);
  const metaElement = document.querySelector('.article-metadata');
  const feature = fullMetadata?.feature;
  // Article Metadata Topics
  if (feature && feature.trim() !== '') {
    const topicMetadata = feature.split(', ').map((item) => item.trim());
    const featureDivTag = document.createElement('div');
    const items = [TOPICS[`${reqLang}`]];

    /* eslint-disable-next-line */
    for (const tags in topicMetadata) {
      const a = document.createElement('a');
      a.setAttribute('href', '#');
      /* eslint-disable-next-line no-await-in-loop */
      a.textContent = await defaultExlClient.getLabelFromEndpoint(
        'features',
        tags,
        reqLang,
      );
      items.push(a);
    }
    featureDivTag.append(newHtmlList(document, { tag: 'ul', items }));
    const cells = [[featureDivTag]];
    const block = toBlock('article-metadata-topics', cells, document);
    metaElement?.insertAdjacentElement('afterend', block);
  }
}
