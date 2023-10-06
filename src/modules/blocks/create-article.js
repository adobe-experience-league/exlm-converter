import * as WebImporter from '@adobe/helix-importer'

export default function createRelatedArticles (document) {
  const articleElements = Array.from(document.getElementsByClassName('extension relatedarticles'))

  if (articleElements.length !== 0) {
  // Handle the case when only matching elements are found.
  articleElements.forEach(function (element) {
      const divElementTag = document.createElement('div')
      if (element.children.length >= 2) {
        // Extracting Title of Related Articles.
        divElementTag.innerHTML = `<p>${element.children[0].textContent}</p>`
        const divInnerElementTag = document.createElement('div')
        const ulElementTag = document.createElement('ul')
        // Extracting Inner Div Element of Related Articles.
        const divElement = element.children[1]
        // Extracting Ul Element under Inner Div Element
        const ulElement = divElement.querySelector('ul')
        // Handle the case when only matching Ul elements are found.
        if (ulElement) {
          const liElements = ulElement.querySelectorAll('li')
          // Handle the case when only matching li elements are found and extract the Anchor and Li Tag Attributes
          liElements.forEach(function (li) {
            const anchorElement = li.querySelector('a')
            if (anchorElement) {
              const aHref = anchorElement.getAttribute('href')
              const aText = anchorElement.textContent
              const aElementTag = document.createElement('a')
              aElementTag.setAttribute('href', aHref)
              aElementTag.setAttribute('title', aText)
              aElementTag.textContent = aText
              const liElementTag = document.createElement('li')
              liElementTag.append(aElementTag)
              ulElementTag.append(liElementTag)
            }
          })
          divInnerElementTag.append(ulElementTag)
        } else {
        // Handle the case when the <ul> element is missing and we have any other Tag Structure
          divInnerElementTag.append(divElement)
        }
        // Update the DOM with the modified Structure 
        const cells = [['related articles'], [divElementTag], [divInnerElementTag]]
        const block = WebImporter.DOMUtils.createTable(cells, document)
        element.parentNode.replaceChild(block, element)
      }
    })
  }
}
