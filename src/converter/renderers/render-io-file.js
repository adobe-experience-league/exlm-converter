import {
  exists,
  getPresignedDownloadURL,
} from '../../common/utils/file-utils.js';
import { sendError, sendRedirect } from '../../common/utils/response-utils.js';

/**
 * Renders file directly from IO Files
 * @param {string} path - path to the IO File
 */
export default async function renderIoFile(path) {
  const fileExists = await exists(path);
  if (fileExists) {
    const redirectLocation = await getPresignedDownloadURL(path);
    return sendRedirect(redirectLocation);
  }
  return sendError(404, 'File not found');
}
