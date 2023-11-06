const requireMember = (name, obj) => {
  if (!obj[name]) {
    throw new Error(
      `\x1b[31m[WARNING] ${name} variable not set. AEM Pages will not work.\x1b[0m`,
    );
  }
};

const COMMON = ['AEM_AUTHOR_URL', 'OWNER', 'REPO', 'BRANCH'];
const EXPRESS = ['ACCESS_TOKEN'];

export function ensureBuildEnv() {
  // ensure env variables are set
  COMMON.forEach((name) => requireMember(name, process.env));
}

export function ensureExpressEnv() {
  [...COMMON, ...EXPRESS].forEach((name) => requireMember(name, process.env));
}

// by default error if env vars are not set
if (import.meta.main) {
  ensureBuildEnv();
}
