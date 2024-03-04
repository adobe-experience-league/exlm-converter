const fs = require('fs');
// eslint-disable-next-line import/no-unresolved
const PCRE = require('pcre-to-regexp');
const ConfigParser = require('./nginx-parser.js');

const CONF_FILE = 'docs.conf';

const parser = new ConfigParser();
console.log(`Reading config file ${CONF_FILE}`);
const config = parser.readConfigFile(CONF_FILE, { parseIncludes: false });
// console.log(JSON.stringify(config, null, 2));
const configEntries = Object.entries(config);
console.log(`Found ${configEntries.length} entries in the config file`);

const isLocationEntry = ([key, value]) =>
  key?.startsWith('location') && value?.return?.includes('301');

const locationEntries = configEntries.filter(isLocationEntry);
const nonLocationEntries = configEntries.filter(
  ([key, value]) => !isLocationEntry([key, value]),
);

console.log(
  `Found ${locationEntries.length} location entries in the config file`,
);

console.log(
  `Found ${nonLocationEntries.length} non-location entries in the config file: `,
  nonLocationEntries,
);

// One-to-one redirects
const isOneToOneRedirect = ([key, value]) =>
  !key?.includes('.*') && value?.return?.includes('301');

const cleanEntry = ([key, value]) => {
  const from = key.replace('location ~ ^', '').replace(/\$/g, '');
  const to =
    value?.return
      ?.replace('301 ', '')
      ?.replace(/"/g, '')
      ?.replace('$is_args$args', '') || '';
  return [from, to];
};

const oneToOneRedirects = locationEntries
  .filter(isOneToOneRedirect)
  .map(cleanEntry);

console.log(`Found ${oneToOneRedirects.length} one-to-one redirects`);
const oneToOneRedirectsObject = oneToOneRedirects.reduce((acc, [from, to]) => {
  acc[from] = to;
  return acc;
}, {});

console.log(`Writing one-to-one redirects to one-to-one-redirects.json`);
fs.writeFileSync(
  'one-to-one-redirects.json',
  JSON.stringify(oneToOneRedirectsObject, null, 2),
);

// Other redirects - regex
const regexRedirects = locationEntries
  .filter(([key, value]) => !isOneToOneRedirect([key, value]))
  .map(cleanEntry)
  .map(([from, to]) => {
    const fromRegex = PCRE(`%${from}%g`).source;

    return [fromRegex, to];
  });

console.log(`Found ${regexRedirects.length} other redirects`);
const regexRedirectsObject = regexRedirects.reduce((acc, [from, to]) => {
  acc[from] = to;
  return acc;
}, {});
console.log(`Writing regex redirects to regex-redirects.json`);
fs.writeFileSync(
  'regex-redirects.json',
  JSON.stringify(regexRedirectsObject, null, 2),
);

console.log(
  `There are ${
    locationEntries.length - oneToOneRedirects.length - regexRedirects.length
  } entries unnaccounted for.`,
);
