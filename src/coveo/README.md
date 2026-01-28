# Coveo Token Service

A secure token service for retrieving Coveo search API tokens for the Experience League (ExL) site. This service provides tokens to authenticated clients while maintaining security through origin validation and HashiCorp Vault integration.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Environment Detection](#environment-detection)
- [Security](#security)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Coveo Token Service is an Adobe I/O Runtime action that:

1. **Validates request origins** to ensure requests come only from authorized Adobe domains
2. **Automatically detects environment** (production vs nonprod) based on deployment context
3. **Retrieves tokens from HashiCorp Vault** using AppRole authentication
4. **Falls back to local environment variables** for development scenarios
5. **Returns tokens with proper CORS headers** for browser-based requests

### Key Features

- ✅ **Secure**: Origin validation prevents unauthorized access
- ✅ **Automatic**: Environment detection requires no manual configuration
- ✅ **Flexible**: Supports both Vault and local environment variables
- ✅ **Cached**: Vault authentication tokens and secrets cached using Adobe I/O State Library
- ✅ **Performant**: Cache reduces Vault API calls and improves response times
- ✅ **Observable**: Comprehensive logging for debugging and monitoring

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser/API)                      │
│         (experienceleague.adobe.com, *.hlx.page, etc)       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Coveo Token Service (index.js)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Origin Validation                                 │   │
│  │     - Check origin/referer/host headers               │   │
│  │     - Validate against allowed Adobe domains          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  2. Environment Detection (determineEnvironment())    │   │
│  │     Priority:                                         │   │
│  │     1. COVEO_ENV environment variable                 │   │
│  │     2. Adobe I/O Runtime namespace detection          │   │
│  │     3. Default to nonprod                             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  3. Token Retrieval                                   │   │
│  │     Primary: Vault → Fallback: Local env vars        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────────┐          ┌──────────────────────┐
│ HashiCorp Vault   │          │ Local Env Variables  │
│ (vault-service.js)│          │ (Development Only)   │
│                   │          │                      │
│ - AppRole Auth    │          │ COVEO_TOKEN_PROD     │
│ - Token Caching   │          │ COVEO_TOKEN_NONPROD  │
│ - KV v2 Support   │          │                      │
└─────────┬─────────┘          └──────────────────────┘
          │
          │ Cache Layer
          ▼
┌─────────────────────────────────────────┐
│     Adobe I/O State Library             │
│     (@adobe/aio-lib-state)             │
│                                         │
│  - Auth Token Cache (TTL: 24h default) │
│  - Secret Data Cache (TTL: 24h default)│
└─────────────────────────────────────────┘
```

### Files

| File               | Purpose                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `index.js`         | Main service logic, origin validation, environment detection             |
| `vault-service.js` | HashiCorp Vault client with AppRole authentication and AIO State caching |
| `README.md`        | This documentation                                                       |

---

## Environment Detection

The service **automatically detects** whether it's running in production or nonprod without requiring client input.

### Detection Logic (Priority Order)

```javascript
1. COVEO_ENV environment variable (explicit override)
   └─> If set to "production" → Production
   └─> Otherwise → Nonprod

2. Adobe I/O Runtime Namespace Detection
   └─> If namespace ends with base namespace name → Production
   └─> Otherwise (e.g., with "-dev" or "-stage" suffix) → Nonprod

3. Default Fallback
   └─> Nonprod (safe default)
```

### Namespace Examples

| Namespace             | Environment    | Reasoning                  |
| --------------------- | -------------- | -------------------------- |
| `12345-yourapp`       | **Production** | Ends with `yourapp`        |
| `12345-yourapp-dev`   | **Nonprod**    | Ends with `-dev`           |
| `12345-yourapp-stage` | **Nonprod**    | Doesn't end with `yourapp` |
| `(local development)` | **Nonprod**    | No namespace present       |

### Why This Matters

- **Security**: Clients cannot manipulate which environment they access
- **Simplicity**: No need to pass `isProd` parameters in requests
- **Reliability**: Environment is determined by deployment infrastructure

---

## Security

### Origin Validation

All requests are validated against an allowlist of Adobe domains:

#### Allowed Origins

```javascript
- *.adobe.com
- *.adobe.io
- *.adobeaemcloud.com
- *.hlx.page
- *.hlx.live
- experienceleague.adobe.com
- localhost (for local development)
- 127.0.0.1 (for local development)
```

#### How It Works

1. **Browser requests** (fetch/XHR): Checks `Origin` header
2. **Direct browser access**: Falls back to `Host` header (localhost only)
3. **Server requests**: Checks `Referer` header

#### Response on Validation Failure

```json
{
  "error": "Forbidden: Access denied from this origin"
}
```

HTTP Status: `403 Forbidden`

### Token Storage

- **Production**: Tokens stored securely in HashiCorp Vault
- **Local Development**: Tokens stored in `.local.env` (not committed to git)
- **Runtime**: Vault responses cached in memory for performance

---

## Configuration

### Vault Configuration

The service uses a **single Vault path** with **different keys** for prod and nonprod:

```bash
# Vault Path (same for both environments)
COVEO_SECRET_PATH=<your-vault-path>/data/coveo

# Vault Keys (different for each environment)
COVEO_SECRET_KEY_PROD=<your-prod-key-name>
COVEO_SECRET_KEY_NONPROD=<your-nonprod-key-name>
```

#### Vault Secret Structure

```json
{
  "<your-prod-key-name>": "prod-token-value",
  "<your-nonprod-key-name>": "nonprod-token-value"
}
```

### Environment Variables

#### Required for Vault Access

```bash
# Vault Connection
VAULT_ENDPOINT=https://vault.example.com
VAULT_ROLE_ID=<your-approle-role-id>
VAULT_SECRET_ID=<your-approle-secret-id>

# Vault Secret Configuration
COVEO_SECRET_PATH=<your-vault-path>/data/coveo
COVEO_SECRET_KEY_PROD=<your-prod-key-name>
COVEO_SECRET_KEY_NONPROD=<your-nonprod-key-name>
```

#### Optional Override

```bash
# Explicit environment override (overrides auto-detection)
COVEO_ENV=production  # or "nonprod"
```

#### Local Development Fallback

```bash
# Only used when Vault credentials are NOT configured
COVEO_TOKEN_PROD=xxPROD-TOKEN-EXAMPLE-1234
COVEO_TOKEN_NONPROD=xxNONPROD-TOKEN-EXAMPLE-5678
```

#### Cache Configuration

```bash
# Optional: Vault token cache TTL in seconds (default: 86400 = 24 hours)
VAULT_TOKEN_CACHE_TTL_SECONDS=86400
```

---

## Caching

The service uses **Adobe I/O State Library** to cache Vault authentication tokens and retrieved secrets, significantly reducing Vault API calls and improving response times.

### How It Works

The caching system operates at two levels:

1. **Authentication Token Caching**: Vault AppRole authentication tokens are cached to avoid re-authenticating on every request
2. **Secret Data Caching**: Retrieved secrets from Vault are cached to avoid repeated reads

### Cache Implementation

- **Storage**: Adobe I/O State Library (`@adobe/aio-lib-state`)
  - **Production**: Uses Adobe I/O Runtime's distributed state store
  - **Local Development**: Uses in-memory mock state store (when `LOCAL_CONVERTER` is set)
- **TTL (Time To Live)**: Configurable per cache entry (default: 24 hours)
- **Cache Keys**:
  - Authentication: `vault_auth_token`
  - Secrets: `vault_<base64-encoded-path>`

### Cache Behavior

#### Authentication Token Cache

```javascript
// Cache key: 'vault_auth_token'
// TTL: Configurable (default: 86400 seconds = 24 hours)
// Cached value: { token: "vault-client-token-string" }
```

- **Cache Hit**: Reuses existing Vault token, skips AppRole authentication
- **Cache Miss**: Performs AppRole login, caches token for future use
- **On Error**: Clears auth cache and re-authenticates

#### Secret Data Cache

```javascript
// Cache key: 'vault_<base64-encoded-path>'
// TTL: Configurable (default: 86400 seconds = 24 hours)
// Cached value: Secret data object from Vault
```

- **Cache Hit**: Returns cached secret data immediately
- **Cache Miss**: Fetches from Vault, caches result
- **On Permission Error**: Clears auth cache, re-authenticates, retries

### Configuration

#### Cache TTL

The cache TTL can be configured via the `vaultTokenCacheTtlSeconds` parameter:

```bash
# Environment variable (passed as action parameter)
VAULT_TOKEN_CACHE_TTL_SECONDS=3600  # 1 hour
```

**Default**: `86400` seconds (24 hours) if not specified or invalid

**Validation**:

- Must be a positive number
- Automatically converts string values to numbers
- Falls back to default (86400) if invalid or missing

### Cache Lifecycle

```
Request → Check Auth Cache
  ├─ Cache Hit → Use cached token
  └─ Cache Miss → Authenticate → Cache token

Request → Check Secret Cache
  ├─ Cache Hit → Return cached secret
  └─ Cache Miss → Read from Vault → Cache secret → Return
```

### Cache Invalidation

Caches are automatically invalidated when:

1. **TTL Expires**: Cache entries expire after the configured TTL
2. **Authentication Errors**: Auth cache is cleared on authentication failures
3. **Permission Errors**: Auth cache is cleared when Vault returns permission denied
4. **Invalid Token Errors**: Auth cache is cleared when Vault token becomes invalid

### Performance Benefits

- **Reduced Latency**: Cached responses return in milliseconds vs. hundreds of milliseconds for Vault API calls
- **Reduced Load**: Fewer requests to Vault reduce API rate limit concerns
- **Improved Reliability**: Cached data available even if Vault is temporarily unavailable (until cache expires)

### Monitoring

Cache behavior is logged for observability:

```
✅ Cache hits:
[VAULT] Using cached data
[VAULT] Returning cached secret data for path: <path>

❌ Cache misses:
[VAULT] Cache miss, fetching from Vault
[VAULT] Authenticating with AppRole (cache expired or first call)

📊 Cache operations:
[VAULT] Cached | Expires: <timestamp> | TTL: <seconds>s (<hours>h)
```

### Local Development

When running locally with `LOCAL_CONVERTER` environment variable set, the service uses an in-memory mock state store. Cache entries persist only for the duration of the process and are cleared on server restart.

---

## Local Development

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment** in `build/.local.env`:

   **Option A: Use Vault (Production-like)**

   ```bash
   VAULT_ENDPOINT=https://vault.example.com
   VAULT_ROLE_ID=<your-role-id>
   VAULT_SECRET_ID=<your-secret-id>
   COVEO_SECRET_PATH=<your-vault-path>/data/coveo
   COVEO_SECRET_KEY_PROD=<your-prod-key-name>
   COVEO_SECRET_KEY_NONPROD=<your-nonprod-key-name>
   ```

   **Option B: Use Local Tokens (Simpler)**

   ```bash
   # Comment out Vault credentials
   # VAULT_ENDPOINT=...

   # Use local tokens instead
   COVEO_TOKEN_NONPROD=xxNONPROD-TOKEN-EXAMPLE-5678
   COVEO_TOKEN_PROD=xxPROD-TOKEN-EXAMPLE-1234
   ```

3. **Start local server:**

   ```bash
   npm run serve
   ```

   Server starts at: `http://localhost:3030/coveo`

### Testing Locally

```bash
# Test nonprod token (default)
curl http://localhost:3030/coveo

# Test with production environment override
COVEO_ENV=production npm run serve
curl http://localhost:3030/coveo
```

### Expected Response

```json
{
  "token": "xxEXAMPLE-TOKEN-abc123def456"
}
```

---

## Deployment

### Adobe I/O Runtime Deployment

The service is deployed as part of the main converter application:

```bash
npm run deploy
```

### GitHub Actions

Deployment happens automatically via GitHub Actions on push to:

- `main` branch → **Production** environment
- `stage` branch → **Stage** environment
- `develop` branch → **Dev** environment

### Required GitHub Secrets

```yaml
Secrets:
  VAULT_ENDPOINT: https://vault.example.com
  VAULT_ROLE_ID: <role-id>
  VAULT_SECRET_ID: <secret-id>
  COVEO_SECRET_PATH: <your-vault-path>/data/coveo
  COVEO_SECRET_KEY_PROD: <your-prod-key-name>
  COVEO_SECRET_KEY_NONPROD: <your-nonprod-key-name>

Variables (optional):
  COVEO_ENV: (leave empty for auto-detection)
```

### Endpoints

After deployment:

| Environment    | URL                                                                               |
| -------------- | --------------------------------------------------------------------------------- |
| **Production** | `https://<namespace>.adobeioruntime.net/api/v1/web/<package>/coveo-token`         |
| **Dev**        | `https://<namespace>-dev.adobeioruntime.net/api/v1/web/<package>-dev/coveo-token` |

---

## Testing

### Manual Testing

#### Test Production Endpoint

```bash
curl https://<namespace>.adobeioruntime.net/api/v1/web/<package>/coveo-token
```

#### Test Dev Endpoint

```bash
curl https://<namespace>-dev.adobeioruntime.net/api/v1/web/<package>-dev/coveo-token
```

#### Test with Origin Header

```bash
curl -H "Origin: https://experienceleague.adobe.com" \
  http://localhost:3030/coveo-token
```

### Verify Vault Access

Test Vault connectivity directly:

```bash
# 1. Authenticate with AppRole
LOGIN_RESPONSE=$(curl -s -X POST https://vault.example.com/v1/auth/approle/login \
  -d '{"role_id":"YOUR_ROLE_ID","secret_id":"YOUR_SECRET_ID"}')

# 2. Extract token
VAULT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"client_token":"[^"]*"' | cut -d'"' -f4)

# 3. Read secret
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  https://vault.example.com/v1/<your-vault-path>/data/coveo
```

### Expected Behaviors

| Scenario             | Expected Result       |
| -------------------- | --------------------- |
| Valid Adobe origin   | `200` with token      |
| Invalid origin       | `403 Forbidden`       |
| Vault configured     | Uses Vault token      |
| Vault not configured | Uses local env token  |
| Production namespace | Returns prod token    |
| Nonprod namespace    | Returns nonprod token |

---

## Troubleshooting

### Common Issues

#### 1. "Permission Denied" from Vault

**Error:**

```
Failed to read secret from Vault: permission denied
```

**Causes:**

- AppRole doesn't have read permissions for the secret path
- Incorrect Vault path (check for `/v1/` prefix - it should NOT be included)

**Solutions:**

```bash
# Verify the path doesn't include /v1/
COVEO_SECRET_PATH=<your-vault-path>/data/coveo  # ✅ Correct
# NOT: /v1/<your-vault-path>/data/coveo  # ❌ Wrong

# Test Vault access manually (see Testing section above)

# Contact Vault admin to grant read permissions
```

#### 2. "Forbidden: Access denied from this origin"

**Causes:**

- Request coming from unauthorized domain
- Missing origin headers

**Solutions:**

```bash
# Verify origin is in allowlist
# For local dev, use localhost:
curl http://localhost:3030/coveo

# For browser requests, ensure domain matches allowed patterns
```

#### 3. Empty Token Returned

**Causes:**

- Token key doesn't exist in Vault
- Wrong key name configured

**Solutions:**

```bash
# Verify Vault secret structure
curl -H "X-Vault-Token: $TOKEN" \
  https://vault.example.com/v1/<your-vault-path>/data/coveo

# Check key names match:
COVEO_SECRET_KEY_PROD=<your-prod-key-name>
COVEO_SECRET_KEY_NONPROD=<your-nonprod-key-name>
```

#### 4. Local Development: Changes Not Taking Effect

**Cause:**

- `.local.env` changes require server restart
- `nodemon` only watches code files, not `.local.env`

**Solution:**

```bash
# Stop server (Ctrl+C) and restart
npm run serve
```

#### 5. Wrong Environment Token Being Returned

**Causes:**

- Environment detection not working as expected
- Explicit `COVEO_ENV` override set incorrectly

**Debug:**

```bash
# Check logs for environment detection:
# "Environment determined by COVEO_ENV: production"
# "Environment determined by namespace '<your-namespace>': production"
# "Environment defaulting to: nonprod"

# Verify namespace (in deployed environment):
echo $__OW_NAMESPACE

# Test with explicit override:
COVEO_ENV=production npm run serve
```

#### 6. Cache TTL Error: "ttl" must be a number

**Error:**

```
[VAULT] Cache write failed: [StateLib:ERROR_BAD_ARGUMENT] "ttl" must be a number
```

**Causes:**

- `VAULT_TOKEN_CACHE_TTL_SECONDS` environment variable is set to a non-numeric value
- Environment variable is set to an empty string or invalid value
- Missing environment variable (should default to 86400, but may fail if incorrectly passed)

**Solutions:**

```bash
# Ensure TTL is a valid positive number (in seconds)
VAULT_TOKEN_CACHE_TTL_SECONDS=3600  # ✅ Valid: 1 hour
VAULT_TOKEN_CACHE_TTL_SECONDS=86400 # ✅ Valid: 24 hours (default)

# Invalid examples:
VAULT_TOKEN_CACHE_TTL_SECONDS=60s   # ❌ Invalid: contains "s"
VAULT_TOKEN_CACHE_TTL_SECONDS=""    # ❌ Invalid: empty string
VAULT_TOKEN_CACHE_TTL_SECONDS=0     # ❌ Invalid: must be > 0

# If not set, defaults to 86400 (24 hours)
# The service automatically converts string numbers to integers
```

**Note**: The service automatically handles conversion and defaults to 86400 seconds if the value is missing or invalid.

#### 7. Stale Cache Data

**Symptoms:**

- Token returned from cache is expired or invalid
- Secret data in cache doesn't reflect recent Vault changes

**Causes:**

- Cache TTL is too long
- Vault secret was updated but cache hasn't expired yet

**Solutions:**

```bash
# Reduce cache TTL for more frequent updates
VAULT_TOKEN_CACHE_TTL_SECONDS=3600  # 1 hour instead of 24 hours

# Cache automatically expires after TTL
# Wait for cache expiration or restart the action

# Cache is automatically cleared on authentication/permission errors
```

**Note**: Cache entries automatically expire after the configured TTL. On authentication or permission errors, the auth cache is automatically cleared to force re-authentication.

### Debug Logging

Enable debug logging:

```bash
# Local development
export AIO_LOG_LEVEL=debug
npm run serve

# Deployed action (set in app.config.yaml)
inputs:
  LOG_LEVEL: debug
```

### Log Messages to Look For

```
✅ Success indicators:
- "Request authorized from origin: ..."
- "Environment determined by ..."
- "[VAULT] Initialized with endpoint: ..., cache TTL: ...s"
- "[VAULT] Using cached data"
- "[VAULT] Returning cached secret data for path: ..."
- "[VAULT] AppRole authentication successful"
- "[VAULT] Cached | Expires: ... | TTL: ...s (...h)"
- "Successfully retrieved Coveo token from Vault"

📊 Cache indicators:
- "[VAULT] Cache miss, fetching from Vault"
- "[VAULT] Authenticating with AppRole (cache expired or first call)"
- "[VAULT] Cache write failed: ..."

❌ Error indicators:
- "Unauthorized access attempt from origin: ..."
- "[VAULT] Cache write failed: [StateLib:ERROR_BAD_ARGUMENT] ..."
- "[VAULT] AppRole authentication failed"
- "[VAULT] Failed to read secret from Vault"
- "[VAULT] Authentication failed: ..."
- "No token source available"
```

---

## API Reference

### Request

```http
GET /coveo
```

**Headers:**

- `Origin` (automatically sent by browsers on cross-origin requests)
- `Referer` (fallback for origin validation)
- `Host` (fallback for localhost direct access)

**Query Parameters:** None required

### Response

**Success (200):**

```json
{
  "token": "xxEXAMPLE-TOKEN-abc123def456"
}
```

**Headers:**

```http
Content-Type: application/json
Access-Control-Allow-Origin: <requesting-origin>
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Error (403):**

```json
{
  "error": "Forbidden: Access denied from this origin"
}
```

**Error (500):**

```json
{
  "error": {
    "code": 500,
    "message": "Failed to fetch Coveo token: <error details>"
  }
}
```

---

## Architecture Decisions

### Why Auto-Detect Environment?

**Alternative:** Accept `isProd` parameter in request

**Chosen:** Auto-detect from deployment namespace

**Reasoning:**

- **Security**: Prevents clients from requesting prod tokens in nonprod
- **Simplicity**: No need to pass parameters
- **Reliability**: Environment determined by infrastructure, not client

### Why Single Vault Path with Different Keys?

**Alternative:** Separate paths for prod/nonprod

**Chosen:** Same path, different keys

**Reasoning:**

- **Simplicity**: One path to manage and configure
- **Flexibility**: Easy to add new environments as additional keys
- **Permissions**: Simpler Vault policy management

### Why Origin Validation?

**Alternative:** Rely on Adobe I/O authentication

**Reasoning:**

- **Defense in depth**: Multiple layers of security
- **Browser requests**: Origin validation works well for CORS
- **Explicit allowlist**: Clear documentation of who can access

### Why Use Adobe I/O State Library for Caching?

**Alternative:** In-memory caching, Redis, or no caching

**Chosen:** Adobe I/O State Library (`@adobe/aio-lib-state`)

**Reasoning:**

- **Native Integration**: Built-in support for Adobe I/O Runtime actions
- **Distributed**: Shared cache across action instances in production
- **TTL Support**: Built-in time-to-live for automatic cache expiration
- **Reliability**: Managed service reduces operational overhead
- **Performance**: Reduces Vault API calls and improves response times
- **Local Development**: Seamless fallback to in-memory mock for local testing

**Cache Strategy:**

- **Two-Level Caching**: Separate caches for auth tokens and secret data
- **Configurable TTL**: Default 24 hours, configurable per deployment
- **Automatic Invalidation**: Cache cleared on authentication/permission errors
- **Graceful Degradation**: Cache failures don't break the service

---

## Dependencies

```json
{
  "@adobe/aio-lib-core-logging": "^2.0.1",
  "@adobe/aio-lib-state": "^4.0.0",
  "node-vault": "^0.10.2"
}
```

- **@adobe/aio-lib-core-logging**: Adobe's logging library for structured logs
- **@adobe/aio-lib-state**: Adobe I/O State Library for caching Vault tokens and secrets
- **node-vault**: HashiCorp Vault client for Node.js

---

## Contributing

When making changes:

1. Update this README if behavior changes
2. Test both local and Vault configurations
3. Verify origin validation still works
4. Check logs for any new error scenarios
5. Update `app.config.yaml` if environment variables change

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review logs with `LOG_LEVEL=debug`
3. Contact the ExL development team

---

## License

Copyright 2023 Adobe. All rights reserved.
This file is licensed under the Apache License, Version 2.0.
