import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createVideoTranscript(document) {
  const videoTranscriptElements = document.querySelectorAll('details');

  if (videoTranscriptElements.length) {
    videoTranscriptElements.forEach((element) => {
      if (
        element.previousElementSibling &&
        element.previousElementSibling.classList[0] === 'embed'
      ) {
        const cells = [];

        Array.from(element.children).forEach((el) => {
          const div = document.createElement('div');
          div.append(el.textContent);
          cells.push([div]);
        });

        const block = toBlock(`video-transcript`, cells, document);
        replaceElement(element, block);
      }
    });
  }
}
