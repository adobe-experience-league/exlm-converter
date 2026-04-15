import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Logger from '@adobe/aio-lib-core-logging';

const aioLogger = Logger('perspective-last-update-overrides');

const FILENAME = 'perspective-last-update-overrides.json';

/**
 * Action root: dist/converter when bundled (CJS); src/converter when running this file as ESM.
 */
function getActionDir() {
  try {
    return __dirname;
  } catch {
    return join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  }
}

/** @type {Readonly<Record<string, unknown>>|null} */
let cachedMap = null;

let loggedMissingFile = false;
let loggedLoadFailure = false;
let loggedInvalidShape = false;

/** @type {Set<string>} */
const invalidDateWarnedKeys = new Set();

function loadMap() {
  if (cachedMap !== null) return cachedMap;

  const filePath = join(getActionDir(), 'static', FILENAME);

  if (!existsSync(filePath)) {
    if (!loggedMissingFile) {
      loggedMissingFile = true;
      aioLogger.debug(
        `perspective last-update overrides file not found: ${filePath}`,
      );
    }
    cachedMap = Object.freeze({});
    return cachedMap;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      if (!loggedInvalidShape) {
        loggedInvalidShape = true;
        aioLogger.warn(
          'perspective last-update overrides: expected a JSON object, using empty map',
        );
      }
      cachedMap = Object.freeze({});
      return cachedMap;
    }
    cachedMap = Object.freeze({ ...parsed });
    return cachedMap;
  } catch (e) {
    if (!loggedLoadFailure) {
      loggedLoadFailure = true;
      aioLogger.warn(
        `perspective last-update overrides: failed to load (${
          e?.message || e
        })`,
      );
    }
    cachedMap = Object.freeze({});
    return cachedMap;
  }
}

/**
 * When path is /{locale}/perspectives/..., returns /perspectives/... for locale-less JSON keys.
 * @param {string} path
 * @returns {string|null}
 */
function localeStrippedPerspectiveKey(path) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 3 && segments[1] === 'perspectives') {
    return `/${segments.slice(1).join('/')}`;
  }
  return null;
}

/**
 * @param {Readonly<Record<string, unknown>>} map
 * @param {string} path
 * @returns {{ value: unknown; lookupKey: string } | null}
 */
function resolveRawValue(map, path) {
  if (Object.prototype.hasOwnProperty.call(map, path)) {
    return { value: map[path], lookupKey: path };
  }
  const alternateKey = localeStrippedPerspectiveKey(path);
  if (alternateKey && Object.prototype.hasOwnProperty.call(map, alternateKey)) {
    return { value: map[alternateKey], lookupKey: alternateKey };
  }
  return null;
}

/**
 * @param {string} path
 * @returns {Date|null}
 */
export function getLastUpdateOverride(path) {
  if (!path) return null;

  const map = loadMap();
  const resolved = resolveRawValue(map, path);
  if (!resolved) return null;

  const { value, lookupKey } = resolved;
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    if (!invalidDateWarnedKeys.has(lookupKey)) {
      invalidDateWarnedKeys.add(lookupKey);
      aioLogger.warn(
        `perspective last-update overrides: invalid date string for key ${lookupKey}`,
      );
    }
    return null;
  }

  return d;
}
