import md2html from '../modules/ExlMd2Html.js';
import { DOCPAGETYPE } from '../doc-page-types.js';
import { matchLandingPath } from '../modules/utils/path-match-utils.js';
import { defaultExlClient } from '../modules/ExlClient.js';
import { LANDING_IDS, dedupeAnchors } from './utils/landing-utils.js';

/**
 * handles a markdown doc path
 */
export default async function renderLanding(path) {
  const {
    params: { lang, solution },
  } = matchLandingPath(path);

  if (solution === 'home') {
    return {
      error: new Error(
        `this path is invalid: ${path}, please use /<lang>/docs instead for home page.`,
      ),
    };
  }

  // default to landing page (in case solution is not provided)
  let landingName = 'home';
  let pageType = DOCPAGETYPE.DOC_LANDING;
  if (lang && solution && solution !== 'home') {
    landingName = solution;
    pageType = DOCPAGETYPE.SOLUTION_LANDING;
  }

  const landingPage = await defaultExlClient.getLandingPageByFileName(
    landingName,
    lang,
  );

  if (landingPage !== undefined) {
    let md = landingPage?.Markdown;
    const meta = landingPage?.FullMeta;
    const potentialDuplicateAnchors = Object.values(LANDING_IDS);
    md = dedupeAnchors(md, potentialDuplicateAnchors);

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
  return {
    error: new Error(`No Page found for: ${path}`),
  };
}
