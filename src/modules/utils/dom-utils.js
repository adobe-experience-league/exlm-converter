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
  const parent = div(document, className);
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
 *
 * @param {Document} document
 */
export const createSections = (document) => {
  console.log(`create sections`);
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
 * Creates and appends meta elements to the document's head based on the provided meta string.
 *
 * @param {Document} document - The Document object representing the web page.
 * @param {string} meta - The string containing key-value pairs to be converted into meta elements.
 * @returns {void}
 */
export const createMetaData = (document, meta) => {
  const lines = meta.split('\n');
  const fragment = document.createDocumentFragment();

  lines.forEach((line) => {
    const [key, value] = line.split(': ');
    const metaEl = document.createElement('meta');
    metaEl.setAttribute('name', key);
    metaEl.setAttribute('content', value);
    fragment.appendChild(metaEl);
  });

  document.head.appendChild(fragment);
};
