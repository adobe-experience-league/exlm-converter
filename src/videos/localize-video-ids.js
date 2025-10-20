/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied.
 */

import Logger from '@adobe/aio-lib-core-logging';
import stateLib from '../common/utils/state-lib-util.js';

export const aioLogger = Logger('localize-video-ids');

let stateStore = null;

/**
 * Initialize state store if not already initialized with optimized retry logic
 */
const initStateStore = async (maxRetries = 3, baseDelay = 1000) => {
  if (!stateStore) {
    const tryInit = async (attempts = 0) => {
      try {
        stateStore = await stateLib.init();
        aioLogger.debug('State store initialized successfully');
        return stateStore;
      } catch (error) {
        const currentAttempt = attempts + 1;

        // Check if it's a rate limiting error
        const isRateLimit =
          error.message?.includes('429') ||
          error.message?.includes('rate limit') ||
          (error.message?.includes('ERROR_RESPONSE') &&
            error.message?.includes('429'));

        if (isRateLimit && currentAttempt < maxRetries) {
          // Reduced backoff for faster recovery
          const backoffDelay = Math.min(
            baseDelay * 1.5 ** (currentAttempt - 1) + Math.random() * 500,
            10000, // Cap at 10 seconds for faster response
          );

          aioLogger.warn(
            `State store initialization rate limited (attempt ${currentAttempt}/${maxRetries}). Retrying in ${Math.round(
              backoffDelay,
            )}ms...`,
          );

          return new Promise((resolve) => {
            setTimeout(() => resolve(tryInit(currentAttempt)), backoffDelay);
          });
        }

        // For non-rate-limit errors, try fewer times with shorter delays
        if (!isRateLimit && currentAttempt < 2) {
          const shortDelay = 500 * currentAttempt;
          aioLogger.warn(
            `State store initialization failed (attempt ${currentAttempt}/2). Retrying in ${shortDelay}ms...`,
          );

          return new Promise((resolve) => {
            setTimeout(() => resolve(tryInit(currentAttempt)), shortDelay);
          });
        }

        // Log the final error with minimal details for performance
        aioLogger.error('Failed to initialize state store:', {
          message: error.message || 'Unknown error',
          attempts: currentAttempt,
          isRateLimit,
        });

        throw new Error(
          `State store initialization failed after ${currentAttempt} attempts: ${error.message}`,
        );
      }
    };

    return tryInit();
  }
  return stateStore;
};

// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'AdobeDocs';
const REPO_NAME = 'mpc-index';
const FILE_PATH = 'MPCLocVideoLinkIndex.json';

/**
 * Fetches video data from the GitHub API
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<Object>} - Video data object from GitHub
 */
const fetchVideoDataFromGitHub = async (token) => {
  // Validate token
  if (!token) {
    throw new Error(
      'GitHub Personal Access Token (MPC_GITHUB_PAT) is required but not provided',
    );
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${token}`,
  };

  const metaUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=main`;

  aioLogger.info(`Fetching metadata from: ${metaUrl}`);

  const metaRes = await fetch(metaUrl, { headers });

  if (!metaRes.ok) {
    const errorText = await metaRes.text();
    aioLogger.error(`GitHub API error: ${metaRes.status} - ${errorText}`);
    throw new Error(
      `Failed to fetch metadata: ${metaRes.status} - ${errorText}`,
    );
  }

  const meta = await metaRes.json();
  if (!meta.download_url) {
    throw new Error(`No download_url found for ${FILE_PATH}`);
  }

  aioLogger.info(`Fetching raw JSON from ${meta.download_url}`);
  const rawRes = await fetch(meta.download_url);
  if (!rawRes.ok) {
    throw new Error(`Failed to download raw JSON: ${rawRes.status}`);
  }

  const videoData = await rawRes.json();
  aioLogger.info(`Fetched ${Object.keys(videoData).length} video entries`);

  return videoData;
};

/**
 * Transforms video data into cache entries with memory-efficient processing
 * @param {Object} videoData - Raw video data from GitHub
 * @returns {Array} - Array of cache entries with key-value pairs
 */
const transformVideoDataToCacheEntries = (videoData) => {
  const videoIds = Object.keys(videoData);
  const batchSize = 100;
  const entries = [];

  // Process in smaller batches to avoid memory spikes
  const batches = Array.from(
    { length: Math.ceil(videoIds.length / batchSize) },
    (_, i) => videoIds.slice(i * batchSize, (i + 1) * batchSize),
  );

  batches.forEach((batch, batchIndex) => {
    const batchEntries = batch
      .filter((videoId) => videoData[videoId]) // Filter out invalid entries
      .flatMap((videoId) => {
        const videoEntry = videoData[videoId];
        return Object.keys(videoEntry)
          .filter((lang) => lang !== 'en' && videoEntry[lang]?.videoID)
          .map((lang) => ({
            key: `${videoId}-${lang}`,
            value: videoEntry[lang].videoID,
          }));
      });

    entries.push(...batchEntries);

    // Force garbage collection hint for large datasets
    if (global.gc && batchIndex % 5 === 0) {
      global.gc();
    }
  });

  return entries;
};

/**
 * Caches video entries to state store using chunked writes
 * @param {Array} entries - Array of cache entries
 * @param {number} chunkSize - Number of entries to store per chunk (default 15)
 * @param {number} retryDelay - Delay between retries in milliseconds (default 3000)
 * @param {number} operationDelay - Delay between individual operations in milliseconds (default 100)
 * @returns {Promise<Object>} - Result object with success status and details
 */
const cacheVideoEntries = async (
  entries,
  chunkSize = 15,
  retryDelay = 3000,
  operationDelay = 100,
) => {
  try {
    const store = await initStateStore();

    // Create chunks using array methods instead of for loop
    const chunks = Array.from(
      { length: Math.ceil(entries.length / chunkSize) },
      (_, i) => entries.slice(i * chunkSize, (i + 1) * chunkSize),
    );

    const chunkProcessors = chunks.map((chunk, index) =>
      chunk
        .reduce(
          (promiseChain, entry, entryIndex) =>
            promiseChain.then(() => {
              let attempts = 0;
              const tryPut = () =>
                store
                  .put(entry.key, entry.value, { ttl: 86400 })
                  .catch((err) => {
                    attempts += 1;
                    const errorMsg = err.message || 'Unknown error';
                    aioLogger.warn(
                      `Attempt ${attempts} failed for ${entry.key}: ${errorMsg}`,
                    );

                    // Handle rate limiting specifically with longer backoff
                    if (
                      err.message?.includes('429') ||
                      err.message?.includes('rate limit')
                    ) {
                      const backoffDelay = Math.min(
                        retryDelay * 3 ** (attempts - 1),
                        120000,
                      ); // Cap at 2 minutes
                      aioLogger.info(
                        `Rate limited, backing off for ${backoffDelay}ms (attempt ${attempts}/7)`,
                      );

                      if (attempts < 7) {
                        // Increased retry attempts for rate limiting
                        return new Promise((resolve) => {
                          setTimeout(resolve, backoffDelay);
                        }).then(tryPut);
                      }
                    }

                    if (attempts < 3) {
                      return new Promise((resolve) => {
                        setTimeout(resolve, retryDelay);
                      }).then(tryPut);
                    }
                    return Promise.reject(err);
                  });

              // Add small delay between individual operations within a chunk
              const executeWithDelay = () => {
                if (entryIndex > 0) {
                  return new Promise((resolve) => {
                    setTimeout(() => resolve(tryPut()), operationDelay);
                  });
                }
                return tryPut();
              };

              return executeWithDelay();
            }),
          Promise.resolve(),
        )
        .then(() => {
          aioLogger.debug(
            `Cached chunk ${index + 1} of ${chunks.length} (${
              chunk.length
            } entries)`,
          );
        }),
    );

    const results = await Promise.allSettled(chunkProcessors);

    // Log results and count successes/failures
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount += 1;
      } else {
        failureCount += 1;
        aioLogger.error(`Chunk ${index + 1} failed:`, result.reason);
      }
    });

    aioLogger.info(
      `Chunk processing completed: ${successCount} successful, ${failureCount} failed`,
    );

    aioLogger.info(
      `Successfully cached ${entries.length} localized video entries`,
    );
    return { success: true, cacheSize: entries.length };
  } catch (error) {
    aioLogger.error('Error caching video data:', {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      code: error.code || undefined,
      status: error.status || undefined,
    });

    // Provide more specific error codes based on the error type
    let errorCode = 'CACHE_ERROR';
    if (
      error.message?.includes('429') ||
      error.message?.includes('rate limit')
    ) {
      errorCode = 'RATE_LIMIT_ERROR';
    }

    return {
      success: false,
      error: error.message,
      code: errorCode,
      suggestion:
        errorCode === 'RATE_LIMIT_ERROR'
          ? 'Rate limit exceeded. The system will retry automatically on the next scheduled run.'
          : 'Check state store connectivity',
    };
  }
};

/**
 * Fetches video data from GitHub and caches it to state store
 * @param {string} token - GitHub Personal Access Token
 * @param {number} chunkSize - Number of entries to store per chunk (default 15)
 * @param {number} retryDelay - Delay between retries in milliseconds (default 3000)
 * @param {number} operationDelay - Delay between individual operations in milliseconds (default 100)
 * @returns {Promise<Object>} - Result object with success status and details
 */
const fetchAndCacheVideoData = async (
  token,
  chunkSize = 15,
  retryDelay = 3000,
  operationDelay = 100,
) => {
  try {
    // Step 1: Fetch video data from GitHub
    const videoData = await fetchVideoDataFromGitHub(token);

    // Step 2: Transform data into cache entries
    const entries = transformVideoDataToCacheEntries(videoData);

    // Step 3: Cache the entries
    const cacheResult = await cacheVideoEntries(
      entries,
      chunkSize,
      retryDelay,
      operationDelay,
    );

    if (cacheResult.success) {
      aioLogger.info(
        `Successfully processed ${
          Object.keys(videoData).length
        } video entries, cached ${cacheResult.cacheSize} localized entries`,
      );
    }

    return cacheResult;
  } catch (error) {
    aioLogger.error('Error in fetchAndCacheVideoData:', {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      code: error.code || undefined,
      status: error.status || undefined,
    });

    // Provide more specific error codes based on the error type
    let errorCode = 'FETCH_ERROR';
    if (
      error.message?.includes('429') ||
      error.message?.includes('rate limit')
    ) {
      errorCode = 'RATE_LIMIT_ERROR';
    } else if (
      error.message?.includes('401') ||
      error.message?.includes('403')
    ) {
      errorCode = 'AUTH_ERROR';
    } else if (error.message?.includes('404')) {
      errorCode = 'NOT_FOUND_ERROR';
    }

    return {
      success: false,
      error: error.message,
      code: errorCode,
      suggestion:
        errorCode === 'RATE_LIMIT_ERROR'
          ? 'Rate limit exceeded. The system will retry automatically on the next scheduled run.'
          : 'Check token or network connectivity',
    };
  }
};

/**
 * Gets video data from state storage using videoId-language as state key
 * @param {string} videoId - The video ID to look up
 * @param {string} language - The language code
 * @returns {Promise<string|null>} - Localized video ID or null if not found
 */
export const getVideoIDFromCache = async (videoId, language) => {
  if (language === 'en') return videoId;

  let attempts = 0;
  const maxAttempts = 2;

  const tryGet = async () => {
    try {
      const store = await initStateStore();
      const stateKey = `${videoId}-${language}`;
      const cacheData = await store.get(stateKey);

      if (cacheData?.value) {
        aioLogger.debug(`Using cached video data for ${stateKey}`);
        return cacheData.value;
      }

      aioLogger.debug(`No cached video data found for ${stateKey}`);
      return videoId;
    } catch (error) {
      attempts += 1;

      // Handle authentication failures by reinitializing the store
      if (
        (error.message?.includes('ERROR_BAD_CREDENTIALS') ||
          error.code === 'ERROR_BAD_CREDENTIALS') &&
        attempts < maxAttempts
      ) {
        aioLogger.warn(
          `Authentication failure detected while getting video ${videoId}-${language}, reinitializing store (attempt ${attempts}/${maxAttempts})`,
        );

        try {
          // Reset store and retry
          stateStore = null;
          return tryGet();
        } catch (reinitError) {
          aioLogger.error(
            `Failed to reinitialize store while getting video ${videoId}-${language}:`,
            reinitError,
          );
          throw new Error(
            `Store reinitialization failed: ${reinitError.message}`,
          );
        }
      }

      aioLogger.error('Error getting video from cache:', {
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        code: error.code || undefined,
        status: error.status || undefined,
        videoId,
        language,
      });
      throw error;
    }
  };

  try {
    return await tryGet();
  } catch (error) {
    // Return fallback value on any error to maintain service availability
    aioLogger.warn(
      `Falling back to original videoId for ${videoId}-${language} due to error:`,
      error.message,
    );
    return videoId;
  }
};

/**
 * Main function for the scheduled wrapper action
 * @param {Object} params - Parameters object
 * @param {string} params.MPC_GITHUB_PAT - Personal Access Token for GitHub API authentication (optional)
 */
export const main = async (params = {}) => {
  const { mpcGithubToken } = params;
  const startTime = Date.now();

  try {
    const token = mpcGithubToken || process.env.MPC_GITHUB_PAT;
    const result = await fetchAndCacheVideoData(token);

    const duration = Date.now() - startTime;

    if (result.success) {
      aioLogger.info('Scheduled video data fetch completed successfully', {
        duration: `${duration}ms`,
        cacheSize: result.cacheSize,
      });
      return {
        body: {
          success: true,
          message: 'Video data cache refreshed successfully',
          cacheSize: result.cacheSize,
          duration: `${duration}ms`,
        },
        statusCode: 200,
      };
    }

    aioLogger.error('Scheduled video data fetch failed:', {
      ...result,
      duration: `${duration}ms`,
    });

    return {
      body: {
        success: false,
        message: 'Failed to refresh video data cache',
        error: result.error,
        code: result.code,
        suggestion: result.suggestion || 'Check token or network connectivity',
        duration: `${duration}ms`,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    aioLogger.error('Error in scheduled wrapper main function:', {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      code: error.code || undefined,
      status: error.status || undefined,
      duration: `${duration}ms`,
    });

    return {
      body: {
        success: false,
        message: 'Internal error during scheduled fetch',
        error: error.message,
        duration: `${duration}ms`,
      },
      statusCode: 500,
    };
  }
};
