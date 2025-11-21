/*
 * Copyright 2025 Adobe. All rights reserved.
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
import { createVaultService } from './vault-service.js';

export const aioLogger = Logger('coveo-token');

/**
 * Check if the request origin is from an allowed Adobe domain
 * @param {string} origin - The origin or referer header value
 * @param {string} host - The host header as fallback for local dev
 * @returns {boolean} - True if origin is allowed
 */
function isAllowedOrigin(origin, host = '') {
  // If no origin, check if it's a local development request via host header
  if (!origin) {
    aioLogger.debug('No origin header present, checking host header');
    if (
      host &&
      (host.startsWith('localhost') || host.startsWith('127.0.0.1'))
    ) {
      aioLogger.debug(`Local development request allowed via host: ${host}`);
      return true;
    }
    aioLogger.debug('No origin or valid host header present');
    return false;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    // Allow domains specific to experienceleague & experienceleaguecommunities

    const allowedPatterns = [
      /^experienceleague(-(dev|stage))?\.adobe\.com$/,
      /^experienceleaguecommunities(-(dev))?\.adobe\.com$/,
      /^author-p122525-e\d+\.adobeaemcloud\.com$/,
      /^([a-z0-9-]+)--([a-z0-9-]+)--adobe-experience-league\.(hlx|aem)\.(page|live)$/,
    ];

    const isAllowed = allowedPatterns.some((pattern) => pattern.test(hostname));

    if (isAllowed) {
      aioLogger.debug(`Origin allowed: ${hostname}`);
    } else {
      aioLogger.debug(`Origin denied: ${hostname}`);
    }

    return isAllowed;
  } catch (error) {
    aioLogger.error(`Error parsing origin '${origin}': ${error.message}`);
    return false;
  }
}

/**
 * Determine if the current environment is production based on deployment context
 * Priority:
 * 1. COVEO_ENV environment variable (explicit override)
 * 2. Adobe I/O Runtime namespace detection (looks for '-dev' suffix)
 * 3. Default to nonprod for safety
 * @returns {boolean} - True if production environment
 */
function determineEnvironment() {
  // 1. Check explicit COVEO_ENV environment variable (highest priority)
  if (process.env.COVEO_ENV) {
    const isProd = process.env.COVEO_ENV === 'production';
    aioLogger.info(
      `Environment determined by COVEO_ENV: ${
        isProd ? 'production' : 'nonprod'
      }`,
    );
    return isProd;
  }

  // 2. Check Adobe I/O Runtime namespace
  // PROD: 51837-exlmconverter
  // NONPROD: 51837-exlmconverter-dev (or anything else)
  // eslint-disable-next-line no-underscore-dangle
  const namespace = process.env.__OW_NAMESPACE || '';
  if (namespace) {
    // If namespace ends with 'exlmconverter', it's production
    if (namespace.endsWith('exlmconverter')) {
      aioLogger.info(
        `Environment determined by namespace '${namespace}': production`,
      );
      return true;
    }
    // Otherwise, it's nonprod
    aioLogger.info(
      `Environment determined by namespace '${namespace}': nonprod`,
    );
    return false;
  }

  // 3. Default to nonprod for safety
  aioLogger.info(
    'Environment defaulting to: nonprod (no environment indicators found)',
  );
  return false;
}

/**
 * Get token from local environment variables (for local development)
 * @param {boolean} isProd - Whether to use production or nonprod token
 * @returns {string|undefined} - The token from environment or undefined
 */
function getLocalToken(isProd) {
  const tokenEnvVar = isProd ? 'COVEO_TOKEN_PROD' : 'COVEO_TOKEN_NONPROD';
  const token = process.env[tokenEnvVar];

  if (token) {
    aioLogger.info(
      `Using local token from environment variable: ${tokenEnvVar}`,
    );
  }

  return token;
}

/**
 * Serves Coveo search token to the exlm site
 * Primary: Uses HashiCorp Vault with AppRole authentication (production)
 * Fallback: Uses local environment variables when Vault is not configured (local development)
 *
 * Environment Detection (automatic):
 * - COVEO_ENV environment variable (explicit override: 'production' or 'nonprod')
 * - Adobe I/O Runtime namespace (checks for '-dev' suffix)
 * - Defaults to nonprod for safety
 *
 * @param {Object} params - Action parameters
 * @param {string} params.vaultEndpoint - HashiCorp Vault endpoint URL
 * @param {string} params.vaultRoleId - Vault AppRole role_id
 * @param {string} params.vaultSecretId - Vault AppRole secret_id
 * @param {string} params.coveoSecretPath - Vault path to Coveo tokens (same path for both prod and nonprod)
 * @param {string} params.coveoSecretKeyProd - The key name for production token in Vault (default: 'prod_token')
 * @param {string} params.coveoSecretKeyNonprod - The key name for nonprod token in Vault (default: 'nonprod_token')
 * @returns {Promise<Object>} - The token response
 */
export const main = async function main(params) {
  const {
    vaultEndpoint,
    vaultRoleId,
    vaultSecretId,
    coveoSecretPath,
    coveoSecretKeyProd = 'prod_token',
    coveoSecretKeyNonprod = 'nonprod_token',
    __ow_headers, // eslint-disable-line camelcase
  } = params;

  try {
    // Validate request origin - must come from Adobe domains
    // eslint-disable-next-line camelcase
    const origin = __ow_headers?.origin || __ow_headers?.referer || '';
    // eslint-disable-next-line camelcase
    const host = __ow_headers?.host || '';
    const isValidOrigin = isAllowedOrigin(origin, host);

    if (!isValidOrigin) {
      aioLogger.warn(
        `Unauthorized access attempt from origin: ${origin}, host: ${host}`,
      );
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          error: 'Forbidden: Access denied from this origin',
        },
      };
    }

    aioLogger.info(`Request authorized from origin: ${origin}`);

    // Determine environment automatically based on deployment context
    const isProductionEnv = determineEnvironment();
    const environment = isProductionEnv ? 'production' : 'nonprod';

    // Check if Vault is configured
    const hasVaultConfig = vaultEndpoint && vaultRoleId && vaultSecretId;

    // 1. Primary: Use Vault with AppRole authentication (production path)
    if (hasVaultConfig) {
      aioLogger.info(
        `Fetching Coveo token from Vault using AppRole for ${environment} environment`,
      );

      // Validate secret path
      if (!coveoSecretPath) {
        aioLogger.error('Missing Coveo secret path');
        return sendError(500, 'Missing Coveo secret path configuration');
      }

      // Determine secret key based on environment
      const secretKey = isProductionEnv
        ? coveoSecretKeyProd
        : coveoSecretKeyNonprod;

      aioLogger.debug(
        `Vault endpoint: ${vaultEndpoint}, Secret path: ${coveoSecretPath}, Key: ${secretKey}`,
      );

      // Create Vault service with AppRole authentication
      const vaultService = createVaultService({
        endpoint: vaultEndpoint,
        roleId: vaultRoleId,
        secretId: vaultSecretId,
      });

      const token = await vaultService.readSecretKey(
        coveoSecretPath,
        secretKey,
      );

      if (!token) {
        aioLogger.error(
          `Retrieved empty token from Vault for ${environment} environment`,
        );
        return sendError(500, 'Failed to retrieve valid token from Vault');
      }

      aioLogger.info(
        `Successfully retrieved Coveo token from Vault for ${environment} environment`,
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: {
          token,
        },
      };
    }

    // 2. Fallback: Use local environment variables (local development only)
    aioLogger.info(
      'Vault not configured, checking for local token environment variables',
    );
    const localToken = getLocalToken(isProductionEnv);

    if (localToken) {
      aioLogger.info(
        `Successfully retrieved Coveo token from local environment for ${environment}`,
      );
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: {
          token: localToken,
        },
      };
    }

    // No token source available
    aioLogger.error(
      'No token source available: Vault not configured and no local environment variables found',
    );
    return sendError(
      500,
      'Missing token configuration: Vault credentials or local environment variables required',
    );
  } catch (error) {
    aioLogger.error(`Error fetching Coveo token: ${error.message}`);
    return sendError(500, `Failed to fetch Coveo token: ${error.message}`);
  }
};
