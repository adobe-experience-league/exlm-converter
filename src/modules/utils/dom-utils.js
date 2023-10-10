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
  let headingLevel = 1;

  const addToCurrentSection = (element) => {
    currentSection.push(element);
  };

  const addNewSection = (section) => {
    sections.push([...section]);
    currentSection = [];
  };

  Array.from(main.children).forEach((child) => {
    const childClone = child.cloneNode(true); // clone to avoid issues
    const currentLevel = getHeadingLevel(childClone); // get current child's heading level, or -1 of not a header

    if (currentLevel === -1) {
      // not a heading el, add it to current section
      addToCurrentSection(childClone);
    } else if (currentLevel > headingLevel) {
      // heading level is greater than current heading level, add to current section
      addToCurrentSection(childClone);
      headingLevel = currentLevel;
    } else {
      // heading level is less than or equal to current heading level, this marks the start of a new section
      addNewSection([...currentSection]);
      addToCurrentSection(childClone); // start the section with the new node
      headingLevel = currentLevel;
    }

    // reached the end, push the current, and last, section
    if (child === main.lastChild) {
      sections.push([...currentSection]);
    }

    child.remove(); // remove the child from the DOM
  });

  if (currentSection.length) {
    sections.push([...currentSection]);
  }

  sections.forEach((section) => {
    const $div = div(document);
    section.forEach((child) => {
      $div.appendChild(child);
    });
    main.appendChild($div);
  });
};
