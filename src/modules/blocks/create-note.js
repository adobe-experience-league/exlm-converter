import * as WebImporter from '@adobe/helix-importer';

export default function createNote(document) {
    //Notes have class extension along with the variation name.
    const noteElements = Array.from(document.querySelectorAll(".extension"));

    noteElements.forEach((el) => {
        el.classList.remove("extension")
        const variation = el.classList[0]
        const cells = [[`note (${variation})`]]

        switch (variation) {
            case "video":
                break;
            case "relatedarticles":
                //Add title
                const div = document.createElement("div")
                div.innerHTML = `<p>${el.children[0].textContent}</p>`
                cells.push([div])
                //Add Links
                cells.push([el.children[1]])
                break;
            default:
                //Row for each divs inside a note
                Array.from(el.children).forEach((innerDiv) => {
                    const div = document.createElement("div")
                    div.innerHTML = `<p>${innerDiv.textContent}</p>`
                    cells.push([div])
                })
                break;
        }
        const block = WebImporter.DOMUtils.createTable(cells, document);
        el.parentNode.replaceChild(block, el);

    })
}

