const fs = require('fs-extra');

class FileAppender {
  constructor(file) {
    this.file = file;
    fs.ensureFileSync(file);
  }

  appendLine(str) {
    fs.appendFileSync(this.file, `${str}\n`);
  }
}

module.exports = {
  FileAppender,
};
