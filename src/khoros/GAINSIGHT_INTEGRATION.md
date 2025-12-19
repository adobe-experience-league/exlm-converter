# Gainsight Community Platform Integration

> **Note:** This documentation was generated with AI assistance.

## Overview

This integration adds support for the Gainsight community platform alongside the existing Khoros platform. It is designed to **not impact existing Khoros functionality** and enables a smooth transition from Khoros to Gainsight.

**Key Design:** Both platforms run simultaneously. Platform selection is controlled via the `platform` query parameter, with Khoros as the default for complete backward compatibility.

## Platform Selection

- **Khoros (default):** `/khoros/profile-details`
- **Gainsight:** `/khoros/profile-details?platform=gainsight`

## Supported Endpoints

1. **`/profile-details`** - Returns user profile (username, location, title, company, profile URL)
2. **`/profile-menu-list`** - Returns navigation menu items for user profile dropdown

## Files Modified

### New Files
- `src/khoros/utils/GainsightProxy.js` - Gainsight API handler with OAuth2
- `src/khoros/utils/GainsightOAuth2Service.js` - OAuth2 token management
- `src/khoros/utils/GainsightOAuth2TokenStore.js` - In-memory token caching

### Modified Files
- `src/khoros/index.js` - Platform routing logic
- `build/express.js` - Environment variable handling
- `.github/workflows/deploy-action.yaml` - Deployment configuration

## Environment Variables

### Required Configuration

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `GAINSIGHT_API_URL` | Secret | Gainsight API base URL | `https://api2-us-west-2.insided.com` |
| `GAINSIGHT_OAUTH2_CLIENT_ID` | Secret | OAuth2 client ID | `c37a71bc-...` |
| `GAINSIGHT_OAUTH2_CLIENT_SECRET` | Secret | OAuth2 client secret | `d521443a...` |
| `GAINSIGHT_OAUTH2_SCOPE` | Variable | OAuth2 scope | `read` |
| `GAINSIGHT_COMMUNITY_URL` | Variable | Community base URL | `https://adobe-en-community.insided.com` |

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

## Impact on Khoros

**✅ Zero Impact:**
- Default behavior unchanged (Khoros)
- No modifications to existing Khoros endpoints
- Platform parameter is optional
- Gainsight configuration is independent

## Community Transition

This implementation supports a phased migration:

1. **Parallel Operation** - Both platforms available, frontend controls routing
2. **Transition Period** - Gradual traffic shift to Gainsight
3. **Full Migration** - Switch default, maintain rollback capability

The design ensures zero disruption during the transition from Khoros to Gainsight.

## Testing

**Local:**
```bash
# Khoros (default)
curl -H "x-ims-token: TOKEN" http://localhost:3030/khoros/profile-details

# Gainsight
curl -H "x-ims-token: TOKEN" http://localhost:3030/khoros/profile-details?platform=gainsight
```

## Key Features

- OAuth2 authentication with token caching
- Profile field mapping (City → location, Job Title → title, Company → company)
- PII protection in logs (masked email/user IDs)
- Error handling (404, 401, 502)
- Response format compatibility with Khoros

---

**Generated with AI assistance • Dec 2024**

