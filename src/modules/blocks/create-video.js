import * as WebImporter from '@adobe/helix-importer'

export default function createVideo (document) {
  const videoElements = Array.from(
    document.getElementsByClassName('extension video')
  )
  videoElements.forEach(element => {
    const iframe = element.querySelector('iframe')
    const href = iframe ? iframe.src : ''
    const div = document.createElement('div')
    div.innerHTML = ` <p><img></p><p><a href="${href}">${href}</a></p> `
    const cells = [['embed'], [div]]
    const block = WebImporter.DOMUtils.createTable(cells, document)
    element.parentNode.replaceChild(block, element)
  })
}
