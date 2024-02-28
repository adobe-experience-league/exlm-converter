import jsdom from 'jsdom';
import yaml from 'js-yaml';
import { DOCPAGETYPE } from '../../doc-page-types.js';

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

/**
 *
 * @param {Document} document
 */
export const createSections = (document) => {
  const main = document.body.querySelector('main');
  if (!main) return;
  const sections = [];
  let currentSection = [];

  const addToCurrentSection = (element, commit, isLast) => {
    if (commit) {
      if (currentSection.length) sections.push([...currentSection]);
      currentSection = [element];
    } else if (isLast) {
      currentSection.push(element);
      sections.push([...currentSection]);
    } else {
      currentSection.push(element);
    }
  };

  Array.from(main.children).forEach((child) => {
    const childClone = child.cloneNode(true); // clone to avoid issues
    const isHeading = getHeadingLevel(childClone) > -1; // get current child's heading level, or -1 of not a header

    // is last
    const isLast = child === main.lastChild;
    addToCurrentSection(childClone, isHeading, isLast);
    child.remove(); // remove the child from the DOM
  });

  if (currentSection.length) {
    sections.push([...currentSection]);
  }

  sections.forEach((section) => {
    const $div = div(document);
    // if array, oush all children
    section.forEach((child) => {
      $div.appendChild(child);
    });
    main.appendChild($div);
  });
};

/**
 * Generates an SEO-friendly string by combining input arguments.
 *
 * @param {string} arg - The main argument for the SEO string.
 * @param {string} additive - Additional content to be included in the SEO string.
 * @param {string} req - The required content, used if additive does not include it.
 * @returns {string} - The SEO-friendly string.
 */
const seo = (arg = '', additive = '', req = 'Adobe') =>
  `${arg} | ${additive.includes(req) ? additive : `${req} ${additive}`}`;

/**
 * Consolodate CSV properties into one unique CSV property under a new name.
 * @param {string} prop1 the first property to consolodate, in obj
 * @param {string} prop2 the second property to consolodate, in obj
 * @param {Object} obj the object containing the properties
 * @param {string} newPropName the new property name to store the consolodated values
 */
const consolodateCSVProperties = (prop1, prop2, obj, newPropName) => {
  if (obj[prop1] && obj[prop2]) {
    const csvArray1 =
      obj[prop1].split(',')?.map((s) => s.trim().toLowerCase()) || [];
    const csvArray2 =
      obj[prop2]?.split(',')?.map((s) => s.trim().toLowerCase()) || [];
    const combined = new Set([...csvArray1, ...csvArray2]);
    delete obj[prop1];
    delete obj[prop2];
    obj[newPropName] = Array.from(combined).join(', ');
  }
};

/**
 * Creates and appends meta elements to the document's head based on the provided meta string.
 *
 * @param {Document} document - The Document object representing the web page.
 * @param {string} meta - The string containing key-value pairs to be converted into meta elements.
 * @returns {void}
 */
export const createMetaData = (document, meta, data, pageType) => {
  const fragment = document.createDocumentFragment();
  const fullMetadata = yaml.load(meta);

  // EXL API returns both "robots" and "ROBOTS" properties. Combine them into one.
  consolodateCSVProperties('robots', 'ROBOTS', fullMetadata, 'robots');

  // Metadata from data key API Response
  const metaProperties = [
    { name: 'id', content: data.id },
    { name: 'keywords', content: data.Keywords || '' },
  ];

  metaProperties.forEach((property) => {
    const metaTag = document.createElement('meta');
    Object.entries(property).forEach(([key, value]) => {
      metaTag.setAttribute(key, value);
    });
    document.head.appendChild(metaTag);
  });

  // Dynamic Metadata from API
  Object.entries(fullMetadata).forEach(([key, value]) => {
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', key);

    // Handle title and solution combination
    if (
      pageType === DOCPAGETYPE.DOC_ARTICLE &&
      key === 'title' &&
      fullMetadata.solution
    ) {
      let solution;

      if (typeof fullMetadata.solution === 'string') {
        // eslint-disable-next-line prefer-destructuring
        solution = fullMetadata.solution.split(',')[0];
      } else if (Array.isArray(fullMetadata.solution)) {
        // eslint-disable-next-line prefer-destructuring
        solution = fullMetadata.solution[0];
      } else {
        solution = fullMetadata.solution;
      }
      // In case of "General" solution, defaults to "Experience Cloud".
      if (solution === 'General') {
        solution = 'Experience Cloud';
      }
      metaTag.setAttribute('content', seo(value, solution, 'Adobe'));
    } else {
      metaTag.setAttribute('content', value);
    }

    fragment.appendChild(metaTag);
  });

  document.head.appendChild(fragment);
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
