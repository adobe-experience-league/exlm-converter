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
    const writePath = this.getTempPath(filePath);
    fs.mkdirSync(path.dirname(writePath), { recursive: true });
    fs.writeFileSync(writePath, buffer);
  }

  /**
   * @param {*} filePath
   * @param {*} options
   * @returns
   */
  async generatePresignURL(filePath, options) {
    return this.filesSdk.generatePresignURL(
      this.getTempPath(filePath),
      options,
    );
  }

  async read(filePath) {
    return fs.readFileSync(this.getTempPath(filePath));
  }
}
