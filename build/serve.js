import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { watchAction } from './bundle-action.js';

const filename = fileURLToPath(import.meta.url);
const currentDirectory = dirname(filename);

/**
 * Execute a Command
 * @param {*} command
 * @param {*} desc
 * @returns
 */
const execute = async (command, desc) =>
  new Promise((resolve, reject) => {
    console.log(`\nRunning: ${desc}...`);
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, {
      stdio: [process.stdin, process.stdout, process.stderr],
      shell: true,
    });
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve(code);
        console.log(`Done: ${desc}`);
      } else {
        reject(code);
      }
    });
  });

// watch for change in action, bundle it, then restart express server
watchAction(() => {
  const nodeMon = join(
    currentDirectory,
    '..',
    'node_modules',
    '.bin',
    'nodemon',
  );
  const express = join(currentDirectory, 'express.js');
  const dist = join(currentDirectory, '..', 'dist');
  const distBundle = join(currentDirectory, '..', 'dist', 'index.js');
  const command = `${nodeMon} ${express} --inspect ${distBundle} --watch ${dist}`;
  execute(command, 'nodemon');
});
