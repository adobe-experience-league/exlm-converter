import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import md2html from '../modules/ExlMd2Html.js';
import { addExtension } from '../modules/utils/path-utils.js';
import { DOCPAGETYPE } from '../doc-page-types.js';
import { matchLandingPath } from '../modules/utils/path-match-utils.js';

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
  const {
    params: { lang, solution },
  } = matchLandingPath(path);

  let landingName = 'home';
  let pageType = DOCPAGETYPE.DOC_LANDING;
  if (lang && solution) {
    landingName = solution;
    pageType = DOCPAGETYPE.SOLUTION_LANDING;
  }

  const landingMdFilePath = join(
    parentFolderPath,
    `static/landing/${lang}`,
    addExtension(landingName, '.md'),
  );

  // does not exist
  if (!existsSync(landingMdFilePath)) {
    return {
      error: new Error(`No Landing Page found for: ${path}`),
    };
  }

  const mdString = readFileSync(landingMdFilePath, 'utf-8');
  const { meta, md } = splitMD(mdString);
  const { convertedHtml, originalHtml } = await md2html(
    md,
    meta,
    {},
    pageType,
    lang,
  );
  return {
    body: convertedHtml,
    headers: {
      'Content-Type': 'text/html',
    },
    md,
    original: originalHtml,
  };
}
