import * as esbuild from 'esbuild';
import fs from 'fs';
import { jsdomPatch } from './esbuild-plugins/jsdomPatch.cjs';

const DIST_ACTION_FOLDER = 'dist/static';
const DIST_ACTION_FILE_NAME = 'index.js';
const DIST_ACTION_INDEX = `${DIST_ACTION_FOLDER}/${DIST_ACTION_FILE_NAME}`;
const BUNDLE_ENTRY = `src/${DIST_ACTION_FILE_NAME}`;
const COPY_FOLDERS = [['src/fragments', `${DIST_ACTION_FOLDER}/fragments`]];

const ACTION_PACKAGE_JSON = {
  main: DIST_ACTION_FILE_NAME,
};

const esbuildOptions = {
  entryPoints: [BUNDLE_ENTRY],
  bundle: true,
  outfile: DIST_ACTION_INDEX,
  platform: 'node',
  format: 'cjs', // needs to be cjs to support  __dirname and __filename for fragment serving
  target: 'node18', // this is the version in app.config.yaml
  external: ['canvas', 'bufferutil', 'utf-8-validate'],
  plugins: [jsdomPatch],
  logLevel: 'info',
  keepNames: true, // needed because of: https://github.com/node-fetch/node-fetch/issues/784#issuecomment-1014768204
  logOverride: {
    'empty-import-meta': 'debug', // sets the logging level for a specific message: "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta]
  },
};

export const buildAction = async () => esbuild.build(esbuildOptions);

/**
 * watch and rebuild the action if source changes
 * @param {Function} onFirstBuild runs on first time build
 * @param {Function} onSubsequentBuilds runs on subsequent builds
 * @returns
 */
export const watchAction = async (onFirstBuild, onSubsequentBuilds) => {
  const context = await esbuild.context({
    ...esbuildOptions,
    plugins: [
      ...esbuildOptions.plugins,
      {
        // watch plugin that allows us to hook into the build process
        name: 'watch',
        setup(build) {
          let count = 0;
          build.onEnd(() => {
            if (count === 0 && onFirstBuild) onFirstBuild();
            else if (onSubsequentBuilds) onSubsequentBuilds();
            count += 1;
          });
        },
      },
    ],
  });
  return context.watch();
};

/**
 * Ensure provided directory exists
 */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Copy folders from src to dist
 * @param {Array<Array<string>>} folders
 */
const copyFolders = (folders) => {
  folders.forEach(([src, dest]) => {
    ensureDir(dest);
    fs.cpSync(src, dest, { recursive: true });
  });
};

/**
 * Build the action into a folder to include static files/assets
 */
export const buildActionFolder = async () => {
  // create directory ./dist/static if it does not exist
  ensureDir(DIST_ACTION_FOLDER);
  // copy static folders to dist
  copyFolders(COPY_FOLDERS);
  // write package.json file to dist. it contains the main entry point for the action
  fs.writeFileSync(
    `${DIST_ACTION_FOLDER}/package.json`,
    JSON.stringify(ACTION_PACKAGE_JSON, null, 2),
  );

  // bundle the action
  await buildAction();
};

// by default, when this file is run, build the action.
await buildActionFolder();
