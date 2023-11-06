import fs from 'fs';
import { join } from 'path';
import { addExtension } from '../modules/utils/path-utils.js';

/**
 * Renders fragment from filesystem at given path
 * @param {string} path - path to fragment from 'src'
 * @param {string} parentFolderPath - path to parent folder of `fragments`
 */
export default function renderFragment(path, parentFolderPath) {
  const fragmentPath = join(parentFolderPath, addExtension(path, '.html'));
  if (path) {
    // Get header and footer static content from Github
    if (fs.existsSync(fragmentPath)) {
      const html = fs.readFileSync(fragmentPath, 'utf-8');
      return {
        html,
      };
    }
    return {
      error: new Error(`Fragment: ${fragmentPath} not found`),
    };
  }
  return {
    error: new Error('Tried to render fragment for an empty path'),
  };
}
