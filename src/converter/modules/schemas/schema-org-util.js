import jsdom from 'jsdom';
import { getMetadata } from '../utils/dom-utils.js';
import { upsertJsonLdScript } from './json-ld-util.js';
import { buildArticleSchema } from './builders/article-schema.js';
import { buildPerspectiveSchema } from './builders/perspective-schema.js';
import { buildCourseSchema } from './builders/course-schema.js';
import { buildPlaylistSchema } from './builders/playlist-schema.js';

export const SCHEMA_SCRIPT_ID = 'exl-schema-org-jsonld';

const SCHEMA_BUILDERS = {
  Documentation: buildArticleSchema,
  Tutorial: buildArticleSchema,
  Troubleshooting: buildArticleSchema,
  Perspective: buildPerspectiveSchema,
  Course: buildCourseSchema,
  Certification: buildCourseSchema,
};

const buildSchemaFromMeta = (document, path) => {
  if (path.includes('/playlists/')) {
    return buildPlaylistSchema(document, path);
  }
  const contentType = getMetadata(document, 'coveo-content-type');
  const builder = SCHEMA_BUILDERS[contentType];
  if (!builder) return null;
  return builder(document, path, contentType);
};

export const injectSchemaOrg = ({ path, body, headers = {} }) => {
  if (typeof body !== 'string' || !body.trim()) return body;
  const contentType = headers['Content-Type'] || headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('text/html')) return body;
  if (path.startsWith('/fragments/')) return body;

  try {
    const dom = new jsdom.JSDOM(body);
    const { document } = dom.window;
    const schema = buildSchemaFromMeta(document, path);
    if (!schema) return body;
    if (path.includes('/playlists/')) {
      document
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach((el) => el.remove());
    }
    upsertJsonLdScript(document, schema, SCHEMA_SCRIPT_ID);
    return dom.serialize();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      '[schema-org] Failed to inject schema, returning original body:',
      e,
    );
    return body;
  }
};
