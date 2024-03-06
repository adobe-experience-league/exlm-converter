import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import readdirRecursive from './fs-util.js';
import publish from './franklin-util.js';

const filename = fileURLToPath(import.meta.url);
const currentDirectory = dirname(filename);
const SRC_PATH = join(currentDirectory, '../src/converter/static');
const FRAGMENTS_PATH = join(SRC_PATH, '/fragments');

// These variables can be set in the github action env variables in repo settings
const { OWNER, REPO, BRANCH } = process.env;

const owner = OWNER;
const repo = REPO;
const branch = BRANCH;

// Validate environment variables
if (!owner || !repo || !branch) {
  if (!owner) console.error('Missing OWNER environment variable');
  if (!repo) console.error('Missing REPO environment variable');
  if (!branch) console.error('Missing BRANCH environment variable');
  process.exit(1);
}

/**
 * publishes a path to Edge Delivery Services via Admin API
 * @param {string} path
 * @param {'preview' | 'live'} mode - either 'preview' or 'live'
 */
const publishPath = async (path, mode) => {
  try {
    const response = await publish({
      path,
      owner,
      mode,
      repo,
      branch,
    });
    if (response.ok) {
      const jsonResponse = await response.json();
      console.log(`[Published] [${mode}]: ${jsonResponse[mode].url}`);
    } else {
      console.error(
        `[Error] [${mode}] [Response Code: ${response.status}]: ${path}`,
      );
      console.error(`Reponse text: \n${await response.text()}`);
    }
  } catch (err) {
    console.error(err);
  }
};

const previewThenPublish = async (path) => {
  await publishPath(path, 'preview');
  await publishPath(path, 'live');
};

const files = await readdirRecursive(FRAGMENTS_PATH);
// Publish all fragments asynchronously
await Promise.all(
  files
    .filter((file) => file.endsWith('.html'))
    .map((file) => {
      const path = relative(SRC_PATH, file);
      return previewThenPublish(path);
    }),
);
