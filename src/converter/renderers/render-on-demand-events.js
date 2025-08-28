import fs from 'fs';

import { join } from 'path';
import { addExtension } from '../modules/utils/path-utils.js';
import { formatHtml } from '../modules/utils/prettier-utils.js';
import { htmlFragmentToDoc } from '../modules/utils/dom-utils.js';
import { matchOnDemandEventPath } from '../modules/utils/path-match-utils.js';

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
 * Renders on demand event from filesystem at given path
 * @param {string} path - path to on demand event from 'src'
 * @param {string} parentFolderPath - path to parent folder of `on-demand-events`
 */
export default async function renderOnDemandEvent(path, parentFolderPath) {
  const {
    params: { lang, onDemandEventId },
  } = matchOnDemandEventPath(path);

  let body;
  try {
    body = await getStaticFragment(
      `fragments/${lang}/on-demand-events/${onDemandEventId}`,
      parentFolderPath,
    );
  } catch (error) {
    return { error };
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
