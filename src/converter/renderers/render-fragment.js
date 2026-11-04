import fs from 'fs';

import { join } from 'path';
import { addExtension } from '../modules/utils/path-utils.js';
import { formatHtml } from '../modules/utils/prettier-utils.js';
import { htmlFragmentToDoc } from '../modules/utils/dom-utils.js';
import { readFile } from '../../common/utils/file-utils.js';

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

async function getDynamicFragment(path) {
  const buffer = await readFile(path);
  return buffer.toString();
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

  if (!body) {
    // dynamic fragments are used when we have to split a page into multiple fragments
    // for example, when handling pages with too many images (over 100, @see too-many-images.js)
    body = await getDynamicFragment(path);
  }

  if (!body) {
    return {
      error: new Error(`Fragment: ${path} not found`),
    };
  }

  return {
    body,
    headers: {
      'Content-Type': 'text/html',
    },
  };
}
