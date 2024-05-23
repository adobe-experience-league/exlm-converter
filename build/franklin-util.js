/**
 * Publish a path to Helix Pages via Admin API
 * @typedef {object} PublishParams
 * @property {string} path - path to publish
 * @property {'preview' | 'live'} mode - either 'preview' or 'live'
 * @property {string} owner - GitHub owner
 * @property {string} repo - GitHub repo
 * @property {string} branch - GitHub branch
 * @param {PublishParams} param
 * @returns
 */
export default async function publish({
  path,
  mode = 'live',
  owner,
  repo,
  branch,
}) {
  const url = `https://admin.hlx.page/${mode}/${owner}/${repo}/${branch}/${path}`;
  const { API_KEY = null } = process.env;
  console.log(
    `[FETCH] [POST]: ${url} (API_KEY: ${String(API_KEY).substring(0, 5)}...)`,
  );
  const headers = {};
  if (API_KEY) {
    headers.authorization = `token ${API_KEY}`;
  }
  return fetch(url, { method: 'POST', headers });
}
