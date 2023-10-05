import * as WebImporter from '@adobe/helix-importer'

export default function createNote(document) {
  const noteElements = Array.from(
    document.getElementsByClassName('extension note')
  )
  noteElements.forEach((el) => {
    const cells = [['note']]
    Array.from(el.children).forEach((innerDiv) => {
      const div = document.createElement('div')
      div.innerHTML = `<p>${innerDiv.textContent}</p>`
      cells.push([div])
    })

    const block = WebImporter.DOMUtils.createTable(cells, document)
    el.parentNode.replaceChild(block, el)
  })
}
