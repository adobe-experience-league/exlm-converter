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
 * Fetches localized video data from mock API
 * @param {string} videos - The video ID to look up
 * @param {string} lang - Language code
 * @returns {Object|null} - Video data or null if not found
 */
const fetchLocalizedVideoData = async (videoId, lang) => {
  try {
    const mockApiUrl =
      'https://mocki.io/v1/37664131-94d1-46e1-b232-d810fd57ccc4';
    console.log(`Fetching video data from ${mockApiUrl}`);

    const response = await fetch(mockApiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch video data: ${response.status}`);
      return null;
    }

    const videoData = await response.json();
    console.log(`Fetched video data for video ID: ${videoId}`);

    // Look up the video by ID
    const videoEntry = videoData[videoId];
    if (!videoEntry) {
      console.log(`Video ID ${videoId} not found in data`);
      return null;
    }

    // Get the mapped language code
    const mappedLang = mapLanguageCode(lang);
    console.log(`Mapped language ${lang} to ${mappedLang}`);

    // Get localized video data, fallback to 'en' if language not available
    const localizedData = videoEntry[mappedLang] || videoEntry.en;

    if (!localizedData) {
      console.log(`No localized data found for ${mappedLang} or fallback 'en'`);
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
    console.error('Error fetching video data:', error);
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

    // Fetch localized video data
    const videoData = await fetchLocalizedVideoData(videoId, lang);

    if (!videoData) {
      return sendError(
        404,
        `Video ID ${videoId} not found or no localized version available`,
      );
    }

    console.log(`Successfully retrieved localized video data:`, videoData);

    return {
      body: {
        success: true,
        data: videoData,
      },
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error in main function:', error);
    return sendError(500, 'Internal Server Error');
  }
};
