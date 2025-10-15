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

export const aioLogger = Logger('videos-scheduled-wrapper');

// In-memory cache for video data
const videoDataCache = new Map();
let lastFetchTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches video data from the mock API and stores it in memory
 * @returns {Promise<boolean>} - Success status of the fetch operation
 */
const fetchAndCacheVideoData = async () => {
  try {
    const mockApiUrl =
      'https://mocki.io/v1/37664131-94d1-46e1-b232-d810fd57ccc4';
    aioLogger.info(`Fetching video data from ${mockApiUrl}`);

    const response = await fetch(mockApiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      aioLogger.error(`Failed to fetch video data: ${response.status}`);
      return false;
    }

    const videoData = await response.json();

    // Clear existing cache and populate with new data
    videoDataCache.clear();

    // Store each video entry in the cache
    Object.keys(videoData).forEach((videoId) => {
      videoDataCache.set(videoId, videoData[videoId]);
    });

    lastFetchTime = Date.now();
    aioLogger.info(`Successfully cached ${videoDataCache.size} video entries`);

    return true;
  } catch (error) {
    aioLogger.error('Error fetching video data:', error);
    return false;
  }
};

/**
 * Gets video data from cache
 * @param {string} videoId - The video ID to look up
 * @returns {Object|null} - Video data or null if not found
 */
export const getVideoFromCache = (videoId) =>
  videoDataCache.get(videoId) || null;

/**
 * Checks if cache needs refresh
 * @returns {boolean} - True if cache needs refresh
 */
export const isCacheStale = () => {
  if (!lastFetchTime) return true;
  return Date.now() - lastFetchTime > CACHE_DURATION;
};

/**
 * Gets cache statistics
 * @returns {Object} - Cache statistics
 */
export const getCacheStats = () => ({
  size: videoDataCache.size,
  lastFetchTime: lastFetchTime ? new Date(lastFetchTime).toISOString() : null,
  isStale: isCacheStale(),
});

/**
 * Main function for the scheduled wrapper action
 * This function is triggered by the cron schedule to refresh the video data cache
 */
export const main = async function main() {
  try {
    aioLogger.info('Starting scheduled video data fetch');

    const success = await fetchAndCacheVideoData();

    if (success) {
      const stats = getCacheStats();
      aioLogger.info(
        'Scheduled video data fetch completed successfully',
        stats,
      );

      return {
        body: {
          success: true,
          message: 'Video data cache refreshed successfully',
          stats,
        },
        statusCode: 200,
      };
    }

    aioLogger.error('Scheduled video data fetch failed');

    return {
      body: {
        success: false,
        message: 'Failed to refresh video data cache',
      },
      statusCode: 500,
    };
  } catch (error) {
    aioLogger.error('Error in scheduled wrapper main function:', error);

    return {
      body: {
        success: false,
        message: 'Internal error during scheduled fetch',
        error: error.message,
      },
      statusCode: 500,
    };
  }
};

// Initialize cache on module load (for restart/init scenario)
(async () => {
  try {
    aioLogger.info('Initializing video data cache on module load');
    await fetchAndCacheVideoData();
  } catch (error) {
    aioLogger.error('Error initializing cache on module load:', error);
  }
})();
