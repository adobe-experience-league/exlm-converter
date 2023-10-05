import * as WebImporter from '@adobe/helix-importer'

export default function createNote (document) {
  // Notes have class extension along with the variation name.
  const noteElements = Array.from(document.querySelectorAll('.extension:not(.relatedarticles):not(.video)'))

  noteElements.forEach((el) => {
    el.classList.remove('extension')
    const variation = el.classList[0]
    const cells = [[`note (${variation})`]]

    // Row for each divs inside a note
    Array.from(el.children).forEach((innerDiv) => {
      const div = document.createElement('div')
      div.innerHTML = `<p>${innerDiv.textContent}</p>`
      cells.push([div])
    })
    const block = WebImporter.DOMUtils.createTable(cells, document)
    el.parentNode.replaceChild(block, el)
  })
}
