import fs from 'fs';
import os from 'os';
import path from 'path';

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
}
