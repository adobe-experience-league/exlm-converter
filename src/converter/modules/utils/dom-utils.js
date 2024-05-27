import jsdom from 'jsdom';

global.Node = new jsdom.JSDOM().window.Node;
global.NodeFilter = new jsdom.JSDOM().window.NodeFilter;

/**
 * @param {string} className
 * @param {Document} document
 * @returns
 */
const div = (document, className) => {
  const d = document.createElement('div');
  if (className) d.className = className;
  return d;
};

const append = (parent, children) => {
  if (typeof children === 'string') {
    parent.innerHTML = children;
  } else if (Array.isArray(children)) {
    children.forEach((c) => {
      parent.append(c);
    });
  } else {
    parent.append(children);
  }
};

/**
 *
 * @param {string} className The class name of the block
 * @param {Array<Array<string|HTMLElement|Array<HTMLElement>>>} rows
 * @param {Document} document
 * @returns {HTMLDivElement} the block element (and subtree)
 */
export const toBlock = (className, rows, document) => {
  const parent = div(document, className.toLowerCase());
  rows.forEach((row) => {
    const rowDiv = div(document);
    row.forEach((cell) => {
      const cellDiv = div(document);
      append(cellDiv, cell);
      rowDiv.appendChild(cellDiv);
    });
    parent.appendChild(rowDiv);
  });
  return parent;
};

/**
 *
 * @param {HTMLElement} element
 * @returns {boolean} true if element is a div
 */
export const isDiv = (element) =>
  element && element.tagName.toLowerCase() === 'div';

/**
 *
 * @param {HTMLDivElement} block
 * @returns
 */
export const isValidBlock = (block) => {
  if (!block) throw new Error(`block is required`);
  if (!isDiv(block)) throw new Error(`block must be a div`);
  if (!block.classList.length > 0)
    throw new Error(`block must have at least one class`);

  // all rows must be divs
  const rows = Array.from(block.children);

  rows.forEach((row, index) => {
    if (!isDiv(row)) throw new Error(`Row ${index} is not a div`);
    const cells = Array.from(row.children);
    if (!cells.every(isDiv))
      throw new Error(`At least one cell in row ${index} is not a div`);
  });

  return true;
};

/**
 *
 * @param {HTMLDivElement} block
 * @param {Document} document
 * @returns
 */
export const blockToTable = (block, document) => {
  let valid = false;
  try {
    valid = isValidBlock(block);
  } catch (e) {
    console.error(e);
  }

  if (valid) {
    // create table header, first header row is the block's class names
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headerCell = document.createElement('th');
    headerCell.textContent = block.getAttribute('class');
    headerRow.appendChild(headerCell);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // create table body
    const tbody = document.createElement('tbody');
    [...block.children].forEach((row) => {
      const tr = document.createElement('tr');
      const cells = Array.from(row.children);
      cells.forEach((cell) => {
        const td = document.createElement('td');
        td.append(...Array.from(cell.childNodes));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  }

  // all else fails
  return block;
};

/**
 * Replace element with newElement
 * @param {HTMLElement} element
 * @param {HTMLElement} newElement
 */
export const replaceElement = (element, newElement) => {
  element.parentNode.replaceChild(newElement, element);
};

/**
 * if header, return heading level, if not -1
 * @param {HTMLElement} element
 */
const getHeadingLevel = (element) => {
  const match = element.tagName.toLowerCase().match(/^h(\d)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return -1;
};

/**
 * Creates a new section for the given element/block. The resulting dom contains up to 3 sections:
 * 1) the original section the block was in, containing elements before the block
 * 2) the new section containing only the block
 * 3) If there are elements after the block, a new section containing those elements
 * @param {Document} document
 * @param {Element} block the block element
 * @returns the new section the block is contained in
 */
export const createNewSectionForBlock = (document, block) => {
  const section = block.parentElement;
  const blockSection = document.createElement('div');
  const subsequenSection = document.createElement('div');
  section.after(blockSection);

  let nextPointer = block.nextElementSibling;
  if (nextPointer) {
    blockSection.after(subsequenSection);
    while (nextPointer) {
      const next = nextPointer.nextElementSibling;
      subsequenSection.append(nextPointer);
      nextPointer = next;
    }
  }

  return blockSection;
};

// Return the New Section from elements
export const createNewSectionForElements = (document, elements) => {
  const elementSection = document.createElement('div');
  let nextPointer = elements[0];
  // Iterate through the siblings and add current pointer element to the enclosing div
  while (nextPointer) {
    const next = nextPointer.nextElementSibling;
    elementSection.appendChild(nextPointer);
    nextPointer = next;
  }
  return elementSection;
};

/**
 * Organizes content within a document's main section into structured sections based on text length and headers, excluding any content within 'shade-box' areas.
 * @param {Document} document - The DOM document to manipulate.
 */
export const createSections = (document) => {
  const mainContent = document.body.querySelector('main');
  if (!mainContent) return;

  const firstDiv = mainContent.querySelector('div');
  if (!firstDiv) return;

  // Fragement to store the sections
  const finalizedSections = document.createDocumentFragment();

  // Temporary Array to store elements
  let currentSection = [];
  let currentSectionLength = 0;

  // Fuction to finalise and reset the temporary Array elements and length
  const resetSection = () => {
    const newSection = createNewSectionForElements(document, currentSection);
    finalizedSections.appendChild(newSection);
    currentSection = [];
    currentSectionLength = 0;
  };

  // Determine if an element is a header based on its tag level.
  const isHeaderElement = (element) => getHeadingLevel(element) > -1;

  // Function to find the Elements for one Section based on 1400 Char Limit
  const findElementsForSection = (element) => {
    const elementTextLength = element.textContent.length;

    // Add element to temp array if element char limit doesnot exceeds the 1400
    if (currentSectionLength + elementTextLength < 1400) {
      currentSection.push(element);
      currentSectionLength += elementTextLength;
    } else {
      // If last element is header add it as part of new temp array and reset the temp array
      const lastElement = currentSection[currentSection.length - 1];
      const lastElementIsHeader =
        currentSection.length && isHeaderElement(lastElement);
      if (lastElementIsHeader) {
        currentSection.pop();
        resetSection();
        currentSection.push(lastElement);
        currentSectionLength += lastElement.length;
      }
      // Add element to temp array and update it's length
      currentSection.push(element);
      currentSectionLength += elementTextLength;
      // If this is last element to be processed then finalize the section
      const isLastChild = element === firstDiv.lastChild;
      if (isLastChild) {
        resetSection();
      }
    }
  };

  // Iterate through children of the first division and process each element
  Array.from(firstDiv.children).forEach((child) => {
    findElementsForSection(child);
  });

  // Insert the finalized sections before the first child of the main content area and clear it's contents from DOM
  mainContent.insertBefore(finalizedSections, mainContent.firstChild);
  firstDiv.remove();
};

/**
 * @typedef {Object} ListOptions
 * @property {string} tag - either ul or ol
 * @property {Array<HTMLElement>} items - elements
 *
 * @param {ListOptions} options
 * @param {Document} document
 * @returns
 */
export const newHtmlList = (document, { tag = 'ul', items = [] }) => {
  const list = document.createElement(tag);
  items.forEach((item) => {
    const li = document.createElement('li');
    append(li, item);
    list.appendChild(li);
  });
  return list;
};

/**
 * Modifies the href attribute of anchor elements with target="_blank" to include "#_blank" in the URL.
 *
 * @param {Document} document - The document object to search for anchor elements.
 */
export const handleExternalUrl = (document) => {
  const anchorElements = document.querySelectorAll('a');
  if (!anchorElements) return;

  anchorElements.forEach((anchor) => {
    const targetAttribute = anchor.getAttribute('target');
    if (targetAttribute && targetAttribute === '_blank') {
      const currentHref = anchor.getAttribute('href');
      anchor.setAttribute('href', `${currentHref}#_blank`);
    }
  });
};

// see: https://www.w3schools.com/html/html_blocks.asp
const INLINE_ELEMENTS = new Set(
  'a|abbr|acronym|b|bdo|big|br|button|cite|code|dfn|em|i|img|input|kbd|label|map|object|output|q|samp|script|select|small|span|strong|sub|sup|textarea|time|tt|var'.split(
    '|',
  ),
);

const isInlineElement = (element) =>
  INLINE_ELEMENTS.has(element.tagName.toLowerCase());

/**
 * Groups adjacent inline elements into paragraphs (leaves block level elements as they are)
 * see INLINE_ELEMENTS above for a full list of inline elements that will be grouped within paragraphs.
 * @param {Document} document
 * @param {ChildNode[]} nodes
 * @returns {HTMLElement[]}
 */
export const groupWithParagraphs = (document, nodes) => {
  const result = [];
  let currentParagraph = document.createElement('p');
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    // encountered a block level element
    if (node.nodeType === Node.ELEMENT_NODE && !isInlineElement(node)) {
      if (currentParagraph.childNodes.length > 0) {
        // close current paragraph, start new one
        result.push(currentParagraph);
        currentParagraph = document.createElement('p');
      }
      // push block level element to result
      result.push(node);
    } else {
      // encountered inline level element, add to parapgraph
      currentParagraph.appendChild(node);
    }
  }
  // push last paragraph
  if (currentParagraph.childNodes.length > 0) {
    result.push(currentParagraph);
  }
  return result;
};

/**
 *
 * @param {Document} document
 * @param {HTMLElement} element
 * @returns {Node[]}
 */
export const getAllDecendantTextNodes = (document, element) => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );
  const textNodes = [];
  while (walker.nextNode()) {
    const { currentNode } = walker;
    if (currentNode.textContent.trim().length !== 0) {
      textNodes.push(walker.currentNode);
    }
  }
  return textNodes;
};

/**
 * creates an element from html string
 * @param {Document} document
 */
export function htmlToElement(document) {
  /**
   * @param {string} html
   */
  return (html) => {
    const template = document.createElement('template');
    const trimmedHtml = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = trimmedHtml;
    return template.content.firstElementChild;
  };
}
