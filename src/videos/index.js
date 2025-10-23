import fetch from 'node-fetch';
import Logger from '@adobe/aio-lib-core-logging';
import { sendError } from '../common/utils/response-utils.js';

export const aioLogger = Logger('videos');

const mapLanguageCode = (lang) => {
  const languageMap = {
    en: 'en',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    'pt-br': 'pt-BR',
    sv: 'sv',
    nl: 'nl',
    'zh-hans': 'zh-Hans',
    'zh-hant': 'zh-Hant',
  };

  return languageMap[lang.toLowerCase()] || 'en';
};

/**
 * Fetches translated videoHumanId for a given source videoHumanId and language
 */
const getTranslatedHumanIdFromAPI = async (videoHumanId, lang) => {
  try {
    const mappedLang = mapLanguageCode(lang); // ex: 'fr' → 'fr-FR'
    const apiUrl = `https://api.tv.adobe.com/videos/${videoHumanId}/collections`;

    aioLogger.info(
      `Fetching video collections for ID: ${videoHumanId}, language: ${mappedLang}`,
    );

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const videos = data?.collections?.[0]?.videos || [];

    // Find the translated video that contains the matching locale
    const translated = videos.find(
      (v) =>
        v.videoType === 'translated' &&
        v.availableCaptions?.some(
          (cap) => cap.locale.toLowerCase() === mappedLang.toLowerCase(),
        ),
    );

    return translated ? translated.videoHumanId : null;
  } catch (err) {
    aioLogger.error('Error fetching translated HumanId:', err);
    return null;
  }
};

export const main = async function main(params) {
  const { videoId, lang = 'en' } = params;

  if (!videoId) {
    return sendError(400, 'Missing required parameter: videoId');
  }

  try {
    const translatedHumanId = await getTranslatedHumanIdFromAPI(videoId, lang);

    if (!translatedHumanId) {
      return sendError(404, `No translated video found for language: ${lang}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        success: true,
        sourceVideoHumanId: videoId,
        targetLanguage: lang,
        mappedLanguage: mapLanguageCode(lang),
        translatedVideoHumanId: translatedHumanId,
      },
    };
  } catch (error) {
    aioLogger.error('Error in main function:', error);
    return sendError(500, 'Internal Server Error');
  }
};
