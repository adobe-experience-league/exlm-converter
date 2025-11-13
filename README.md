# EXLM Converter

Despite the name, this is a collection of Web Actions (on adobe io):

1. `converter`: The entry point for Experience League [Edge Deliver BYOM](https://www.aem.live/developer/byom). AKA where EDS sources the HTML for exl pages when they are published.
2. `khoros`: Proxies requests to a custom khoros endpoint to get Current User Community links.
3. `tocs`: given a TOC ID, Provides the HTML for the TOC via EXL API.

## More on the converter.

EXL is setup to use [Bring Your Own Markup](https://www.aem.live/developer/byom) on Edge Delivery with the `conevter` Web Action. When a page is [previewed](https://www.aem.live/docs/admin.html#tag/preview) this action will be [invoked](src/converter/index.js) (GET) and the action will determine where to source the HTML based on path, (docs, landing playlist, tocs, slide) will come from API, others will come from AEM. The content is then transformed and served as HTML.

> [!NOTE]
> Currently, this converter does the HTML conversion, but in V2 architecture, it will served already-converter HTML from the V2 delivery API.

## Build

```
npm run build
```

## Local Development

### Running the dev server

```
npm run serve
```

> That will build the action code inside an express app, with [src/express.js](src/express.js) as entry point watching any changes. In parallel it will rerun the express server if src files change.

### Serving Doc/Playlist pages locally

> These are pages that match `/<lang>/docs/*` or `/<lang>/playlists/*`

At a minimum, you need to create a file at `build/.local.env` in this repo, that contails below, then run `npm run serve`

```
EXL_API_HOST=https://experienceleague.adobe.com
```

> see description of this env variables in the `Application environment variables` section.

### Serving AEM Pages Locally

> These are pages from AEMaaCS, like homepage, perspectives ..etc. AKA non-docs and non-playlist pages.
> You DO NOT need this if you are just working on docs or playlists.

This setup simulates an authenticated request, coming from Edge Delivery Services intended to render from AEM.

1. get your local development access token from Cloud Manager Developer Console (see docs below)
2. Add file `build/.local.env` that should have the contents below (replace `<token>` with your token and `<aem author>` with the author url)
   > see description of these env variables in the `Application environment variables` section.

```
AEM_AUTHOR_URL=<aem author>
OWNER=adobe-experience-league
REPO=exlm
BRANCH=main
# get your local development access token from Cloud Manager Developer Console
ACCESS_TOKEN=<token>
```

#### Getting an AEM Developer Access Token

> [see cloud manager documentation on Developer Console and access](https://experienceleague.adobe.com/docs/experience-manager-learn/cloud-service/debugging/debugging-aem-as-a-cloud-service/developer-console.html?lang=en)

1. Navigate to Cloud Manager (If you dont have access to Cloud Manager, contact your program Admin)
2. Find your Program (again, contact your admin for program Name)
3. Find your environment
4. Navigate to the Developer Console for that environment
5. Click on `integration` Tab
6. Click on `Get Local Development Token`

> Developer tokens are short lived and should only be used for local testing/debugging.

### Working with the khoros API (and action locally)

> This is specifically for the khoros action.

in local, and lower environments, iPaaS is used to proxy to khoros services.

The khoros action is available locally at `localhost:3030/khoros/<proxy path here>` when you run `npm run serve`

this local setup requires the follwoing env variables to be added to `build/.local.env`

> please reach out to the dev team for these values

```
KHOROS_ORIGIN=<the ipass origin used to proxy to khoros>
KHOROS_API_SECRET=<the khoros dev env API secret>
IMS_ORIGIN=<the ims origin to auth agains, use the stage origin>
IMS_CLIENT_ID=<the ims client id used to obtain a token to access iPaaS>
IMS_CLIENT_SECRET=<the ims client secret used to obtain a token to access iPaaS>
IMS_AUTHORIZATION_CODET=<the ims client auth code used to obtain a token to access iPaaS>
IPASS_API_KEY=<the ipass api key for dev iPaaS service for the given KHOROS_ORIGIN>
```

> see description of these env variables in the `Application environment variables` section.

> Please note, on Prod, iPaaS is not used, the khoros endpoint is called directly.

### Working with the Coveo token action locally

> This is specifically for the coveo-token action.

The coveo-token action serves Coveo search tokens to the exlm site. It uses a smart fallback system:

1. **Primary (Production)**: Fetches tokens from HashiCorp Vault using AppRole authentication
2. **Fallback (Local Dev)**: Uses local environment variables when Vault is not configured

The coveo-token action is available locally at `localhost:3030/coveo-token` when you run `npm run serve`

#### Option 1: Using Vault (Production setup)

For production or production-like testing, configure Vault credentials:

Add these variables to `build/.local.env`:

> please reach out to the dev team for these values

```
# Vault Connection with AppRole authentication
VAULT_ENDPOINT=<HashiCorp Vault endpoint URL>
VAULT_ROLE_ID=<Vault AppRole role_id>
VAULT_SECRET_ID=<Vault AppRole secret_id>

# Coveo secret paths in Vault
COVEO_SECRET_PATH_PROD=<Vault path to production Coveo token, e.g., secret/data/coveo/prod>
COVEO_SECRET_PATH_NONPROD=<Vault path to nonprod Coveo token, e.g., secret/data/coveo/nonprod>
COVEO_SECRET_KEY=<Key name for token in Vault secret, defaults to 'token'>
```

When Vault credentials are provided, the action will always use Vault (production behavior).

#### Option 2: Local Tokens (Quick Local Development)

For easier local development without Vault access, set tokens directly:

```
COVEO_TOKEN_PROD=<your-production-coveo-token>
COVEO_TOKEN_NONPROD=<your-nonprod-coveo-token>
```

**Note:** Local tokens are only used as a fallback when Vault credentials are NOT configured. In production, Vault is always used.

> see description of these env variables in the `Application environment variables` section.

## Deployment

The action is built and deployed by a [github workflow](.github/workflows/deploy-action.yaml).

To deploy the action manually use the App Builder CLI. The [Getting Started guide for AIO Runtime](https://developer.adobe.com/runtime/docs/guides/getting-started/setup/#creating-a-namespace-and-retrieving-the-credentials) provides detailed steps to setup a local environment.

If you want to test this action on your own runtime application, it is recommended to deploy the current work-in-progress into a separate package, e.g. using your username. Remember, the branch name will be used by the automated deployment. To change the package name, modify the [app.config.yaml](./app.config.yaml).

```
aio app deploy
```

### Github Deployment Action

The action requires the follwoing environment variables/secrets to be set:

> see github docs for how to add those: https://docs.github.com/en/actions/learn-github-actions/variables#creating-configuration-variables-for-a-repository

#### for IO deployment

| Name                    | Type   | required for Prod? | description               |
| ----------------------- | ------ | ------------------ | ------------------------- |
| `AIO_RUNTIME_AUTH`      | secret | yes                | used to deploy the action |
| `AIO_RUNTIME_NAMESPACE` | secret | yes                | used to deploy the action |

## Application environment variables

| Name                     | Type   | required for Prod? | description                                                  |
| ------------------------ | ------ | ------------------ | ------------------------------------------------------------ |
| `OWNER`                  | var    | yes                | this repo owner, sent to AEM for AEM content                 |
| `REPO`                   | var    | yes                | this repo name, sent to AEM for AEM content                  |
| `BRANCH`                 | var    | yes                | this repo branch, sent to AEM for AEM content                |
| `AEM_AUTHOR_URL`         | var    | yes                | AEM author instance url to get content from                  |
| `KHOROS_ORIGIN`          | secret | yes                | the origin used to proxy khoros requests                     |
| `KHOROS_API_SECRET`      | secret | yes                | the API secret used for khoros requests                      |
| `IMS_ORIGIN`             | secret | yes                | the IMS origin to call for IMS authentication                |
| `IMS_CLIENT_ID`          | secret | no                 | the IMS client id to use for IMS authentication              |
| `IMS_CLIENT_SECRET`      | secret | no                 | the IMS client secret to use for IMS authentication          |
| `IMS_AUTHORIZATION_CODE` | secret | no                 | the IMS auth code to use for IMS authentication              |
| `IPASS_API_KEY`          | secret | no                 | the API KEY for iPaaS - for khoros API in lower environments |
| `EXL_API_HOST`           | var    | no                 | `https://experienceleague.adobe.com`                         |
| `FEATURE_FLAGS`          | var    | no                 | comma separated feature flags that affect converter behavior |
| `V2_PATHS`               | var    | no                 | comma separated path-to-regexp to render v2 docs             |
| `VAULT_ENDPOINT`            | secret | yes                | HashiCorp Vault endpoint URL                                 |
| `VAULT_ROLE_ID`             | secret | yes                | Vault AppRole role_id for authentication                     |
| `VAULT_SECRET_ID`           | secret | yes                | Vault AppRole secret_id for authentication                   |
| `COVEO_SECRET_PATH_PROD`    | var    | yes                | Vault path to production Coveo token (e.g., `secret/data/coveo/prod`) |
| `COVEO_SECRET_PATH_NONPROD` | var    | yes                | Vault path to nonprod Coveo token (e.g., `secret/data/coveo/nonprod`) |
| `COVEO_SECRET_KEY`          | var    | no                 | Key name for token in Vault secret (default: `token`)       |

> `IMS_CLIENT_ID`, `IMS_CLIENT_SECRET`, `IMS_AUTHORIZATION_CODE` and `IPASS_API_KEY` are not required
> for prod and are maked so because we do not use iPaaS in prod, which requires IMS authentication
> `IMS_CLIENT_ID` is required in all envs sincve we need it for IMS token validation

> **Vault Authentication (Primary)**: The Coveo token action uses AppRole authentication for secure Vault 
> access. When Vault credentials (`VAULT_ENDPOINT`, `VAULT_ROLE_ID`, `VAULT_SECRET_ID`) are provided, 
> Vault is always used - ensuring production behavior and preventing local tokens from interfering.
> 
> **Local Token Fallback**: When Vault credentials are NOT configured, the action falls back to 
> `COVEO_TOKEN_PROD` and `COVEO_TOKEN_NONPROD` environment variables. This fallback mode is only for 
> local development convenience and has no performance impact on production deployments.
>
> **Origin-Based Security**: The coveo-token endpoint validates the request origin (domain) to ensure
> requests only come from Adobe-owned domains (*.adobe.com, *.adobe.io, *.adobeaemcloud.com, *.hlx.page, *.hlx.live).
> This provides security without requiring API keys in client-side code, making it safe for browser-based calls
> from the exlm site while allowing anonymous users to search.

## Debugging common issues

### Response is not valid 'message/http'

if your converter returns a result such as:

```
{
  "code": "Ir5gfWfUoG33dvMb7nPAu2c6ckH7ocQg",
  "error": "Response is not valid 'message/http'."
}
```

The action activation likely failed, to debug, you need to run your action with header: `X-OW-EXTRA-LOGGING: on`.

See: https://developer.adobe.com/runtime/docs/guides/using/logging_monitoring#retrieving-activations-for-blocking-successful-calls

To get activation/application logs, you can run:

- `aio runtime activation log --last` - logs the last activation log
- `aio runtime activation result --last` - logs last activation result
- `aio app logs` - application logs
