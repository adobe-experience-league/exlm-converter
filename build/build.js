import { buildActionFolder, doForEachAction } from './build-helpers.js';

doForEachAction(async ({ sourceFolder, entryPoint, distFolder, outfile }) => {
  await buildActionFolder({
    esbuildOverrides: {
      entryPoints: [entryPoint],
      outfile,
    },
    config: {
      distFolder,
      sourceFolder,
    },
  });
});
