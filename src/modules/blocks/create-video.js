import * as WebImporter from '@adobe/helix-importer';

export default function createVideo(document) {
  const videoElements = Array.from(
    document.getElementsByClassName('extension video'),
  );
  videoElements.forEach((element) => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    const href = element.querySelector('iframe').src;

    const p1 = document.createElement('p');
    p1.append(img);

    const p2 = document.createElement('p');
    p2.innerHTML = `<a href="${href}">${href}</a>`;

    div.append(p1);
    div.append(p2);

    const cells = [['embed'], [div]];

    const block = WebImporter.DOMUtils.createTable(cells, document);
    element.parentNode.replaceChild(block, element);
  });
}
