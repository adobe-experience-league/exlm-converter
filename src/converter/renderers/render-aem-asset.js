import Files from '@adobe/aio-lib-files';
import { AioCoreSDKError } from '@adobe/aio-lib-core-errors';

const PRESIGNURL_EXPIRY = 600;

/**
 * @param {ArrayBuffer} arrayBuffer
 */
function toBase64String(arrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

const OneMB = 1024 * 1024 - 1024; // -1024 for good measure :)

const writeFileAndGetPresignedURL = async (filePath, arrayBuffer) => {
  const filesSdk = await Files.init();

  await filesSdk.write(filePath, Buffer.from(arrayBuffer));
  return filesSdk.generatePresignURL(filePath, {
    expiryInSeconds: PRESIGNURL_EXPIRY,
    permissions: 'r',
  });
};

/**
 *
 * @param {Response} response
 * @param {string} contentType
 */
export default async function renderAemAsset(path, response) {
  const contentLength = response.headers.get('Content-Length');
  const contentLengthNum = parseInt(contentLength, 10);

  const isLarge = contentLengthNum > OneMB;

  let assetBody;
  let assetHeaders = {};
  let assetStatusCode = response.status;

  if (!isLarge) {
    // in Adobe Runtime Actions, we have to return binaries as base64 strings.
    assetBody = toBase64String(await response.arrayBuffer());
  } else {
    // Adobe runtime actions have a response limit of 1MB.
    // so if the asset is larger, write to AIO Files and return a redirect to the presigned URL
    try {
      const location = await writeFileAndGetPresignedURL(
        path,
        await response.arrayBuffer(),
      );
      assetHeaders = {
        location,
      };
      assetStatusCode = 302;
    } catch (e) {
      if (e instanceof AioCoreSDKError) {
        assetBody =
          'Cannot serve this asset in this environment, it must be served from adobe IO Action';
        assetHeaders = { 'Content-Type': 'text/plain' };
        assetStatusCode = 500;
        // log it for good measure
        console.error(e);
      } else {
        throw e;
      }
    }
  }
  return { assetBody, assetHeaders, assetStatusCode };
}
