const childProcess = require('child_process');

const exec = ({ command, onStdout, onStderr }) => {
  const child = childProcess.exec(command);
  child.stdout.on('data', onStdout);
  child.stderr.on('data', onStderr);
  return child;
};

module.exports = {
  exec,
};
