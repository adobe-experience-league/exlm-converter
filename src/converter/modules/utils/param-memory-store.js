class ParamMemoryStore {
  constructor() {
    this.params = {};
  }

  get() {
    return this.params;
  }

  set(params) {
    this.params = params;
  }
}

const paramMemoryStore = new ParamMemoryStore();

export { paramMemoryStore };
