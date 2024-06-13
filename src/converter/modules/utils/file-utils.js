import Files from '@adobe/aio-lib-files';
import LocalFiles from './local-files.js';

const PRESIGNURL_EXPIRY = 900;

const getFilesSdk = async () => {
  if (process.env.NODE_ENV === 'development') {
    return LocalFiles.init();
  }
  return Files.init();
};

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

export const writeFile = async ({ filePath, arrayBuffer }) => {
  const filesSdk = await getFilesSdk();
  return filesSdk.write(filePath, Buffer.from(arrayBuffer));
};

export const readFile = async (filePath) => {
  const filesSdk = await getFilesSdk();
  return filesSdk.read(filePath);
};
