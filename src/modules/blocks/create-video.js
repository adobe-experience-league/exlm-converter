import { toBlock, replaceElement } from '../utils/dom-utils.js';

export default function createVideo(document) {
  const videoElements = Array.from(
    document.getElementsByClassName('extension video'),
  );
  if (videoElements.length) {
    videoElements.forEach((element) => {
      const iframe = element.querySelector('iframe');
      // If iframe exists, get the src attribute else iframe source will be passed as empty
      const href = iframe ? iframe.src : '';
      const div = document.createElement('div');
      div.innerHTML = `<p><img></p><p><a href="${href}">${href}</a></p> `;
      // create the embed block and append it to the main element
      const cells = [[div]];
      const block = toBlock('embed', cells, document);

      replaceElement(element, block);
    });
  }
}
