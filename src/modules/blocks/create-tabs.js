import * as WebImporter from '@adobe/helix-importer';

export default function createTabs(document) {
  const tabElements = Array.from(document.getElementsByClassName('sp-wrapper'));
  if (tabElements.length) {
    tabElements.forEach((element) => {
      // Check if the element is tab
      if (element.firstElementChild.nodeName === 'SP-TABS') {
        const tabs = element.querySelectorAll('sp-tabs > sp-tab');
        const tabsPanels = element.querySelectorAll('sp-tabs > sp-tab-panel');
        const cells = [['tabs']];
        tabs.forEach((tab, i) => {
          const tabName = document.createElement('div');
          const tabValue = document.createElement('div');
          tabName.innerHTML = `<p>${tab.getAttribute('label')}</p>`;
          tabValue.innerHTML = `<p>${tabsPanels[i].textContent}</p>`;
          cells.push([[tabName], [tabValue]]);
        });

        const block = WebImporter.DOMUtils.createTable(cells, document);
        element.parentNode.replaceChild(block, element);
      }
    });
  }
}
