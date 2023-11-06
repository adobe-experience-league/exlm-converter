const requireMember = (name, obj) => {
  if (!obj[name]) {
    throw new Error(
      `\x1b[31m[WARNING] ${name} variable not set. AEM Pages will not work.\x1b[0m`,
    );
  }
};

export default function ensureEnv() {
  // ensure env variables are set
  ['AEM_AUTHOR_URL', 'OWNER', 'REPO', 'BRANCH', 'ACCESS_TOKEN'].forEach(
    (name) => requireMember(name, process.env),
  );
}

// by default error if env vars are not set
ensureEnv();
