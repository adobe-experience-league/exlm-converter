import { matchSlidePath } from '../modules/utils/path-match-utils.js';
import { createDefaultExlClientV2 } from '../modules/ExlClientV2.js';

async function renderSlideV2({ slideId, lang, authorization }) {
  const defaultExlClientv2 = await createDefaultExlClientV2();

  const response = await defaultExlClientv2.getSlideHtmlById(slideId, lang, {
    headers: {
      ...(authorization && { authorization }),
    },
  });

  const slideHtml = await response.text();

  return {
    body: slideHtml,
    headers: {
      'Content-Type': 'text/html',
    },
    md: '',
    original: slideHtml,
  };
}

export default async function renderSlide(path, authorization) {
  const match = matchSlidePath(path);
  const {
    params: { lang, slideId },
  } = match;

  if (!slideId) {
    return {
      error: new Error(`slide id is required but none was provided`),
    };
  }

  return renderSlideV2({ slideId, lang, authorization });
}
