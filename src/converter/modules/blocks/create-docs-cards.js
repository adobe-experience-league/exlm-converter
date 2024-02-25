import { replaceElement, toBlock } from '../utils/dom-utils.js';

const createButton = (document, href, text) => {
  const strong = document.createElement('strong');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  strong.appendChild(a);
  return strong;
};

/**
 *
 * @param {Document} document
 */
export default function createDocsCards(document) {
  Array.from(document.querySelectorAll('.columns')).forEach((columnsEl) => {
    const cards = Array.from(columnsEl.querySelectorAll('.card')).map(
      (cardEl) => {
        // image .card-image inner HTML
        const cardImage = cardEl.querySelector('.card-image').firstElementChild;
        // card content .card-content > div
        const cardContent = cardEl.querySelector('.card-content > div');

        // card headline
        const headline = cardContent.querySelector('.headline');
        const cardHeadline = document.createElement('p');
        const cardHeadlineStrong = document.createElement('strong');
        cardHeadlineStrong.textContent = headline.textContent;
        cardHeadline.appendChild(cardHeadlineStrong);

        // card text
        const cardText = headline.nextElementSibling;

        // card time label
        const timeLabel = headline.previousElementSibling;
        let cardTimeLabel = null;
        if (timeLabel) {
          cardTimeLabel = document.createElement('p');
          cardTimeLabel.textContent = timeLabel?.textContent;
        }

        // card tbutton
        const btn = cardEl.querySelector('a.spectrum-Button');
        const cardButton = btn
          ? createButton(document, btn.href, btn.textContent)
          : null;

        return [
          cardImage,
          [cardTimeLabel, cardHeadline, cardText, cardButton].filter(Boolean),
        ];
      },
    );

    if (cards.length === 0) return;

    const docsCardBlock = toBlock('docs-cards', cards, document);
    docsCardBlock.style.display = 'flex';
    replaceElement(columnsEl, docsCardBlock);
  });
}
