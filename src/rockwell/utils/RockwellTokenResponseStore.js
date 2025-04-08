import stateLib from '../../common/utils/state-lib-util.js';

export class RockwellTokenResponseStore {
  constructor(name = 'rockwell') {
    this.token = null;
    this.response = null;
    this.name = name;
  }

  async getState() {
    if (this.state) return this.state;
    this.state = stateLib.init();
    return this.state;
  }

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

  async setRockwellResponse(response) {
    try {
      const ONE_MINUTE = 60000;
      const expiresInMs = response.expires_in;
      const expiration = Date.now() + expiresInMs - ONE_MINUTE; // subtract 1 minute for safety
      response.expiration = expiration;
      return this.writeToStore(response);
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  async readFromStore() {
    const state = await this.getState();
    const storedState = await state.get(this.name);
    if (storedState && storedState.value) {
      return JSON.parse(storedState.value);
    }
    return undefined;
  }

  async writeToStore(object) {
    const state = await this.getState();
    await state.put(this.name, JSON.stringify(object));
  }
}
