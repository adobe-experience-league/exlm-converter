import aioLibState from '@adobe/aio-lib-state';

const store = {};
const localStateLib = {
  init: async function init() {
    return {
      async get(key) {
        return store[key];
      },
      async put(key, value) {
        store[key] = value;
        return key;
      },
      async delete(key) {
        delete store[key];
        return key;
      },
    };
  },
};

// use a mock version of state lib if LOCAL_CONVERTER is set; used for local development
const stateLib = process?.env?.LOCAL_CONVERTER ? localStateLib : aioLibState;

export default stateLib;
