import * as WebImporter from '@adobe/helix-importer';

// For list of icons refer - https://github.com/adobe-experience-league/exlm/tree/main/icons
const iconMapping = {
  important: 'alert',
  warning: 'warning',
  caution: 'warning',
  error: 'warning',
};

export default function createNote(document) {
  // Notes have class extension along with the variation name.
  const noteElements = Array.from(
    document.querySelectorAll('.extension:not(.relatedarticles):not(.video)'),
  );

  noteElements.forEach((el) => {
    el.classList.remove('extension');
    const variation = el.classList[0];
    const cells = [[`note (${variation})`]];
    const svgName = iconMapping[variation] ? iconMapping[variation] : 'info'; // Make default icon - info

    // Row for each divs inside a note
    Array.from(el.children).forEach((innerDiv, i) => {
      const div = document.createElement('div');
      if (i === 0) {
        div.innerHTML = `<p>:${svgName}: ${innerDiv.textContent}</p>`; // Add icon for note heading
      } else {
        div.innerHTML = `<p>${innerDiv.textContent}</p>`;
      }
      cells.push([div]);
    });
    const block = WebImporter.DOMUtils.createTable(cells, document);
    el.parentNode.replaceChild(block, el);
  });
}
