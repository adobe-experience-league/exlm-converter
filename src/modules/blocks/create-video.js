import * as WebImporter from '@adobe/helix-importer'

export default function createVideo (document) {
  const videoElements = Array.from(
    document.getElementsByClassName('extension video')
  )
  videoElements.forEach(function (element) {
    const div = document.createElement('div')
    const href = element.querySelector('iframe').src
    if (href !== null) {
      div.innerHTML = `<p><img src=""></p><p><a href="${href}">${href}</a></p>`
    }
    const cells = [['embed'], [div]]

    const block = WebImporter.DOMUtils.createTable(cells, document)
    element.parentNode.replaceChild(block, element)
  })
}
