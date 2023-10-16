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

    console.log(block.innerHTML);
    // create table body
    const tbody = document.createElement('tbody');
    [...block.children].forEach((row) => {
      const tr = document.createElement('tr');
      const cells = Array.from(row.children);
      cells.forEach((cell) => {
        const td = document.createElement('td');
        // console.log(cell.innerHTML)
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
