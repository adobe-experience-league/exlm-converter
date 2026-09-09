import { match } from 'path-to-regexp';

const docsMatchPath = '/:lang/docs/:solution/:docRelPath*';
const playlistsMatchPath = '/:lang/playlists/:playlistId';
const slidesMatchPath = '/:lang/slides/:slideId';
const coursesMatchPath = '/:lang/docs/courses/:docRelPath*';
const landingMatchPath = '/:lang/docs/:solution?';
const fragmentMatchPath = '/fragments/:lang/:fragmentRelPath*';
const tocMatchPath = '/:lang/toc/:tocId';
const onDemandEventsMatchPath = '/:lang/on-demand-events/:onDemandEventId';
const ioFiles = ['/redirects.json'];

export const matchDocsPath = (path) => {
  const docsMatcher = match(docsMatchPath, { decode: decodeURIComponent });
  return docsMatcher(path);
};

export const isDocsPath = (path) => matchDocsPath(path) !== false;

export const matchPlaylistPath = (path) => {
  const playlistsMatcher = match(playlistsMatchPath, {
    decode: decodeURIComponent,
  });
  return playlistsMatcher(path);
};

export const isPlaylistsPath = (path) => matchPlaylistPath(path) !== false;

export const matchSlidePath = (path) => {
  const slidesMatcher = match(slidesMatchPath, {
    decode: decodeURIComponent,
  });
  return slidesMatcher(path);
};

export const isSlidesPath = (path) => matchSlidePath(path) !== false;

export const matchOnDemandEventPath = (path) => {
  const onDemandEventsMatcher = match(onDemandEventsMatchPath, {
    decode: decodeURIComponent,
  });
  return onDemandEventsMatcher(path);
};

export const isOnDemandEventPath = (path) =>
  matchOnDemandEventPath(path) !== false;

export const matchCoursesPath = (path) => {
  const coursesMatcher = match(coursesMatchPath, {
    decode: decodeURIComponent,
  });
  return coursesMatcher(path);
};

export const isCoursesPath = (path) => matchCoursesPath(path) !== false;

export const matchLandingPath = (path) => {
  const landingMatcher = match(landingMatchPath, {
    decode: decodeURIComponent,
  });
  return landingMatcher(path);
};

export const isLandingPath = (path) => matchLandingPath(path) !== false;

export const matchFragmentPath = (path) => {
  const fragmentMatcher = match(fragmentMatchPath, {
    decode: decodeURIComponent,
  });
  return fragmentMatcher(path);
};

export const isFragmentPath = (path) => matchFragmentPath(path) !== false;

export const matchTocPath = (path) => {
  const tocMatcher = match(tocMatchPath, {
    decode: decodeURIComponent,
  });
  return tocMatcher(path);
};

export const isTocPath = (path) => matchTocPath(path) !== false;

export const isIoFile = (path) => ioFiles.includes(path);

const matchesPath = (path, matchPath) => {
  try {
    const docsMatcher = match(matchPath, { decode: decodeURIComponent });
    return docsMatcher(path) !== false;
  } catch {
    // A malformed path-to-regexp template (e.g. an unbalanced group) throws synchronously at
    // compile time. globPaths often comes from an ops-populated CSV env var (V2_PATHS,
    // EVENTS_V2_PATHS) that can contain a typo -- fail closed for this one entry instead of
    // throwing, which would otherwise crash matchAnyPath's whole loop and 500 every request
    // that reaches it, not just ones matching the bad pattern (PR #794 review, Matt Lawrence).
    return false;
  }
};

/**
 * given a path to test and a list of glob paths, return true if the path to test matches any of the glob paths
 */
export const matchAnyPath = (pathToTest, globPaths) => {
  let i = 0;
  while (i < globPaths.length) {
    if (matchesPath(pathToTest, globPaths[i])) {
      return true;
    }
    i += 1;
  }
  return false;
};

/**
 * given a path to test and a raw comma-separated list of glob paths, return true if the list is
 * unset/empty (no restriction configured -- preserve pre-gate behavior) or if the path matches any
 * of the listed glob paths
 */
export const matchAnyPathOrUnrestricted = (path, rawPathsCsv) => {
  const trimmed = (rawPathsCsv || '').trim();
  if (trimmed === '') return true; // no restriction configured -- preserve pre-gate behavior
  const paths = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  // A separators-only value (e.g. "," or ", ,") passes the trimmed === '' check above but
  // filters down to an empty array here -- without this check, matchAnyPath would return false
  // for every path, silently flipping a stray comma into a full lockout of every on-demand
  // event instead of the intended "no restriction configured" (PR #794 review, Matt Lawrence).
  if (paths.length === 0) return true;
  return matchAnyPath(path, paths);
};
