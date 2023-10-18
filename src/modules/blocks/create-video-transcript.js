import { toBlock } from '../utils/dom-utils.js';

export default function createVideoTranscript(document) {
  const videoTranscriptElements = Array.from(
    document.getElementsByClassName('embed'),
  );

  if (videoTranscriptElements.length) {
    videoTranscriptElements.forEach((element) => {
      const transcriptParagraph = element.nextElementSibling;
      const cells = [];

      if (
        transcriptParagraph &&
        transcriptParagraph.tagName === 'P' &&
        transcriptParagraph.textContent.trim() === '+++ Transcript'
      ) {
        const div1 = document.createElement('div');
        const transcript = transcriptParagraph.textContent.replace(
          /\+\+\+/g,
          '',
        );
        div1.textContent = transcript;
        cells.push([div1]);

        let currentParagraph = transcriptParagraph.nextElementSibling;
        transcriptParagraph.remove();

        while (currentParagraph) {
          if (
            currentParagraph.tagName === 'P' &&
            currentParagraph.textContent.trim() === '+++'
          ) {
            currentParagraph.remove();
            break;
          }

          const div = document.createElement('div');
          div.textContent = currentParagraph.textContent;

          cells.push([div]);
          const nextParagraph = currentParagraph.nextElementSibling;
          currentParagraph.remove();
          currentParagraph = nextParagraph;
        }
      }

      const block = toBlock(`video-transcript`, cells, document);
      element.parentNode.insertBefore(block, element.nextSibling);
    });
  }
}
