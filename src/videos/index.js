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
import {
  getVideoFromCache,
  isCacheStale,
  getCacheStats,
} from './scheduled-cron.js';

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
    const localizedVideoId = await getVideoFromCache(videoId, mappedLang);

    if (!localizedVideoId) {
      console.log(`No localized video found for ${videoId}-${mappedLang}`);
      return null;
    }

    return {
      originalvideoId: videoId,
      localizedvideoId: localizedVideoId,
      language: mappedLang,
    };
  } catch (error) {
    console.error('Error getting video data:', error);
    return null;
  }
};

export const main = async function main(params) {
  const { videoId, lang = 'en' } = params;

  if (!videoId) {
    return sendError(400, 'Missing required parameter: videoId');
  }

  try {
    // Get localized video data from cache
    const videoData = await getLocalizedVideoData(videoId, lang);

    if (!videoData) {
      return sendError(
        404,
        `Video ID ${videoId} not found or no localized version available`,
      );
    }

    // Add cache information to response headers
    const cacheStats = await getCacheStats();
    const cacheControl = 'public, max-age=300'; // 5 minutes TTL

    return {
      body: {
        success: true,
        data: videoData,
        cache: {
          fromCache: true,
          cacheSize: cacheStats.size,
          lastRefresh: cacheStats.lastFetchTime,
          isStale: cacheStats.isStale,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
        'X-Cache-Status': (await isCacheStale()) ? 'STALE' : 'FRESH',
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error in main function:', error);
    return sendError(500, 'Internal Server Error');
  }
};
