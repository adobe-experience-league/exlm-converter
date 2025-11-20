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
- ✅ **Cached**: Vault responses are cached for performance
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
└───────────────────┘          └──────────────────────┘
```

### Files

| File               | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `index.js`         | Main service logic, origin validation, environment detection   |
| `vault-service.js` | HashiCorp Vault client with AppRole authentication and caching |
| `README.md`        | This documentation                                             |

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
- "[VAULT] AppRole authentication successful"
- "Successfully retrieved Coveo token from Vault"

❌ Error indicators:
- "Unauthorized access attempt from origin: ..."
- "[VAULT] AppRole authentication failed"
- "[VAULT] Failed to read secret from Vault"
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

---

## Dependencies

```json
{
  "@adobe/aio-lib-core-logging": "^2.0.1",
  "node-vault": "^0.10.2"
}
```

- **aio-lib-core-logging**: Adobe's logging library for structured logs
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
