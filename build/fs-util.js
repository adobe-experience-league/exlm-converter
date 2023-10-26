import fs from 'node:fs/promises';
import path from 'path';

/**
 * Get array of all files in directory, recursively
 * @param {string} dir
 */
export default async function readdirRecursive(dir, files = []) {
  const currentFiles = await fs.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });
  // eslint-disable-next-line no-restricted-syntax
  for (const file of currentFiles) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop
      await readdirRecursive(filePath, files);
    } else {
      files.push(filePath);
    }
  }
  return files;
}
