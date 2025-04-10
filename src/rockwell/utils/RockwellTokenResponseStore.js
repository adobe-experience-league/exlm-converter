import stateLib from '../../common/utils/state-lib-util.js';

/**
 * Class representing a store for Rockwell token responses.
 * Provides functionality to get, set, and store token responses with expiration management.
 */
export class RockwellTokenResponseStore {
  /**
   * Constructs a new RockwellTokenResponseStore.
   *
   * @param {string} name - The name of the token store. Defaults to 'rockwell'.
   */
  constructor(name = 'rockwell') {
    /**
     * @property {string|null} token - Stored token value, initially null.
     * @property {Object|null} response - Stored response object, initially null.
     * @property {string} name - Name identifier for the stored state.
     */
    this.token = null;
    this.response = null;
    this.name = name;
  }

  /**
   * Retrieves the initialized state object, if not already initialized.
   *
   * @returns {Promise<Object>} - A promise that resolves to the state object.
   */
  async getState() {
    if (this.state) return this.state;
    this.state = stateLib.init();
    return this.state;
  }

  /**
   * Obtains the stored Rockwell response from the store.
   * Checks the expiration of the response and returns it if valid.
   *
   * @returns {Promise<Object|undefined>} - A promise resolving to the stored response if valid,
   * or undefined if expired or not found.
   */
  async getRockwellResponse() {
    const response = await this.readFromStore();
    if (response !== undefined) {
      const now = Date.now();
      if (response.expiration > now) {
        return response;
      }
    }
    return undefined;
  }

  /**
   * Sets a new Rockwell response with computed expiration, storing it in the store.
   * Catches and logs any errors that occur during storage.
   *
   * @param {Object} response - The Rockwell response object to store, containing an expiration value.
   * @returns {Promise<undefined>} - A promise resolving when the response is stored, or undefined on error.
   */
  async setRockwellResponse(response) {
    try {
      const ONE_MINUTE = 60000;
      const expiresInMs = response.expires_in;
      // Set expiration slightly earlier for safety margin.
      const expiration = Date.now() + expiresInMs - ONE_MINUTE;
      response.expiration = expiration;
      return this.writeToStore(response);
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  /**
   * Reads and parses the stored object from the state's store.
   *
   * @returns {Promise<Object|undefined>} - A promise that resolves to the parsed object,
   * or undefined if not present or invalid.
   */
  async readFromStore() {
    const state = await this.getState();
    const storedState = await state.get(this.name);
    if (storedState && storedState.value) {
      return JSON.parse(storedState.value);
    }
    return undefined;
  }

  /**
   * Writes a given object to the store, converting it into a JSON string.
   *
   * @param {Object} object - The object to convert and store in the state's store.
   * @returns {Promise<void>} - A promise resolving after the object is stored.
   */
  async writeToStore(object) {
    const state = await this.getState();
    await state.put(this.name, JSON.stringify(object));
  }
}
