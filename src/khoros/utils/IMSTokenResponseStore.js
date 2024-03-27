import stateLib from '../../common/utils/state-lib-util.js';

// A store for the response from IMS. Will store the response in memory
// and read it from there if it exists and has not expired.
export class IMSTokenResponseStore {
  constructor(name = 'ims', folderName = 'token-cache') {
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
    if (this.state) return this.state;
    this.state = stateLib.init();
    return this.state;
  }

  /**
   * @param {Object} responseJson
   */
  async setIMSResponse(responseJson) {
    try {
      const ONE_MINUTE = 60000;
      const expiresInMs = responseJson.expires_in;
      const expiration = Date.now() + expiresInMs - ONE_MINUTE; // one minute as safe buffer
      responseJson.expiration = expiration;
      return this.writeToStore(responseJson);
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  /**
   * @returns {Object|undefined} the response from the store if it exists and has not expired
   */
  async getIMSResponse() {
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
