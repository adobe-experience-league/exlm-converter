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
  blockSection.classList.add('section'); // add class so that other functions can tell this is a section
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

const SECTION_MAX_LENGTH = 1400;

/**
 * Split a section into smaller sections based on text length and headers.
 * @param {Document} document
 * @param {HTMLDivElement} section
 */
export const spiltSectionToSmallerSections = (document, section) => {
  const splittable = section.textContent.length > SECTION_MAX_LENGTH;
  const isAlreadySection = section.classList.contains('section');
  const hasChildren = section.firstElementChild;
  if (!splittable || isAlreadySection || !hasChildren) {
    // ensure has section class
    section.classList.add('section');
    return; // exit.
  }

  // create a new section
  const newSection = () => {
    const divEl = document.createElement('div');
    divEl.classList.add('section');
    section.before(divEl);
    return divEl;
  };

  // since the element will be moved to a new section, the next element is the first child of the section
  const nextEl = () => section.firstElementChild;

  // iterate over children of the section
  let currentEl = nextEl();
  let currentSection = newSection();
  while (currentEl) {
    const currentSectionReachedMaxLength =
      currentSection.textContent.length >= SECTION_MAX_LENGTH;
    const currentElIsHeader = getHeadingLevel(currentEl) !== -1;
    if (currentSectionReachedMaxLength && currentElIsHeader) {
      // if current section reached max length and current element is a header, create a new section
      currentSection = newSection();
    }
    currentSection.append(currentEl);
    // since the element is moved to a new section, the next element is the first child of the section
    currentEl = nextEl();
  }
  // no more elements left, remove this section
  section.remove();
};

/**
 * Organizes content within a document's main section into structured sections based on text length and headers.
 * @param {Document} document
 */
export const createSections = (document) => {
  const mainContent = document.body.querySelector('main');
  if (!mainContent) return;

  // ignore last 2 sections (toc and mini-toc)
  const sections = Array.from(mainContent.children).slice(0, -2);
  sections.forEach((section) =>
    spiltSectionToSmallerSections(document, section),
  );
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

/**
 * Retrieves the content of metadata tags.
 * @param {string} name The metadata name (or property)
 * @returns {string} The metadata value(s)
 */
export function getMetadata(document, name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...document.head.querySelectorAll(`meta[${attr}="${name}"]`)]
    .map((m) => m.content)
    .join(', ');
  return meta || '';
}

/**
 * Sets the content of metadata tags.
 */
export function setMetadata(document, name, content) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const existingMetaTags = [
    ...document.head.querySelectorAll(`meta[${attr}="${name}"]`),
  ];

  if (existingMetaTags.length === 0) {
    // Create a new meta tag if it doesn't exist
    const newMetaTag = document.createElement('meta');
    newMetaTag.setAttribute(attr, name);
    newMetaTag.setAttribute('content', content);
    document.head.appendChild(newMetaTag);
  } else {
    // Update existing meta tags
    existingMetaTags.forEach((metaTag) => {
      metaTag.content = content;
    });
  }
}

export function htmlFragmentToDoc(mainHTMLContentString) {
  return `
        <!doctype html>
        <html>
          <head>
            <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
          </head>
          <body>
            <header></header>
            <main>
            ${mainHTMLContentString}
            </main>
            <footer></footer>
          </body>
        </html>`;
}
