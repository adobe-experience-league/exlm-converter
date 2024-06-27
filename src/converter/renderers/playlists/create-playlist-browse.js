import markdownItToHtml from '../../modules/MarkdownIt.js';
import { toBlock } from '../../modules/utils/dom-utils.js';

/**
 * Create Playlist Browse Block
 * @param {Document} document
 * @param {Playlist} playlist
 */
export function createPlaylistBrowse(document, playlist) {
  const firstSection = document.querySelector('main > div:first-child');
  const { FullBody } = playlist;
  const pageHtml = markdownItToHtml(FullBody);
  firstSection.append(toBlock('playlist-browse', [[pageHtml]], document));
}
