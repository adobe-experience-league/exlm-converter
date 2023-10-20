// get first proccess arg
const arg = process.argv[2];

console.log(`Fetching url with header X-OW-EXTRA-LOGGING: on`);
console.log(`url: ${arg}`);
const response = await fetch(arg, {
  headers: {
    'X-OW-EXTRA-LOGGING': 'on', // header to enable extra logging for action
  },
});

// log status code
console.log(`response status code: ${response.status}`);
console.log(`response:\n${await response.text()}`);
