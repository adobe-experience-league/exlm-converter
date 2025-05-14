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

  hasFeatureFlag(featureFlag) {
    const currentFeatureFlags = this.params?.featureFlags?.split(',') || [];
    return currentFeatureFlags.includes(featureFlag);
  }
}

const paramMemoryStore = new ParamMemoryStore();

export { paramMemoryStore };
