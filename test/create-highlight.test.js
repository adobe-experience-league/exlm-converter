/* eslint-disable no-undef, no-unused-vars, no-unused-expressions */
import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import createHighlight from '../src/converter/modules/blocks/create-highlight.js';

describe('createHighlight', () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <main>
            <span class="preview">Click <strong>Swatches</strong> to select a predefined color.</span>
          </main>
        </body>
      </html>
    `);
    document = dom.window.document;
  });

  it('should highlight text nodes correctly', () => {
    createHighlight(document);

    const highlightedElements = document.querySelectorAll('em > u');
    expect(highlightedElements).to.have.lengthOf(3);
    expect(highlightedElements[0].textContent).to.equal('Click ');
    expect(highlightedElements[1].textContent).to.equal('Swatches');
    expect(highlightedElements[2].textContent).to.equal(
      ' to select a predefined color.',
    );
  });

  it('should preserve whitespace between elements', () => {
    createHighlight(document);

    const mainContent = document.querySelector('main');

    const actualHTML = mainContent.innerHTML.replace(/\s+/g, ' ').trim();
    const expectedHTML =
      '<em><u>Click </u></em><strong><em><u>Swatches</u></em></strong><em><u> to select a predefined color.</u></em>';

    expect(actualHTML).to.equal(expectedHTML);
    // Output the HTML for debugging
    console.log(
      'should preserve whitespace between elements',
      mainContent.innerHTML,
    );
  });

  it('should handle section highlights correctly', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
        <main>
            <div>
                <div class="preview">
                    <div>The way we currently highlight text is to add tags. This word is <strong>bold</strong></div>
                </div>
            </div>
        </main>
        </body>
      </html>
    `);
    document = dom.window.document;

    createHighlight(document);

    const sectionMetadata = document.querySelector(
      '.section > .section-metadata',
    );
    // Output the HTML for debugging
    console.log(
      'should handle section highlights correctly',
      document.body.innerHTML,
    );
    expect(sectionMetadata).to.exist;
  });
});
