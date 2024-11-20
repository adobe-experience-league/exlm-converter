import Logger from '@adobe/aio-lib-core-logging';
import Files from '@adobe/aio-lib-files';
import LocalFiles from './local-files.js';

export const aioLogger = Logger('file-utils');

const PRESIGNURL_EXPIRY = 900;

/**
 *
 * @returns {Promise<Files.Files>}
 */
async function getFilesSdk() {
  if (process.env.NODE_ENV === 'development') {
    return LocalFiles.init();
  }
  return Files.init();
}

export const writeFileAndGetPresignedURL = async ({
  filePath,
  arrayBuffer,
}) => {
  const filesSdk = await getFilesSdk();

  await filesSdk.write(filePath, Buffer.from(arrayBuffer));
  return filesSdk.generatePresignURL(filePath, {
    expiryInSeconds: PRESIGNURL_EXPIRY,
    permissions: 'r',
  });
};

export const writeStringToFileAndGetPresignedURL = async ({
  filePath,
  str,
}) => {
  const filesSdk = await getFilesSdk();

  await filesSdk.write(filePath, str);
  return filesSdk.generatePresignURL(filePath, {
    expiryInSeconds: PRESIGNURL_EXPIRY,
    permissions: 'r',
  });
};

export const writeFile = async ({ filePath, arrayBuffer }) => {
  console.log(`Writing file to ${filePath}`);
  const filesSdk = await getFilesSdk();
  return filesSdk.write(filePath, Buffer.from(arrayBuffer));
};

export const readFile = async (filePath) => {
  console.log(`Reading file from ${filePath}`);
  const filesSdk = await getFilesSdk();
  return filesSdk.read(filePath);
};

/**
 * Delete files older than provided olderThanMilliseconds
 * @param {string} dir the directory to delete files from
 */
export async function deleteExpiredFiles(
  dir,
  olderThanMilliseconds = 86400000,
) {
  const currentDate = new Date();
  const filesSdk = await getFilesSdk();
  const files = await filesSdk.list(dir);
  files.forEach(async (file) => {
    const currentFileLastModified = new Date(file.lastModified);
    const diff = currentDate.getTime() - currentFileLastModified.getTime();
    if (diff > olderThanMilliseconds) {
      aioLogger.info(
        `Deleting file: ${file.path} as it is older than ${olderThanMilliseconds} milliseconds`,
      );
      await filesSdk.delete(file.path);
    }
  });
}

export async function listFiles(filePath) {
  const filesSdk = await getFilesSdk();
  return filesSdk.list(filePath);
}

export async function exists(filePath) {
  const files = await listFiles(filePath);
  return files && files.length;
}

export async function getPresignedUrl(filePath, expiryInSeconds, permissions) {
  const filesSdk = await getFilesSdk();
  // write empty files to aio-lib-files
  aioLogger.info(
    `Getting presigned url for path: ${filePath} with permissions: ${permissions}`,
  );
  const fileExists = await exists(filePath);
  if (!fileExists) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const presignUrl = await filesSdk.generatePresignURL(filePath, {
    expiryInSeconds,
    permissions,
  });
  // await deleteExpiredUrls('/temp-upload', 86400);
  return presignUrl;
}

/**
 * Get presigned upload URL
 * @param {string} fineName the file name with extension
 * @returns
 */
export async function getPresignedUploadURL(filePath, expiryInSeconds) {
  const fileExists = await exists(filePath);
  if (!fileExists) {
    // write empty file if files does not already exist.
    await writeFile({ filePath, arrayBuffer: '' });
  }
  return getPresignedUrl(filePath, expiryInSeconds, 'rwd');
}

/**
 * get presigned download URL for given file path
 * @param {*} filePath file path
 * @param {*} expiryInSeconds url expiration in seconds
 * @returns
 */
export async function getPresignedDownloadURL(filePath, expiryInSeconds) {
  return getPresignedUrl(filePath, expiryInSeconds, 'r');
}
