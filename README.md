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

## Deployment

The action is built and deployed by a [github workflow](../../.github/workflows/deploy-action.yaml). 

To deploy the action manually use the App Builder CLI. The [Getting Started guide for AIO Runtime](https://developer.adobe.com/runtime/docs/guides/getting-started/setup/#creating-a-namespace-and-retrieving-the-credentials) provides detailed steps to setup a local environment.

If you want to test this action on your own runtime application, it is recommended to deploy the current work-in-progress into a separate package, e.g. using your username. Remember, the branch name will be used by the automated deployment. To change the package name, modify the [app.config.yaml](./app.config.yaml).

```
aio app deploy
```

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
