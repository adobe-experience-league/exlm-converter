import { spawn } from 'child_process';
import { watchAction } from './bundle-action.js';
import os from 'os';

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
  const pathSeparator = os && os.platform() === 'win32' ? '\\' : '/';
  const execPath = `.${pathSeparator}node_modules${pathSeparator}.bin${pathSeparator}nodemon .${pathSeparator}express.js --inspect .${pathSeparator}dist${pathSeparator}index.js --watch .${pathSeparator}dist`;
  execute(execPath, 'nodemon');
});
