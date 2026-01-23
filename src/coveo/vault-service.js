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
 * Uses AppRole authentication and Adobe I/O state library for caching
 */
export class VaultService {
  constructor({ endpoint, roleId, secretId, state, cacheTtlSeconds }) {
    if (!roleId || !secretId) {
      throw new Error('AppRole credentials (roleId and secretId) are required');
    }

    if (!state) {
      throw new Error('State store is required');
    }

    this.vaultClient = vault({
      apiVersion: 'v1',
      endpoint,
    });
    this.endpoint = endpoint;
    this.roleId = roleId;
    this.secretId = secretId;
    this.authenticated = false;
    this.cacheTtlSeconds = cacheTtlSeconds;
    this.stateStore = state;

    aioLogger.info(
      `[VAULT] Initialized with endpoint: ${endpoint}, cache TTL: ${this.cacheTtlSeconds}s`,
    );
  }

  // Generate unique cache key for vault path using base64 encoding

  static getCacheKey(path) {
    return `vault_${Buffer.from(path).toString('base64')}`;
  }

  // Get cached data if valid, otherwise return null

  async getCachedData(cacheKey) {
    try {
      const result = await this.stateStore.get(cacheKey);
      const value = result?.value ?? null;

      if (value) {
        aioLogger.info(`[VAULT] Using cached data`);
      } else {
        aioLogger.info(`[VAULT] Cache miss, fetching from Vault`);
      }
      return value;
    } catch (error) {
      aioLogger.error(`[VAULT] Cache read error: ${error.message}`);
      return null;
    }
  }

  // Cache data with TTL

  async setCachedData(cacheKey, data, ttlSeconds = this.cacheTtlSeconds) {
    try {
      // Ensure ttl is a number (convert from string if needed)
      const ttl =
        typeof ttlSeconds === 'number'
          ? ttlSeconds
          : Number(ttlSeconds) || this.cacheTtlSeconds;
      await this.stateStore.put(cacheKey, data, { ttl });
      const expiresAt = new Date(Date.now() + ttl * 1000);
      aioLogger.info(
        `[VAULT] Cached | Expires: ${expiresAt.toISOString()} | TTL: ${ttl}s (${(
          ttl / 3600
        ).toFixed(1)}h)`,
      );
    } catch (error) {
      aioLogger.error(`[VAULT] Cache write failed: ${error.message}`);
      throw error;
    }
  }

  // Clear cached data

  async clearCachedData(cacheKey) {
    try {
      await this.stateStore.delete(cacheKey);
    } catch (error) {
      aioLogger.warn(`[VAULT] Cache clear error: ${error.message}`);
    }
  }

  // Authenticate with Vault using AppRole with token caching
  async authenticateWithAppRole() {
    const authCacheKey = 'vault_auth_token';

    const cachedAuth = await this.getCachedData(authCacheKey);
    if (cachedAuth?.token) {
      this.vaultClient.token = cachedAuth.token;
      this.authenticated = true;
      return;
    }

    try {
      aioLogger.info(
        '[VAULT] Authenticating with AppRole (cache expired or first call)',
      );

      const response = await this.vaultClient.approleLogin({
        role_id: this.roleId,
        secret_id: this.secretId,
      });

      // Set the client token from AppRole login response
      this.vaultClient.token = response.auth.client_token;
      this.authenticated = true;

      // CACHE the token for the configurable TTL
      await this.setCachedData(authCacheKey, {
        token: response.auth.client_token,
      });

      aioLogger.info('[VAULT] Authentication successful');
    } catch (error) {
      await this.clearCachedData(authCacheKey);
      this.authenticated = false;
      aioLogger.error(`[VAULT] Authentication failed: ${error.message}`);
      throw error;
    }
  }

  // Read a secret from Vault with caching
  async readSecret(path) {
    const cacheKey = VaultService.getCacheKey(path);

    const cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      aioLogger.info(`[VAULT] Returning cached secret data for path: ${path}`);
      return cachedData;
    }

    if (!this.authenticated) {
      await this.authenticateWithAppRole();
    }

    try {
      aioLogger.info(`[VAULT] Reading secret from Vault at path: ${path}`);
      const result = await this.vaultClient.read(path);
      const secretData = result.data;

      await this.setCachedData(cacheKey, secretData);
      return secretData;
    } catch (error) {
      if (
        error.message.includes('permission denied') ||
        error.message.includes('invalid token')
      ) {
        await this.clearCachedData('vault_auth_token');
        this.authenticated = false;

        await this.authenticateWithAppRole();
        const retry = await this.vaultClient.read(path);

        await this.setCachedData(cacheKey, retry.data);
        return retry.data;
      }

      aioLogger.error(
        `[VAULT] Failed to read secret at path ${path}: ${error.message}`,
      );
      throw error;
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
      aioLogger.info(
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

  // Clear auth cache

  async clearCache() {
    await this.clearCachedData('vault_auth_token');
    this.authenticated = false;
    aioLogger.info('[VAULT] Auth cache cleared');
  }

  // Cache diagnostics
  getCacheStats() {
    return {
      cachingMethod: 'Adobe I/O State Library',
      ttlHours: this.cacheTtlSeconds / 3600,
      authenticated: this.authenticated,
      endpoint: this.endpoint,
    };
  }
}

/**
 * Create and return a VaultService instance
 * @param {Object} config - Vault configuration
 * @param {string} config.endpoint - Vault endpoint URL
 * @param {string} config.roleId - Vault AppRole role_id
 * @param {string} config.secretId - Vault AppRole secret_id
 * @param {Object} config.state - Adobe I/O state store instance
 * @param {number} [config.cacheTtlSeconds=86400] - Cache TTL in seconds (default: 86400 = 24 hours)
 * @returns {VaultService}
 */
export function createVaultService(config) {
  return new VaultService(config);
}
