import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 *
 * @param {fs.Stats} stat
 * @returns {import('@adobe/aio-lib-files').RemoteFileProperties}
 */
function statToRemoteFileProperties(stats) {
  return {
    creationTime: stats.birthtime.toISOString(),
    lastModified: stats.mtime.toISOString(),
    etag: `${stats.ino}-${stats.mtimeMs}`,
    contentLength: stats.size,
    contentType: '',
    isDirectory: stats.isDirectory(),
    isPublic: false,
    url: '',
    internalUrl: '',
  };
}

export default class LocalFiles {
  constructor() {
    this.tmpDir = os.tmpdir();
  }

  static async init() {
    return new LocalFiles();
  }

  /**
   * @param {string} relativePath
   */
  getTempPath(relativePath) {
    return path.join(this.tmpDir, relativePath);
  }

  /**
   * @param {string} absolutePath
   */
  getRelativePath(absolutePath) {
    return path.relative(this.tmpDir, absolutePath);
  }

  async write(filePath, buffer) {
    console.log(`Writing temp file for path ${filePath}`);
    const writePath = this.getTempPath(filePath);
    fs.mkdirSync(path.dirname(writePath), { recursive: true });
    fs.writeFileSync(writePath, buffer);
    console.log(`File written to ${writePath}`);
  }

  /**
   * @param {*} filePath
   * @param {*} options
   * @returns
   */
  async generatePresignURL(filePath, options = {}) {
    const presignedUrl = this.getTempPath(filePath, options);
    console.log(`Generating presign URL: ${presignedUrl}`);
    return `file://${presignedUrl}`;
  }

  async read(filePath) {
    return fs.readFileSync(this.getTempPath(filePath));
  }

  /**
   * @param {string} filePath
   * @returns {Promise<Array<import('@adobe/aio-lib-files').RemoteFileProperties>>}
   */
  async list(filePath) {
    const folderPath = this.getTempPath(filePath);
    // get all files in directory and return type {import('@adobe/aio-lib-files').RemoteFileProperties}
    return (
      fs.readdirSync(folderPath)?.map((file) => ({
        name: filePath,
        ...statToRemoteFileProperties(fs.statSync(path.join(folderPath, file))),
      })) || []
    );
  }
}
