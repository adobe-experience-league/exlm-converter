/**
 * Publish a path to Helix Pages via Admin API
 * @typedef {object} PublishParams
 * @property {string} path - path to publish
 * @property {'preview' | 'live'} mode - either 'preview' or 'live'
 * @property {string} owner - GitHub owner
 * @property {string} repo - GitHub repo
 * @property {string} branch - GitHub branch
 * @property {string} apiKey - Helix Pages API key
 * @param {PublishParams} param
 * @returns
 */

export default async function publish({
  path,
  mode = 'live',
  owner = 'dobe-experience-league',
  repo,
  branch = 'main',
  apiKey,
}) {
  const url = `https://admin.hlx.page/${mode}/${owner}/${repo}/${branch}/${path}`;
  console.log(
    `[FETCH] [POST]: ${url} (API_KEY: ${String(apiKey).substring(0, 5)}...)`,
  );
  const headers = {};
  if (apiKey) {
    headers.authorization = `token ${apiKey}`;
  }
  return fetch(url, { method: 'POST', headers });
}

/**
 * publishes a path to Edge Delivery Services via Admin API
 * @param {PublishParams} params
 */
const publishPath = async (params) => {
  const { mode, path } = params;
  try {
    const response = await publish(params);
    if (response.ok) {
      const jsonResponse = await response.json();
      console.log(`[Published] [${mode}]: ${jsonResponse[mode].url}`);
      return jsonResponse;
    }
    console.error(
      `[Error] [${mode}] [Response Code: ${response.status}]: ${path}`,
    );
    console.error(`Reponse text: \n${await response.text()}`);
  } catch (err) {
    console.error(err);
  }
  return undefined;
};

/**
 * @param {PublishParams} params
 */
export const previewThenPublish = async (params) => {
  const previewResponseJson = await publishPath({
    ...params,
    mode: 'preview',
  });
  const publishResponseJson = await publishPath({
    ...params,
    mode: 'live',
  });
  return {
    previewResponseJson,
    publishResponseJson,
  };
};
