import { toBlock } from '../utils/dom-utils.js';

// Gets language class eg- language-html
function getLanguageClass(element) {
  let languageName;
  if (element.classList) {
    const classNames = Array.from(element.classList);
    classNames.forEach((name) => {
      if (name.startsWith('language-')) {
        languageName = name;
      }
    });
  }
  return languageName || false;
}

export default function createCodeBlock(document) {
  const codeElements = Array.from(document.querySelectorAll('pre > code'));
  codeElements.forEach((element) => {
    const blockOptions = {};

    // Get hold of language information from <code> or <pre>
    let language = getLanguageClass(element);
    if (!language) {
      language = getLanguageClass(element.parentNode);
    }

    // default case i.e if language is not specified then add language-none
    if (!language) {
      language = 'language-none';
    }

    blockOptions.language = language;

    // if line number is available then get 'line-numbers'
    blockOptions.lineNumber = element.parentNode.classList.contains(
      'line-numbers',
    )
      ? 'line-numbers'
      : '';

    // if start line number is available then get 'data-start'
    blockOptions.startLine = element.parentNode.hasAttribute('data-start')
      ? `data-start-${element.parentNode.getAttribute('data-start')}`
      : '';

    // if data-line-offset is available then get 'data-line-offset'
    blockOptions.lineOffset = element.parentNode.hasAttribute(
      'data-line-offset',
    )
      ? `data-line-offset-${element.parentNode.getAttribute(
          'data-line-offset',
        )}`
      : '';

    // if highlight line number is avialble then get 'data-line'
    let highlightClass = '';
    if (element.parentNode.hasAttribute('data-line')) {
      blockOptions.highlight = element.parentNode.getAttribute('data-line');
      blockOptions.highlight.split(',').forEach((h) => {
        highlightClass += `h-${h.trim()} `;
      });
    } else {
      highlightClass = '';
    }

    const code = document.createElement('code');
    const pre = document.createElement('pre');
    code.innerHTML = element.innerHTML;
    pre.append(code);

    const cells = [[pre]];

    const block = toBlock(
      `Code (${blockOptions.language},${blockOptions.lineNumber}, ${blockOptions.startLine}, ${blockOptions.lineOffset}, ${highlightClass})`,
      cells,
      document,
    );
    element.parentNode.parentNode.replaceChild(block, element.parentNode);
  });
}
