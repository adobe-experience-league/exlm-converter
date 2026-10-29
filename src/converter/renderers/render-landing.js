import { matchLandingPath } from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';

export async function renderLandingV2({ landingName, lang, authorization }) {
  const defaultExlClientv2 = await createDefaultExlClientV2();

  const landingHtmlResponse = await defaultExlClientv2.getLandingPageById(
    landingName,
    lang,
    {
      headers: {
        ...(authorization && { authorization }),
      },
    },
  );

  if (!landingHtmlResponse.ok) {
    return {
      statusCode: landingHtmlResponse.status,
      error: new Error(
        `Failed to fetch landing HTML: ${landingHtmlResponse.statusText}`,
      ),
    };
  }

  const html = await landingHtmlResponse.text();

  return {
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: html,
  };
}

export default async function renderLanding(path, authorization) {
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
  if (lang && solution && solution !== 'home') {
    landingName = solution;
  }

  return renderLandingV2({ landingName, lang, authorization });
}
