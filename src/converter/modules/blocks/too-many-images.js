import {
  createNewSectionForBlock,
  htmlFragmentToDoc,
  toBlock,
} from '../utils/dom-utils.js';
import { writeFile } from '../utils/file-utils.js';

const MAX_IMAGE_COUNT = 100;

const getImages = (element) => {
  if (element.tagName === 'IMG') {
    return [element];
  }
  return [...element.querySelectorAll('img')];
};

class Fragments {
  /**
   * @param {String} pagePath
   */
  constructor(pagePath) {
    /** @type {HTMLElement[][]} */
    this.fragments = [];
    /** @type {number} */
    this.currentFragmentIndex = 0;
    this.currentElement = undefined;
    /** @type {String} */
    this.pagePath = pagePath;
  }

  /**
   * @param {HTMLElement} element
   */
  add(element) {
    if (!this.canAdd(element)) {
      this.next();
    }
    if (this.fragments[this.currentFragmentIndex] === undefined)
      this.fragments[this.currentFragmentIndex] = [];
    this.fragments[this.currentFragmentIndex].push(element);
    this.currentElement = element;
  }

  /**
   * @param {HTMLElement} element
   * @returns
   */
  canAdd(element) {
    if (this.fragments[this.currentFragmentIndex] === undefined) return true;
    const fragmentImageCount = this.fragments[this.currentFragmentIndex].reduce(
      (acc, el) => acc + getImages(el).length,
      0,
    );
    return fragmentImageCount + getImages(element).length <= MAX_IMAGE_COUNT;
  }

  next() {
    this.writeCurrentFragment();
    this.currentFragmentIndex += 1;
  }

  /**
   * @typedef WriteOptions
   * @property {HTMLElement} element
   * @property {HTMLElement} parent
   */
  /**
   *
   * @param {WriteOptions} options
   * @returns
   */
  async writeCurrentFragment() {
    const fragment = this.fragments[this.currentFragmentIndex];
    // TODO write the fragment to files
    if (this.currentElement) {
      const document = this.currentElement.ownerDocument;
      const section = document.createElement('div');
      section.classList.add('section');
      const a = document.createElement('a');
      const block = toBlock('fragment', [[a]], document);
      this.currentElement.after(block);

      const newSection = createNewSectionForBlock(document, block);
      newSection.appendChild(block);

      fragment.forEach((el) => {
        section.append(el.cloneNode(true));
        el.remove();
      });

      const fragmentPath = `/fragments${this.pagePath}/fragment-${this.currentFragmentIndex}.html`;
      a.href = fragmentPath;
      a.innerHTML = fragmentPath;

      const fragmentDoc = htmlFragmentToDoc(section.outerHTML);
      await writeFile({
        filePath: fragmentPath,
        arrayBuffer: new TextEncoder().encode(fragmentDoc),
      });
      // this.currentElement.insertAdjacentElement('afterend', block.innerHTML);
    }
  }
}

/**
 * @param {Document} document
 */
export default function handleTooManyImages(document, path) {
  const images = document.querySelectorAll('img');
  if (images.length <= MAX_IMAGE_COUNT) return;
  const main = document.querySelector('main');
  const sections = Array.from(main.children).slice(0, -2);
  let currentImageCount = 0;

  const fragments = new Fragments(path);

  sections.forEach((section) => {
    [...section.children].forEach((child) => {
      currentImageCount += getImages(child).length;
      if (currentImageCount > MAX_IMAGE_COUNT) {
        fragments.add(child);
      }
    });
    fragments.next();
  });
}
