import { JSDOM } from 'jsdom';
import { join } from 'path';
import { readFileSync } from 'fs';
import { convertDocumentation } from '../modules/ExlMd2Html.js';
import { addExtension } from '../modules/utils/path-utils.js';
import { matchSlidesPath } from '../modules/utils/path-match-utils.js';
import createSlidesBlock from '../modules/blocks/create-slides-block.js';

function splitMD(mdString) {
  const parts = mdString.split('---');
  const meta = parts[1];
  const md = parts.slice(2).join('---');
  return { meta, md };
}

/**
 * handles a markdown doc path
 */
export default async function renderSlides(path, parentFolderPath) {
  const {
    params: { lang },
  } = matchSlidesPath(path);

  const landingName = 'how-to-slides';

  const landingMdFilePath = join(
    parentFolderPath,
    'static/slides/en',
    addExtension(landingName, '.md'),
  );

  const mdString = readFileSync(landingMdFilePath, 'utf-8');
  const { md } = splitMD(mdString);
  const convertedHtml = await convertDocumentation(md, {
    htmlLang: lang,
  });

  const dom = new JSDOM(convertedHtml);
  const { document } = dom.window;
  createSlidesBlock(document);

  return {
    body: dom.serialize(),
    headers: {
      'Content-Type': 'text/html',
    },
    md,
    original: dom.serialize(),
  };
}
