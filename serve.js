import { spawn } from 'child_process';
import { watchAction } from './bundle-action.js';

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
  execute(
    './node_modules/.bin/nodemon ./express.js --inspect ./dist/index.js --watch ./dist',
    'nodemon',
  );
});
