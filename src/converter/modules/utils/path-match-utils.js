import { match } from 'path-to-regexp';

const docsMatchPath = '/:lang/docs/:solution/:docRelPath*';
const playlistsMatchPath = '/:lang/playlists/:playlistId';
const coursesMatchPath = '/:lang/docs/courses/:docRelPath*';
const landingMatchPath = '/:lang/docs/:solution?';
const fragmentMatchPath = '/fragments/:lang/:fragmentRelPath*';
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

export const isIoFile = (path) => ioFiles.includes(path);
