import { match } from 'path-to-regexp';

const docsMatchPath = '/:lang/docs/:solution/:docRelPath*';
const landingMatchPath = '/:lang/docs/:solution?';
const fragmentMatchPath = '/:lang/fragments/:fragmentRelPath*';

export const matchDocsPath = (path) => {
  const docsMatcher = match(docsMatchPath, { decode: decodeURIComponent });
  return docsMatcher(path);
};

export const isDocsPath = (path) => matchDocsPath(path) !== false;

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
