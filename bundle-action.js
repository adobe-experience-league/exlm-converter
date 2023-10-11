#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { jsdomPatch } from './esbuild-plugins/jsdomPatch.cjs';

const esbuildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  external: ['canvas', 'bufferutil', 'utf-8-validate'],
  plugins: [jsdomPatch],
  logLevel: 'info',
};

export const buildAction = async () => esbuild.build(esbuildOptions);

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

// by default, build the actio.
await buildAction();
