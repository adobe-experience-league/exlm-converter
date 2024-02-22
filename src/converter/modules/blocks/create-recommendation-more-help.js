import { targetInsertionBlock } from './create-target-insertion.js';

/**
 * UGP-10241 - a reliable way to in sert recommendation-more-help via Adobe Target.
 * @param {Document} document
 */
export const createRecommendationMoreHelp = (document) => {
  const mainSection = document.querySelector('main div');
  // always at the end of the document
  mainSection.appendChild(
    targetInsertionBlock(document, 'recommendation-more-help'),
  );
};
