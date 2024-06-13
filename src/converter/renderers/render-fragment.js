import fs from 'fs';
import { dirname, join, parse } from 'path';
import ejs from 'ejs';
import yaml from 'js-yaml';
import { addExtension } from '../modules/utils/path-utils.js';
import ejsUtils from './utils/ejs-utils.js';
import { formatHtml } from '../modules/utils/prettier-utils.js';
import { htmlFragmentToDoc } from '../modules/utils/dom-utils.js';
import { readFile } from '../modules/utils/file-utils.js';

/**
 * Parse all YAML files in the given directory and return an object where each entry is the yaml file name and the value is the parsed yaml
 * @param {string} directory
 */
function getOptionsInDirectory(directory) {
  // get all yaml files in directory
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.yaml'));
  if (!files || !files.length) return {};
  // create an opject where each entry is the yaml file name and the value is the parsed yaml
  return files.reduce((returnObject, file) => {
    const property = parse(file).name;
    const value = yaml.load(fs.readFileSync(join(directory, file), 'utf-8'));
    returnObject[property] = value;

    return returnObject;
  }, {});
}

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
      const folder = dirname(fragmentPath);

      const ejsData = {
        ...getOptionsInDirectory(folder), // make all yaml files in the folder available in the ejs template
        ...ejsUtils, // this makes exported functions in ejs-utils.js available in the ejs template
      };

      // see: https://ejs.co/#docs
      let body = ejs.render(fs.readFileSync(fragmentPath, 'utf-8'), ejsData);
      body = htmlFragmentToDoc(body);
      return formatHtml(body);
    }
  }
  return undefined;
}

async function getDynamicFragment(path) {
  return readFile(path);
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
