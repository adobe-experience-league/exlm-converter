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
import stateLib from '../common/utils/state-lib-util.js';

export const aioLogger = Logger('scheduled-cron');

// State storage keys
const VIDEO_DATA_STATE_KEY = 'video-data-cache';
const LAST_FETCH_TIME_KEY = 'video-cache-last-fetch';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Initialize state store
let stateStore = null;

/**
 * Initialize state store if not already initialized
 */
const initStateStore = async () => {
  if (!stateStore) {
    stateStore = await stateLib.init();
  }
  return stateStore;
};

// GitHub API configuration
const GITHUB_API_BASE = 'https://raw.githubusercontent.com';
const REPO_OWNER = 'AdobeDocs';
const REPO_NAME = 'mpc-index';
const FILE_PATH = 'MPCLocVideoLinkIndex.json';
const { MPC_GITHUB_PAT } = process.env;

/**
 * Fetches video data from the GitHub API and stores it in state
 * @param {string|null} token - GitHub Personal Access Token
 * @returns {Promise<Object>} - Result object with success status and details
 */
const fetchAndCacheVideoData = async () => {
  try {
    const store = await initStateStore();

    // Fetch the file content
    const gitApi = `${GITHUB_API_BASE}/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;
    const res = await fetch(gitApi, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${MPC_GITHUB_PAT}`,
      },
    });
    const videoData = await res.json();

    // Transform video data to key-value format: { "videoId-language": "localizedVideoId" }
    // Exclude "en" entries from state storage
    const transformedData = {};
    let totalEntries = 0;
    const originalVideoCount = Object.keys(videoData).length;

    Object.keys(videoData).forEach((videoId) => {
      const videoEntry = videoData[videoId];
      Object.keys(videoEntry).forEach((language) => {
        // Skip English ("en") entries
        if (language === 'en') {
          return;
        }

        const localizedData = videoEntry[language];
        if (localizedData && localizedData.videoID) {
          const key = `${videoId}-${language}`;
          transformedData[key] = localizedData.videoID;
          totalEntries += 1;
        }
      });
    });

    // Store the transformed data and metadata in state
    await store.put(VIDEO_DATA_STATE_KEY, transformedData);
    const currentTime = Date.now();
    await store.put(LAST_FETCH_TIME_KEY, currentTime);

    aioLogger.info(
      `Successfully cached ${totalEntries} video-language entries from ${originalVideoCount} original videos to state storage`,
    );

    return {
      success: true,
      cacheSize: totalEntries,
      lastFetchTime: new Date(currentTime).toISOString(),
    };
  } catch (error) {
    aioLogger.error('Error fetching video data from GitHub API:', error);
    return {
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    };
  }
};

/**
 * Gets video data from state storage using key format "videoId-language"
 * @param {string} videoId - The video ID to look up
 * @param {string} language - The language code
 * @returns {Promise<string|null>} - Localized video ID or null if not found
 */
export const getVideoFromCache = async (videoId, language) => {
  try {
    const store = await initStateStore();
    const cacheData = await store.get(VIDEO_DATA_STATE_KEY);

    if (!cacheData || !cacheData.value) {
      return null;
    }

    const key = `${videoId}-${language}`;
    return cacheData.value[key] || null;
  } catch (error) {
    aioLogger.error('Error getting video from cache:', error);
    return null;
  }
};

/**
 * Checks if cache needs refresh
 * @returns {Promise<boolean>} - True if cache needs refresh
 */
export const isCacheStale = async () => {
  try {
    const store = await initStateStore();
    const lastFetchData = await store.get(LAST_FETCH_TIME_KEY);

    if (!lastFetchData || !lastFetchData.value) return true;

    return Date.now() - lastFetchData.value > CACHE_DURATION;
  } catch (error) {
    aioLogger.error('Error checking cache staleness:', error);
    return true;
  }
};

/**
 * Gets cache statistics
 * @returns {Promise<Object>} - Cache statistics
 */
export const getCacheStats = async () => {
  try {
    const store = await initStateStore();
    const [cacheData, lastFetchData] = await Promise.all([
      store.get(VIDEO_DATA_STATE_KEY),
      store.get(LAST_FETCH_TIME_KEY),
    ]);

    const size =
      cacheData && cacheData.value ? Object.keys(cacheData.value).length : 0;
    const lastFetchTime =
      lastFetchData && lastFetchData.value ? lastFetchData.value : null;
    const isStale = await isCacheStale();

    return {
      size,
      lastFetchTime: lastFetchTime
        ? new Date(lastFetchTime).toISOString()
        : null,
      isStale,
    };
  } catch (error) {
    aioLogger.error('Error getting cache stats:', error);
    return {
      size: 0,
      lastFetchTime: null,
      isStale: true,
    };
  }
};

/**
 * Updates state after daily cron job execution
 * @returns {Promise<void>}
 */
const updateStateAfterCronJob = async () => {
  try {
    const store = await initStateStore();
    const currentTime = Date.now();

    // Update last cron execution time
    await store.put('last-cron-execution', currentTime);

    // Update daily execution counter
    const dailyCounterData = await store.get('daily-execution-counter');
    const currentCounter = dailyCounterData?.value || 0;
    await store.put('daily-execution-counter', currentCounter + 1);

    // Store execution metadata
    const executionMetadata = {
      executionTime: new Date(currentTime).toISOString(),
      executionCount: currentCounter + 1,
      status: 'completed',
    };
    await store.put('cron-execution-metadata', executionMetadata);

    aioLogger.info('State updated after cron job execution', executionMetadata);
  } catch (error) {
    aioLogger.error('Error updating state after cron job:', error);
  }
};

/**
 * Main function for the scheduled wrapper action
 * @param {Object} params - Parameters object
 * @param {string} params.locVideoID - Personal Access Token for GitHub API authentication (optional)
 */
export const main = async function main() {
  try {
    aioLogger.info('Starting scheduled video data fetch');
    const result = await fetchAndCacheVideoData();

    // Update state after cron job execution
    await updateStateAfterCronJob();

    if (result.success) {
      const stats = await getCacheStats();
      aioLogger.info('Scheduled video data fetch completed successfully', {
        ...stats,
        rateLimitRemaining: result.rateLimitRemaining,
      });

      return {
        body: {
          success: true,
          message: 'Video data cache refreshed successfully',
          stats: {
            ...stats,
            rateLimitRemaining: result.rateLimitRemaining,
          },
        },
        statusCode: 200,
      };
    }

    // Handle different error scenarios
    aioLogger.error('Scheduled video data fetch failed:', result);

    return {
      body: {
        success: false,
        message: 'Failed to refresh video data cache',
        error: result.error,
        code: result.code,
        suggestion: result.suggestion,
        rateLimitRemaining: result.rateLimitRemaining,
      },
      statusCode: result.code === 'INVALID_TOKEN' ? 401 : 404,
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
