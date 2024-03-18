import aioLibState from '@adobe/aio-lib-state';

class StateStore {
  store = {};

  /**
   * get by key
   * @param {string} key
   * @returns {Promise<StateStoreGetReturnValue>;}
   */
  async get(key) {
    return {
      value: this.store[key],
      expiration: 0,
    };
  }

  /**
   * Creates or updates a state key-value pair
   * @param {string} key - state key identifier
   * @param {*} value - state value
   * @param {StateStorePutOptions} [options = {}] - put options
   * @returns {Promise<string>}
   */
  async put(key, value, options = {}) {
    this.store[key] = value;
    this.store[`${key}-options`] = options;
    return key;
  }

  /**
   * Deletes a state key-value pair
   * @param {string }key - state key identifier
   * @returns {Promise<string>} key of deleted state or `null` if state does not exists
   */
  async delete(key) {
    delete this.store[key];
    return key;
  }
  /**
   * @param key - state key identifier
   * @returns get response holding value and additional info
   */
}

const localStateLib = {
  /**
   * @returns {Promise<aioLibState.StateStore>}
   */
  init: async function init() {
    return new StateStore();
  },
};

// use a mock version of state lib if LOCAL_CONVERTER is set; used for local development
/**
 * @returns {{init: () => Promise<aioLibState.StateStore>}}
 */
const stateLib = process?.env?.LOCAL_CONVERTER ? localStateLib : aioLibState;

export default stateLib;
