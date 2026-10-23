# Gainsight Community Platform Integration

> **Note:** This documentation was generated with AI assistance.

## Overview

This integration supports the Gainsight community platform through the `gainsight` action.

## Endpoint URL

- **Gainsight:** `/gainsight/profile-details`

Frontend calls use `/gainsight/` URLs without `platform=gainsight`. Gainsight is the default, so the parameter is optional; explicitly passing `platform=gainsight` remains supported.

## Supported Endpoints

1. **`/gainsight/profile-details`** - Returns user profile (username, location, title, company, profile URL)
2. **`/gainsight/profile-menu-list`** - Returns navigation menu items for user profile dropdown

## Files Modified

### New Files

- `src/khoros/utils/GainsightProxy.js` - Gainsight API handler with OAuth2
- `src/khoros/utils/GainsightOAuth2Service.js` - OAuth2 token management
- `src/khoros/utils/GainsightOAuth2TokenStore.js` - In-memory token caching

### Modified Files

- `src/khoros/index.js` - Platform routing logic
- `app.config.yaml` - Public action renamed to `gainsight`
- `build/express.js` - Environment variable handling and local `/gainsight/` routing
- `.github/workflows/deploy-action.yaml` - Deployment configuration

## Environment Variables

### Required Configuration

| Variable                       | Type     | Description            | Example                                |
| ------------------------------ | -------- | ---------------------- | -------------------------------------- |
| `IMS_ORIGIN`                   | Secret   | IMS token validation origin | `https://ims-na1.adobelogin.com` |
| `GAINSIGHT_API_URL`             | Secret   | Gainsight API base URL | `https://api2-us-west-2.insided.com`     |
| `GAINSIGHT_OAUTH2_CLIENT_ID`     | Secret   | OAuth2 client ID       | `c37a71bc-...`                          |
| `GAINSIGHT_OAUTH2_CLIENT_SECRET` | Secret   | OAuth2 client secret   | `d521443a...`                           |
| `GAINSIGHT_OAUTH2_SCOPE`         | Variable | OAuth2 scope           | `read`                                 |
| `GAINSIGHT_COMMUNITY_URL`        | Variable | Community base URL     | `https://adobe-en-community.insided.com` |

### Local Development

Add to `build/.local.env`:

```bash
GAINSIGHT_API_URL=https://api2-us-west-2.insided.com
GAINSIGHT_OAUTH2_CLIENT_ID=your-client-id
GAINSIGHT_OAUTH2_CLIENT_SECRET=your-client-secret
GAINSIGHT_OAUTH2_SCOPE=read
GAINSIGHT_COMMUNITY_URL=https://adobedx-en-sandbox-community.insided.com
```

### GitHub Actions

Configure in **Repository Settings → Secrets and variables → Actions** for each environment.

## Testing

**Local:**

```bash
# Gainsight
curl -H "x-ims-token: TOKEN" http://localhost:3030/gainsight/profile-details
```

## Key Features

- OAuth2 authentication with token caching
- Profile field mapping (City → location, Job Title → title, Company → company)
- PII protection in logs (masked email/user IDs)
- Error handling (404, 401, 502)
- Unchanged profile response format

---

**Generated with AI assistance • Dec 2024**
