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
} from './scheduled-wrapper.js';

export const aioLogger = Logger('videos');

/**
 * Maps language codes to the format used in the mock API
 * @param {string} lang - Language code (e.g., 'en', 'de', 'fr')
 * @returns {string} - Formatted language code for API lookup
 */
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
 * Gets localized video data from cache or fallback to API
 * @param {string} videoId - The video ID to look up
 * @param {string} lang - Language code
 * @returns {Object|null} - Video data or null if not found
 */
const getLocalizedVideoData = async (videoId, lang) => {
  try {
    // First try to get from cache
    const videoEntry = getVideoFromCache(videoId);

    if (!videoEntry) {
      console.log(`Video ID ${videoId} not found in cache`);
      return null;
    }

    // Get the mapped language code
    const mappedLang = mapLanguageCode(lang);
    console.log(`Mapped language ${lang} to ${mappedLang}`);

    // Get localized video data without fallback to 'en'
    const localizedData = videoEntry[mappedLang];

    if (!localizedData) {
      console.log(`No localized data found for ${mappedLang}`);
      return null;
    }

    return {
      originalvideoId: videoId,
      localizedvideoId: localizedData.videoID,
      language: mappedLang,
      title: localizedData.title,
      product: localizedData.product,
      captionLanguage: localizedData.captionLanguage,
      modified: localizedData.modified,
    };
  } catch (error) {
    console.error('Error getting video data:', error);
    return null;
  }
};

export const main = async function main(params) {
  const { videoId, lang = 'en' } = params;

  // Validate required parameters
  if (!videoId) {
    return sendError(400, 'Missing required parameter: videoId');
  }

  try {
    console.log(`Processing video ID: ${videoId} for language: ${lang}`);

    // Add 1 second delay for video response
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    // Get localized video data from cache
    const videoData = await getLocalizedVideoData(videoId, lang);

    if (!videoData) {
      return sendError(
        404,
        `Video ID ${videoId} not found or no localized version available`,
      );
    }

    console.log(`Successfully retrieved localized video data:`, videoData);

    // Add cache information to response headers
    const cacheStats = getCacheStats();
    const cacheControl = isCacheStale()
      ? 'public, max-age=300'
      : 'public, max-age=300'; // 5 minutes TTL as requested

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
        'X-Cache-Status': isCacheStale() ? 'STALE' : 'FRESH',
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error in main function:', error);
    return sendError(500, 'Internal Server Error');
  }
};
