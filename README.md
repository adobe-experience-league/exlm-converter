## Build

```
npm run build
```

## Development

To run the action locally run

```
npm run serve
```

That will build the action code inside an express app, with [src/express.js](src/express.js) as entry point watching any changes. In parallel it will rerun the express server if src files change.

The express app listens on port 3030 and handles incoming requests for _.html and _.md files, applying the html transformations.

### Serving AEM Pages Locally

> This simulates an authenticated request, coming from Edge Delivery Services intended to render from AEM.

1. get your local development access token from Cloud Manager Developer Console (see docs below)
2. Add file `build/.local.env` that should have the contents below (replace `<token>` with your token and `<aem author>` with the author url)

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

### working with the khoros API (and action locally)

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

> Please note, on Prod, iPaaS is not used, the khoros endpoint is called directly.

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

| Name                     | Type   | required for Prod? | description                                                  |
| ------------------------ | ------ | ------------------ | ------------------------------------------------------------ |
| `AIO_RUNTIME_AUTH`       | secret | yes                | used to deploy the action                                    |
| `AIO_RUNTIME_NAMESPACE`  | secret | yes                | used to deploy the action                                    |
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

> `IMS_CLIENT_ID`, `IMS_CLIENT_SECRET`, `IMS_AUTHORIZATION_CODE` and `IPASS_API_KEY` are not required
> for prod and are maked so because we do not use iPaaS in prod, which requires IMS authentication
> `IMS_CLIENT_ID` is required in all envs sincve we need it for IMS token validation

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
