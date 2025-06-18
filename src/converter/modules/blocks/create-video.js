import { toBlock, replaceElement } from '../utils/dom-utils.js';

export function createVideoTranscript(videoBlock, document) {
  const videoSibling = videoBlock.nextElementSibling;
  if (videoSibling?.tagName?.toLowerCase() !== 'details') return;
  const cells = [];

  Array.from(videoSibling.children).forEach((el) => {
    const div = document.createElement('div');
    div.append(el.textContent);
    cells.push([div]);
  });

  const block = toBlock(`video-transcript`, cells, document);
  replaceElement(videoSibling, block);
}

/**
 * create videoblock
 * @param {HTMLElement} videoElement
 * @param {Document} document
 */
async function createVideoBlockFromElement(videoElement, document) {
  const iframe = videoElement.querySelector('iframe');
  // If iframe exists, get the src attribute else iframe source will be passed as empty
  const href = iframe ? iframe.src : '';
  const div = document.createElement('div');
  const videoA = `<a href="${href}">${href}</a>`;
  div.innerHTML = `<p>${videoA}</p>`;
  // create the embed block and append it to the main element
  const cells = [[div]];
  const block = toBlock('embed', cells, document);
  replaceElement(videoElement, block);
  createVideoTranscript(block, document);
}

export default function createVideo(document) {
  const videoPromises = Array.from(
    document.getElementsByClassName('extension video'),
  ).map((videoEl) => createVideoBlockFromElement(videoEl, document));
  return Promise.allSettled(videoPromises);
}
