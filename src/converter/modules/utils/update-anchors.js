/**
 * the helix html2md pipeline diregards any "id" attributes on headers (and other els I believe)
 * so we need a way for these ids to survive the html2md pipeline. These IDs are used as anchors.
 * Here, we suffix the heading text with an icon whose name is anchor-<heading id>.
 * On the FE, we will use this icon name to restore the "id" on the heading.
 * @param {Document} document
 */
export const updateAnchors = (document) => {
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((headingEl) => {
    if (headingEl.id) {
      const anchor = document.createTextNode(`:anchor-${headingEl.id}:`);
      headingEl.appendChild(anchor);
    }
  });
};
