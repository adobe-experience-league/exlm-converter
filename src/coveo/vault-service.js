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

import vault from 'node-vault';
import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('vault-service');

/**
 * VaultService class for interacting with HashiCorp Vault
 * Uses AppRole authentication for secure access
 * Implements in-memory caching for better performance
 */
export class VaultService {
  constructor({ endpoint, roleId, secretId }) {
    if (!roleId || !secretId) {
      throw new Error('AppRole credentials (roleId and secretId) are required');
    }

    this.vaultClient = vault({
      apiVersion: 'v1',
      endpoint,
    });
    this.endpoint = endpoint;
    this.roleId = roleId;
    this.secretId = secretId;
    this.authenticated = false;

    // In-memory cache for Vault secrets
    this.vaultCache = new Map();

    aioLogger.debug(`[VAULT] Initialized with endpoint: ${endpoint}`);
  }

  /**
   * Authenticate with Vault using AppRole
   * @private
   */
  async authenticateWithAppRole() {
    if (this.authenticated) {
      aioLogger.debug('[VAULT] Already authenticated, skipping AppRole login');
      return;
    }

    try {
      aioLogger.debug('[VAULT] Authenticating with AppRole');
      const response = await this.vaultClient.approleLogin({
        role_id: this.roleId,
        secret_id: this.secretId,
      });

      // Set the client token from AppRole login response
      this.vaultClient.token = response.auth.client_token;
      this.authenticated = true;

      aioLogger.info('[VAULT] AppRole authentication successful');
    } catch (error) {
      aioLogger.error(
        `[VAULT] AppRole authentication failed: ${error.message}`,
      );
      throw new Error(
        `Failed to authenticate with Vault using AppRole: ${error.message}`,
      );
    }
  }

  /**
   * Read a secret from Vault with caching support
   * @param {string} path - The path to the secret in Vault
   * @returns {Promise<Object>} - The secret data
   */
  async readSecret(path) {
    // Check cache first
    if (this.vaultCache.has(path)) {
      aioLogger.debug(`[VAULT] Cache hit for path: ${path}`);
      return this.vaultCache.get(path);
    }

    aioLogger.debug(`[VAULT] Cache miss for path: ${path}`);

    // Ensure we're authenticated
    if (!this.authenticated) {
      await this.authenticateWithAppRole();
    }

    try {
      aioLogger.debug(`[VAULT] Reading secret from Vault at path: ${path}`);
      const result = await this.vaultClient.read(path);
      const secretData = result.data;

      // Cache the result
      this.vaultCache.set(path, secretData);
      aioLogger.debug(
        `[VAULT] Secret read successfully and cached at path: ${path}`,
      );

      return secretData;
    } catch (error) {
      aioLogger.error(
        `[VAULT] Failed to read secret from Vault at path ${path}: ${error.message}`,
      );
      throw new Error(`Failed to read secret from Vault: ${error.message}`);
    }
  }

  /**
   * Read a specific key from a secret in Vault
   * @param {string} path - The path to the secret in Vault
   * @param {string} key - The key to extract from the secret
   * @returns {Promise<string>} - The secret value
   */
  async readSecretKey(path, key) {
    try {
      const secretData = await this.readSecret(path);

      // Handle KV v2 secrets (data is nested under 'data' key)
      const data = secretData.data || secretData;

      if (!data[key]) {
        throw new Error(`Key '${key}' not found in secret at path ${path}`);
      }

      aioLogger.debug(
        `[VAULT] Successfully retrieved key '${key}' from path: ${path}`,
      );
      return data[key];
    } catch (error) {
      aioLogger.error(
        `[VAULT] Failed to read key '${key}' from Vault at path ${path}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Clear the cache (useful for testing or forcing refresh)
   */
  clearCache() {
    aioLogger.debug('[VAULT] Clearing cache');
    this.vaultCache.clear();
  }
}

/**
 * Create and return a VaultService instance
 * @param {Object} config - Vault configuration
 * @param {string} config.endpoint - Vault endpoint URL
 * @param {string} config.roleId - Vault AppRole role_id
 * @param {string} config.secretId - Vault AppRole secret_id
 * @returns {VaultService}
 */
export function createVaultService(config) {
  return new VaultService(config);
}
