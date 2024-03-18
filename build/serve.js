import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { doForEachAction, watchAction } from './build-helpers.js';

const filename = fileURLToPath(import.meta.url);
const currentDirectory = dirname(filename);

process.env.LOCAL_CONVERTER = true;

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

const buildPromises = [];
// watch for change in action, bundle it, then restart express server
doForEachAction(({ entryPoint, outfile }) => {
  buildPromises.push(
    new Promise((resolve) => {
      watchAction({
        esbuildOverrides: {
          entryPoints: [entryPoint],
          outfile,
        },
        onFirstBuild: () => {
          resolve();
        },
      });
    }),
  );
});

await Promise.all(buildPromises);
const nodeMon = join(currentDirectory, '..', 'node_modules', '.bin', 'nodemon');
const express = join(currentDirectory, 'express.js');
const dist = join(currentDirectory, '..', 'dist');
const command = `${nodeMon} ${express} --watch ${dist}`;
execute(command, 'nodemon');
