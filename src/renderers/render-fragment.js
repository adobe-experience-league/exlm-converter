import { fileURLToPath } from 'url';
import fs from 'fs';
import { join, dirname } from 'path';
import { addExtension } from '../modules/utils/path-utils.js';

// need this to work with both esm and commonjs
let dir;
try {
  dir = __dirname; // if commonjs, this will get current directory
} catch (e) {
  dir = dirname(fileURLToPath(import.meta.url)); // if esm, this will get current directory
}

/**
 * Renders fragment from filesystem at given path
 */
export default function renderFragment(path) {
  if (path) {
    const fragmentPath = join(dir, '..', addExtension(path, '.html'));
    // Get header and footer static content from Github
    if (fs.existsSync(fragmentPath)) {
      const html = fs.readFileSync(fragmentPath, 'utf-8');
      return {
        html,
      };
    }
    return {
      error: new Error(`Fragment: ${path} not found`),
    };
  }
  return {
    error: new Error('Tried to render fragment for an empty path'),
  };
}
