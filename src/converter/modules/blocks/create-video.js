import { getMpcVideoDetailsByUrl } from '../../../common/utils/mpc-util.js';
import { toBlock, replaceElement } from '../utils/dom-utils.js';

async function createVideoBlockFromElement(videoElement, document) {
  const iframe = videoElement.querySelector('iframe');
  // If iframe exists, get the src attribute else iframe source will be passed as empty
  const href = iframe ? iframe.src : '';
  const div = document.createElement('div');
  const videoA = `<a href="${href}">${href}</a>`;
  const videoDetails = await getMpcVideoDetailsByUrl(href);
  const poster = videoDetails?.video?.poster;
  const videoImg = poster ? `<img src="${poster}" alt="video poster">` : '';
  console.log('poster', poster);
  div.innerHTML = `<p>${videoImg}</p><p>${videoA}</p>`;
  // create the embed block and append it to the main element
  const cells = [[div]];
  const block = toBlock('embed', cells, document);

  replaceElement(videoElement, block);
}

export default async function createVideo(document) {
  const videoElements = Array.from(
    document.getElementsByClassName('extension video'),
  );
  await Promise.allSettled(
    videoElements.map((videoElement) =>
      createVideoBlockFromElement(videoElement, document),
    ),
  );
}
