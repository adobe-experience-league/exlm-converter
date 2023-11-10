import { replaceElement, toBlock } from '../utils/dom-utils.js';

// For list of icons refer - https://github.com/adobe-experience-league/exlm/tree/main/icons
const iconMapping = {
  important: 'alert',
  warning: 'warning',
  caution: 'warning',
  error: 'warning',
  success: 'check',
};

export default function createNote(document) {
  // Notes have class extension along with the variation name.
  const noteElements = Array.from(
    document.querySelectorAll('.extension:not(.relatedarticles):not(.video)'),
  );

  noteElements.forEach((el) => {
    el.classList.remove('extension');
    const variation = el.classList[0];
    const cells = [];
    const svgName = iconMapping[variation] ? iconMapping[variation] : 'info'; // Make default icon - info

    Array.from(el.children).forEach((innerDiv, i) => {
      if (i === 0) {
        const div = document.createElement('div');
        div.innerHTML = `<p>:${svgName}: ${innerDiv.textContent}</p>`; // Add icon for note heading
        cells.push([div]);
      } else {
        // Add rows for multiple paragraphs
        Array.from(innerDiv.children).forEach((innerElement) => {
          const div = document.createElement('div');
          div.append(innerElement);
          cells.push([div]);
        });
      }
    });
    const block = toBlock(`note ${variation}`, cells, document);
    replaceElement(el, block);
  });
}
