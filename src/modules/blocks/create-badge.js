import * as WebImporter from '@adobe/helix-importer';

export default function createBadge(document) {
  const BadgeElements = Array.from(
    document.getElementsByClassName('sp-badge-wrapper'),
  );
  BadgeElements.forEach((element) => {
    if (element.parentElement.closest('a')) {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const a = document.createElement('a');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const href = element.parentNode.getAttribute('href');
      const spBadge = element.querySelector('sp-badge');
      a.textContent = spBadge.textContent;

      a.setAttribute('href', href);
      p.append(a);
      div1.append(p);

      const variant = spBadge.getAttribute('variant');
      const title = spBadge.getAttribute('title');

      let cells = [[`Badge (${variant})`], [div1]];

      if (title !== null) {
        p2.textContent = title;
        div2.append(p2);

        cells = [[`Badge (${variant})`], [div1], [div2]];
      }

      const block = WebImporter.DOMUtils.createTable(cells, document);
      element.parentNode.parentNode.parentNode.replaceChild(
        block,
        element.parentNode.parentNode,
      );
    } else {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const p2 = document.createElement('p');
      const spBadge = element.querySelector('sp-badge');
      div1.textContent = element.querySelector('sp-badge').textContent;

      const variant = spBadge.getAttribute('variant');
      const title = spBadge.getAttribute('title');

      let cells = [[`Badge (${variant})`], [div1]];

      if (title !== null) {
        p2.textContent = title;
        div2.append(p2);

        cells = [[`Badge (${variant})`], [div1], [div2]];
      }

      const block = WebImporter.DOMUtils.createTable(cells, document);
      element.parentNode.replaceChild(block, element);
    }
  });
}
