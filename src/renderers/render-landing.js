import { join } from 'path';
import { readFileSync } from 'fs';
import md2html from '../modules/ExlMd2Html.js';
import { addExtension } from '../modules/utils/path-utils.js';

function splitMD(mdString) {
  const parts = mdString.split('---');
  const meta = parts[1];
  const md = parts.slice(2).join('---');
  return { meta, md };
}

/**
 * handles a markdown doc path
 */
export default async function renderLanding(path, parentFolderPath) {
  const parts = path.split('/');

  const landingName = parts.length < 3 ? 'home' : parts[2];

  const landingMdFilePath = join(
    parentFolderPath,
    'landing/en',
    addExtension(landingName, '.md'),
  );

  const mdString = readFileSync(landingMdFilePath, 'utf-8');
  const { meta, md } = splitMD(mdString);
  const { convertedHtml, originalHtml } = await md2html(md, meta, {});
  return {
    body: convertedHtml,
    headers: {
      'Content-Type': 'text/html',
    },
    md,
    original: originalHtml,
  };
}
