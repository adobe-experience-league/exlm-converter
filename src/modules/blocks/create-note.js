import * as WebImporter from '@adobe/helix-importer';

export default function createNote(document) {
    const noteElements = Array.from(document.querySelectorAll(".extension"));
    noteElements.forEach((el) => {
        el.classList.remove("extension")
        const noteBlockName = `note (${el.classList})`
        const cells = [[noteBlockName]]

        Array.from(el.children).forEach((innerDiv) => {
            const div = document.createElement("div")
            console.log(innerDiv.textContent)
            div.innerHTML = `<p>${innerDiv.textContent}</p>`
            cells.push([div])
        })
        const block = WebImporter.DOMUtils.createTable(cells, document);
        el.parentNode.replaceChild(block, el);
    })
}