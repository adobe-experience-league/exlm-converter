import { Core } from '@adobe/aio-sdk';
import {
  sendError,
  sendRedirect,
  sendSuccessJson,
} from '../common/utils/response-utils.js';

import {
  getPresignedDownloadURL,
  getPresignedUploadURL,
  listFiles,
} from '../common/utils/file-utils.js';
import { checkMissingRequestInputs } from '../common/utils/request-utils.js';

const logger = Core.Logger('upload', { level: 'info' });

const ONE_HOUR = 3600;

export const main = async function main(params) {
  // eslint-disable-next-line no-underscore-dangle
  const path = params.__ow_path || '';
  try {
    // check for missing request input parameters and headers
    const requiredParams = ['actionPath'];
    const errorMessage = checkMissingRequestInputs(params, requiredParams);
    if (errorMessage) {
      return sendError(400, errorMessage);
    }

    const { actionPath } = params;

    if (path === '/presigned-upload-url') {
      const presignedUrl = await getPresignedUploadURL(actionPath, ONE_HOUR);
      return sendSuccessJson({ presignedUrl });
    }

    if (path === '/presigned-download-url') {
      const presignedUrl = await getPresignedDownloadURL(actionPath, ONE_HOUR);
      return sendSuccessJson({ presignedUrl });
    }

    if (path === '/list') {
      const result = await listFiles(actionPath);
      return sendSuccessJson(result);
    }

    if (path === '/download') {
      const presignedUrl = await getPresignedDownloadURL(actionPath, ONE_HOUR);
      // send 301 redirect
      return sendRedirect(presignedUrl);
    }

    // catch
    return sendError(400, `Invalid path: ${path}.`);
  } catch (error) {
    // log any server errors
    logger.error(error);
    // return with 500
    return sendError(500, 'uncaught server error, see logs');
  }
};
