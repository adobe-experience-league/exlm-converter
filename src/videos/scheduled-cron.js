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

export const aioLogger = Logger('scheduled-cron');

// In-memory cache for video data
const videoDataCache = new Map();
let lastFetchTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// GitHub API configuration
const GITHUB_API_BASE = 'https://raw.githubusercontent.com';
const REPO_OWNER = 'AdobeDocs';
const REPO_NAME = 'mpc-index';
const FILE_PATH = 'MPCLocVideoLinkIndex.json';
const { MPC_GITHUB_PAT } = process.env;

/**
 * Fetches video data from the GitHub API and stores it in memory
 * @param {string|null} token - GitHub Personal Access Token
 * @returns {Promise<Object>} - Result object with success status and details
 */
const fetchAndCacheVideoData = async () => {
  try {
    // Fetch the file content
    const gitApi = `${GITHUB_API_BASE}/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;
    const res = await fetch(gitApi, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${MPC_GITHUB_PAT}`,
      },
    });
    const videoData = await res.json();

    // Clear existing cache and populate with new data
    videoDataCache.clear();

    // Store each video entry in the cache
    Object.keys(videoData).forEach((videoId) => {
      videoDataCache.set(videoId, videoData[videoId]);
    });

    lastFetchTime = Date.now();
    aioLogger.info(
      `Successfully cached ${videoDataCache.size} video entries from GitHub API`,
    );

    return {
      success: true,
      cacheSize: videoDataCache.size,
      lastFetchTime: new Date(lastFetchTime).toISOString(),
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
 * @param {Object} params - Parameters object
 * @param {string} params.locVideoID - Personal Access Token for GitHub API authentication (optional)
 */
export const main = async function main() {
  try {
    aioLogger.info('Starting scheduled video data fetch');
    const result = await fetchAndCacheVideoData();

    if (result.success) {
      const stats = getCacheStats();
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
    const result = await fetchAndCacheVideoData();

    if (!result.success) {
      aioLogger.warn('Failed to initialize cache on module load:', result);
    }
  } catch (error) {
    aioLogger.error('Error initializing cache on module load:', error);
  }
})();
