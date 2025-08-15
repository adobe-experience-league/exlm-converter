import { match } from 'path-to-regexp';

const docsMatchPath = '/:lang/docs/:solution/:docRelPath*';
const playlistsMatchPath = '/:lang/playlists/:playlistId';
const slidesMatchPath = '/:lang/slides/:slideId';
const coursesMatchPath = '/:lang/docs/courses/:docRelPath*';
const landingMatchPath = '/:lang/docs/:solution?';
const fragmentMatchPath = '/fragments/:lang/:fragmentRelPath*';
const tocMatchPath = '/:lang/toc/:tocId';
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
  const docsMatcher = match(matchPath, { decode: decodeURIComponent });
  return docsMatcher(path) !== false;
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
