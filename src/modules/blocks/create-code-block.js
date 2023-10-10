import * as WebImporter from '@adobe/helix-importer';

// Gets language class eg- language-html
function getLanguageClass(element) {
  if (element.classList) {
    const classNames = element.classList;
    classNames.forEach((name) => {
      if (name.startsWith('language-')) {
        return name;
      }
      return false;
    });
  }
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
    if (!language) {
      language = 'language-none';
    }

    blockOptions.language = language;

    // if line number is available then get 'line-numbers'
    if (element.parentNode.classList.contains('line-numbers')) {
      blockOptions.lineNumber = 1;
    }

    // if start line number is available then get 'data-start'
    if (element.parentNode.hasAttribute('data-start')) {
      blockOptions.startLine = element.parentNode.getAttribute('data-start');
    }

    // if highlight line number is avialble then get 'data-line'
    if (element.parentNode.hasAttribute('data-line')) {
      blockOptions.highlight = element.parentNode.getAttribute('data-line');
    }

    if (element.parentNode.hasAttribute('data-line-offset')) {
      blockOptions.lineOffset =
        element.parentNode.getAttribute('data-line-offset');
    }

    const code = document.createElement('code');
    const pre = document.createElement('pre');
    code.innerHTML = element.innerHTML;
    pre.append(code);

    const cells = [
      ['code'],
      ['language', blockOptions.language],
      ['line', blockOptions.highlight],
      ['line-numbers', blockOptions.lineNumber],
      ['start', blockOptions.startLine],
      ['line-offset', blockOptions.lineOffset],
      [pre],
    ];

    const block = WebImporter.DOMUtils.createTable(cells, document);
    element.parentNode.parentNode.replaceChild(block, element.parentNode);
  });
}
