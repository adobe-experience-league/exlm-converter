import stateLib from '../../common/utils/state-lib-util.js';

// A store for Gainsight OAuth2 token responses. Will store the response in memory
// and read it from there if it exists and has not expired.
export class GainsightOAuth2TokenStore {
  constructor(name = 'gainsight-oauth2', folderName = 'token-cache') {
    this.token = null;
    this.response = null;
    this.name = name;
    this.folderName = folderName;
  }

  /**
   *
   * @returns {Promise<StateStore>} the state object
   */
  async getState() {
    if (process?.env?.LOCAL_CONVERTER && this.state) return this.state;
    this.state = await stateLib.init();
    return this.state;
  }

  /**
   * @param {Object} responseJson
   */
  async setToken(responseJson) {
    try {
      const ONE_MINUTE = 60000;
      const expiresInMs = responseJson.expires_in * 1000; // Convert seconds to milliseconds
      const expiration = Date.now() + expiresInMs - ONE_MINUTE; // one minute as safe buffer
      responseJson.expiration = expiration;
      return this.writeToStore(responseJson);
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  /**
   * @returns {Object|undefined} the token response from the store if it exists and has not expired
   */
  async getToken() {
    const responseJson = await this.readFromStore();
    if (responseJson !== undefined) {
      const now = Date.now();
      if (responseJson.expiration > now) {
        return responseJson;
      }
    }
    return undefined;
  }

  // store specific methods
  async writeToStore(object) {
    const state = await this.getState();
    await state.put(this.name, JSON.stringify(object));
  }

  async readFromStore() {
    const state = await this.getState();
    const storedState = await state.get(this.name);
    if (storedState && storedState.value) {
      return JSON.parse(storedState.value);
    }
    return undefined;
  }
}
