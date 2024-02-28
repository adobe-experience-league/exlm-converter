import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { jsdomPatch } from './esbuild-plugins/jsdomPatch.cjs';

const ACTIONS_SRC_FOLDER = './src';
const ACTIONS_DIST_FOLDER = './dist';
const ACTION_ENTRY_FILE_NAME = 'index.js';

export const doForEachAction = (callback) => {
  fs.readdirSync(ACTIONS_SRC_FOLDER).forEach(async (action) => {
    const sourceFolder = `${ACTIONS_SRC_FOLDER}/${action}`;
    const entryPoint = `${sourceFolder}/${ACTION_ENTRY_FILE_NAME}`;
    const distFolder = `${ACTIONS_DIST_FOLDER}/${action}`;
    const outfile = `${distFolder}/${ACTION_ENTRY_FILE_NAME}`;
    callback({
      action,
      sourceFolder,
      entryPoint,
      distFolder,
      outfile,
    });
  });
};

export const createEsbuildOptions = (overrides) => ({
  bundle: true,
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
  ...overrides,
});

export const buildAction = async (esbuildOverrides) =>
  esbuild.build(createEsbuildOptions(esbuildOverrides));

/**
 * watch and rebuild the action if source changes
 * @param {Function} onFirstBuild runs on first time build
 * @param {Function} onSubsequentBuilds runs on subsequent builds
 * @returns
 */
export const watchAction = async ({
  esbuildOverrides,
  onFirstBuild,
  onSubsequentBuilds,
}) => {
  const esbuildOptions = createEsbuildOptions(esbuildOverrides);
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
 * @param {boolean} override
 */
const copyFolders = (folders, distFolder, { override }) => {
  folders.forEach((src) => {
    if (!fs.existsSync(src)) {
      // console.warn(`Folder ${src} does not exist`);
      return;
    }
    const dest = path.join(distFolder, path.basename(src));
    if (override) fs.rmSync(dest, { recursive: true, force: true });
    ensureDir(dest);
    fs.cpSync(src, dest, { recursive: true });
  });
};

/**
 * Build the action into a folder to include static files/assets
 */
export const buildActionFolder = async ({ esbuildOverrides, config }) => {
  const { outfile } = esbuildOverrides;
  const { distFolder, sourceFolder } = config;
  // create dist directory if it does not exist
  ensureDir(distFolder);
  // copy static folders to dist
  copyFolders([`${sourceFolder}/static`], distFolder, { override: true });
  // write package.json file to dist. it contains the main entry point for the action
  fs.writeFileSync(
    `${distFolder}/package.json`,
    JSON.stringify({ main: path.basename(outfile) }, null, 2),
  );

  // bundle the action
  await buildAction(esbuildOverrides);
};
