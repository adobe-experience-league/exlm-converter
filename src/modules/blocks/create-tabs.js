import * as WebImporter from '@adobe/helix-importer';

export default function createTabs(document) {
  const tabElements = Array.from(document.getElementsByClassName('sp-wrapper'));
  if (tabElements.length) {
    tabElements.forEach((element) => {
      // Check if the element is tab
      if (element.firstElementChild.nodeName === 'SP-TABS') {
        const divTabName = document.createElement('div');
        const divTabValue = document.createElement('div');
        const tabs = element.querySelectorAll('sp-tabs > sp-tab');
        const tabsPanels = element.querySelectorAll('sp-tabs > sp-tab-panel');
        tabs.forEach((tab) => {
          divTabName.innerHTML += `<div><p>${tab.getAttribute(
            'label',
          )}</p></div>`;
        });
        tabsPanels.forEach((tabsPanel) => {
          divTabValue.innerHTML += `<div><p>${tabsPanel.textContent}</p></div>`;
        });
        const cells = [['tabs'], [[divTabName], [divTabValue]]];
        const block = WebImporter.DOMUtils.createTable(cells, document);
        element.parentNode.replaceChild(block, element);
      }
    });
  }
}
