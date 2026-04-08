import jsdom from 'jsdom';
import { getMetadata } from '../utils/dom-utils.js';
import { upsertJsonLdScript } from './json-ld-util.js';
import { buildArticleSchema } from './builders/article-schema.js';
import { buildPerspectiveSchema } from './builders/perspective-schema.js';
import { buildCourseSchema } from './builders/course-schema.js';

const SCHEMA_SCRIPT_ID = 'exl-schema-org-jsonld';

const SCHEMA_BUILDERS = {
  Documentation: buildArticleSchema,
  Certification: buildArticleSchema,
  Tutorial: buildArticleSchema,
  Troubleshooting: buildArticleSchema,
  Perspective: buildPerspectiveSchema,
  Course: buildCourseSchema,
};

const buildSchemaFromMeta = (document, path) => {
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

  const dom = new jsdom.JSDOM(body);
  const { document } = dom.window;
  const schema = buildSchemaFromMeta(document, path);
  if (!schema) return body;
  upsertJsonLdScript(document, schema, SCHEMA_SCRIPT_ID);
  return dom.serialize();
};
