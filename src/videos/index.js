/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import Logger from '@adobe/aio-lib-core-logging';
import { sendError } from '../common/utils/response-utils.js';
import { getVideoIDFromCache } from './localize-video-ids.js';

export const aioLogger = Logger('videos');

/**
 * Maps language codes to the format used in the MPC video data
 * @param {string} lang - ExL Language code (e.g., 'en', 'de', 'fr')
 * @returns {string} - Formatted language code for video lookup
 */
const mpcLanguageCode = (lang) => {
  const languageMap = {
    en: 'en',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    'pt-br': 'pt-BR',
    sv: 'sv-SE',
    nl: 'nl-NL',
    'zh-hans': 'zh-Hans',
    'zh-hant': 'zh-Hant',
  };

  return languageMap[lang.toLowerCase()] || 'en';
};

/**
 * Gets localized video data from state storage using key-value format
 * @param {string} videoId - The video ID to look up
 * @param {string} lang - Language code
 * @returns {Promise<Object|null>} - Video data or null if not found
 */
const getLocalizedVideoData = async (videoId, lang) => {
  try {
    const mappedLang = mpcLanguageCode(lang);
    const localizedVideoId = await getVideoIDFromCache(videoId, mappedLang);

    if (!localizedVideoId) {
      aioLogger.info(`No localized video found for ${videoId}-${mappedLang}`);
      return null;
    }

    return {
      originalvideoId: videoId,
      localizedvideoId: localizedVideoId,
      language: mappedLang,
    };
  } catch (error) {
    aioLogger.error('Error getting video data:', error);
    return null;
  }
};

export const main = async function main(params) {
  const startTime = Date.now();
  const { videoId, lang = 'en' } = params;

  if (!videoId) {
    return sendError(400, 'Missing required parameter: videoId');
  }

  try {
    // Get localized video data from cache with optimized response
    const videoData = await getLocalizedVideoData(videoId, lang);
    const duration = Date.now() - startTime;

    if (!videoData) {
      aioLogger.info(`Video not found: ${videoId}-${lang} (${duration}ms)`);
      return sendError(
        404,
        `Video ID ${videoId} not found or no localized version available`,
      );
    }

    aioLogger.debug(
      `Video lookup successful: ${videoId}-${lang} (${duration}ms)`,
    );

    return {
      body: {
        success: true,
        data: videoData,
        responseTime: `${duration}ms`,
      },
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', // Extended cache with stale-while-revalidate
        'X-Response-Time': `${duration}ms`,
      },
      statusCode: 200,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    aioLogger.error(`Error in main function (${duration}ms):`, error);
    return sendError(500, 'Internal Server Error');
  }
};
