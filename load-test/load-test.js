const autocannon = require('autocannon');

const { FileAppender } = require('./util/FileAppender.js');
const { exec } = require('./util/exec.js');

const LOCAL_SERVER_COMMAND =
  'NODE_ENV=production LOCAL_CONVERTER=true node --max-old-space-size=512 --node-memory-debug ../build/express.js';

const AUTOCANNON_DEFAULT_OPTIONS = {
  url: 'https://51837-ahmedexlm-dev.adobeioruntime.net/api/v1/web/main/convert/en/docs/commerce-operations/reference/magento-open-source-beta',
  // url: 'http://localhost:3030/en/docs/commerce-operations/reference/magento-open-source-beta',
  connections: 3,
  pipelining: 1,
  duration: 30,
  debug: true,
};

// file loggers
const now = Date.now();
const logs = `./logs`;
const responseBodyAppender = new FileAppender(
  `${logs}/${now}-responses-body.log`,
);
const responseStatAppender = new FileAppender(
  `${logs}/${now}-responses-stat.log`,
);
const processAppender = new FileAppender(`${logs}/${now}-process.log`);

function setupClient(client) {
  client.on('body', (buffer) =>
    responseBodyAppender.appendLine(`[RES] body: ${buffer.toString()}`),
  ); // console.log a response body when its received
  client.on('response', (code, resBytes, resTime) => {
    responseStatAppender.appendLine(
      `[RES] code: ${code}, resBytes: ${resBytes}, resTime: ${resTime}`,
    );
  });
}

const runAutocannon = async (opts, onDone) => {
  console.log(
    `Running load of ${opts.connections} concurrent connections for ${opts.duration} seconds on url: ${opts.url}...`,
  );
  const autocannonInstance = autocannon({ ...opts, setupClient });
  autocannonInstance.on('done', (result) => {
    console.log('DONE.');
    console.log(
      autocannon.printResult(result, {
        renderResultsTable: true,
        renderStatusCodes: true,
        renderLatencyTable: true,
      }),
    );
    onDone();
  });
};

const loadTest = async () => {
  const serveChildProccess = exec({
    command: LOCAL_SERVER_COMMAND,
    onStdout: (data) => {
      processAppender.appendLine(data);
    },
    onStderr: (data) => {
      processAppender.appendLine(data);
    },
  });
  // sleep 3 second
  console.log('wait 3 second for server to start...');
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });

  runAutocannon(AUTOCANNON_DEFAULT_OPTIONS, () => {
    console.log('kill server');
    serveChildProccess.kill();
  });
};

// async function loadSimpleTest() {
//   // setup simple nodejs server on port 3001
//   const server = http.createServer(async (req, res) => {
//     const response = await fetch(
//       'https://experienceleague.adobe.com/api/articles?Search%20URL=https%3a%2f%2fexperienceleague.adobe.com%2fdocs%2fcommerce-operations%2freference%2fmagento-open-source-beta.html%3flang%3den&lang=en',
//     );
//     res.end(await response.text());
//   });
//   server.listen(3001, () => {
//     console.log('Server running at http://localhost:3001/');
//     runAutocannon(
//       {
//         ...AUTOCANNON_DEFAULT_OPTIONS,
//         url: 'http://localhost:3001',
//       },
//       () => {
//         server.close();
//       },
//     );
//   });
// }
// loadSimpleTest();

loadTest();
