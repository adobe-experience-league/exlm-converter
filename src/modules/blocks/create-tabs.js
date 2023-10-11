import { replaceElement, toBlock } from '../utils/dom-utils.js';

export default function createTabs(document) {
  const tabElements = Array.from(document.getElementsByClassName('sp-wrapper'));
  if (tabElements.length) {
    tabElements.forEach((element) => {
      // Check if the element is tab
      if (element.firstElementChild.nodeName === 'SP-TABS') {
        const tabs = element.querySelectorAll('sp-tabs > sp-tab');
        const tabsPanels = element.querySelectorAll('sp-tabs > sp-tab-panel');
        const cells = Array.from(tabs).map((tab, i) => {
          const tabName = document.createElement('div');
          const tabValue = document.createElement('div');
          tabName.innerHTML = `<p>${tab.getAttribute('label')}</p>`;
          tabValue.innerHTML = `<p>${tabsPanels[i].textContent}</p>`;
          return [[tabName], [tabValue]];
        });

        const block = toBlock('tabs', cells, document);
        replaceElement(element, block);
      }
    });
  }
}
