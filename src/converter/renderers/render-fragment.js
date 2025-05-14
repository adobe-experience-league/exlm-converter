import fs from 'fs';
import { join } from 'path';
import { addExtension } from '../modules/utils/path-utils.js';
import { formatHtml } from '../modules/utils/prettier-utils.js';
import { htmlFragmentToDoc } from '../modules/utils/dom-utils.js';

/**
 * Renders fragment from filesystem at given path
 * @param {string} path - path to fragment from 'src'
 * @param {string} parentFolderPath - path to parent folder of `fragments`
 * @returns {Promise<string>}
 */
async function getStaticFragment(path, parentFolderPath) {
  const fragmentPath = join(
    parentFolderPath,
    'static',
    addExtension(path, '.html'),
  );
  if (path) {
    // Get header and footer static content from Github
    if (fs.existsSync(fragmentPath)) {
      const body = htmlFragmentToDoc(fs.readFileSync(fragmentPath, 'utf-8'));
      return formatHtml(body);
    }
  }
  return undefined;
}
/**
 * Renders fragment from filesystem at given path
 * @param {string} path - path to fragment from 'src'
 * @param {string} parentFolderPath - path to parent folder of `fragments`
 */
export default async function renderFragment(path, parentFolderPath) {
  let body;
  try {
    body = await getStaticFragment(path, parentFolderPath);
  } catch (error) {
    return { error };
  }

  return {
    body,
    headers: {
      'Content-Type': 'text/html',
    },
  };
}
