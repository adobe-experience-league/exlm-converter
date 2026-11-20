/**
 * EXLM-6191-1: created-time (jcr:created / git.created) drives schema.org dateCreated.
 * Run: node --test test/created-time-dateCreated.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { extractCommonMetadata } from '../src/converter/modules/schemas/schema-helpers.js';
import { buildPerspectiveSchema } from '../src/converter/modules/schemas/builders/perspective-schema.js';
import { buildArticleSchema } from '../src/converter/modules/schemas/builders/article-schema.js';
import { buildCourseSchema } from '../src/converter/modules/schemas/builders/course-schema.js';
import { createMetaData } from '../src/converter/modules/utils/metadata-util.js';
import { getMetadata } from '../src/converter/modules/utils/dom-utils.js';
import { DOCPAGETYPE } from '../src/common/utils/doc-page-types.js';
import {
  gitCreatedFromArticleSearch,
  htmlFromArticleSearch,
} from '../src/converter/renderers/render-doc.js';

const PATH = '/en/perspectives/sample-article';
const DOCS_PATH = '/en/docs/analytics/implementation/home';
const COURSE_PATH = '/en/courses/sample-course';

const baseHead = `
  <link rel="canonical" href="https://experienceleague.adobe.com${PATH}">
  <meta name="title" content="Sample Perspective">
  <meta name="description" content="Authored description for schema.">
  <meta name="published-time" content="2026-11-11T06:33:20.942Z">
  <meta name="modified-time" content="2026-05-14T17:54:58.334Z">
  <meta name="author-name" content="Ada Author">
`;

const docsHead = `
  <link rel="canonical" href="https://experienceleague.adobe.com${DOCS_PATH}">
  <meta name="title" content="Sample Doc">
  <meta name="description" content="Docs description.">
  <meta name="published-time" content="2026-11-11T06:33:20.942Z">
  <meta name="last-update" content="2026-10-01T00:00:00.000Z">
`;

const courseHead = `
  <link rel="canonical" href="https://experienceleague.adobe.com${COURSE_PATH}">
  <meta name="title" content="Sample Course">
  <meta name="description" content="Course description.">
  <meta name="published-time" content="2026-11-11T06:33:20.942Z">
  <meta name="last-update" content="2026-10-01T00:00:00.000Z">
`;

const docFrom = (head) =>
  new JSDOM(`<!DOCTYPE html><html><head>${head}</head><body></body></html>`)
    .window.document;

describe('dateCreated from created-time', () => {
  it('extractCommonMetadata prefers created-time over published-time', () => {
    const document = docFrom(
      `${baseHead}<meta name="created-time" content="2024-03-15T12:00:00.000Z">`,
    );
    const { dateCreated, datePublished } = extractCommonMetadata(
      document,
      PATH,
    );
    assert.equal(dateCreated, '2024-03-15');
    assert.equal(datePublished, '2026-11-11');
  });

  it('extractCommonMetadata falls back to published when created-time is missing', () => {
    const document = docFrom(baseHead);
    const { dateCreated, datePublished } = extractCommonMetadata(
      document,
      PATH,
    );
    assert.equal(dateCreated, datePublished);
    assert.equal(dateCreated, '2026-11-11');
  });

  it('Perspectives BlogPosting uses created-time for dateCreated', () => {
    const document = docFrom(
      `${baseHead}<meta name="created-time" content="2024-03-15T12:00:00.000Z">`,
    );
    const schema = buildPerspectiveSchema(document, PATH);
    assert.equal(schema['@type'], 'BlogPosting');
    assert.equal(schema.dateCreated, '2024-03-15');
    assert.equal(schema.datePublished, '2026-11-11');
    // later of modified (2026-05-14) and published (2026-11-11)
    assert.equal(schema.dateModified, '2026-11-11');
  });

  it('Perspectives falls back to published for dateCreated without created-time', () => {
    const document = docFrom(baseHead);
    const schema = buildPerspectiveSchema(document, PATH);
    assert.equal(schema.dateCreated, '2026-11-11');
    assert.equal(schema.datePublished, '2026-11-11');
  });

  it('docs article schema uses created-time for dateCreated', () => {
    const document = docFrom(
      `${docsHead}<meta name="created-time" content="2023-01-20T08:00:00.000Z">`,
    );
    const schema = buildArticleSchema(document, DOCS_PATH);
    assert.ok(schema);
    assert.equal(schema.dateCreated, '2023-01-20');
    assert.equal(schema.datePublished, '2026-11-11');
  });

  it('course schema uses created-time for dateCreated', () => {
    const document = docFrom(
      `${courseHead}<meta name="created-time" content="2022-06-01T00:00:00.000Z">`,
    );
    const schema = buildCourseSchema(document, COURSE_PATH);
    assert.ok(schema);
    assert.equal(schema.dateCreated, '2022-06-01');
    assert.equal(schema.datePublished, '2026-11-11');
  });

  it('extractCommonMetadata falls back when created-time is unparseable', () => {
    const document = docFrom(
      `${baseHead}<meta name="created-time" content="not-a-date">`,
    );
    const { dateCreated, datePublished } = extractCommonMetadata(
      document,
      PATH,
    );
    assert.equal(dateCreated, datePublished);
    assert.equal(dateCreated, '2026-11-11');
  });

  it('createMetaData sets created-time from docs git.created', () => {
    const document = docFrom(docsHead);
    createMetaData(
      document,
      { title: 'Sample Doc', 'last-update': '2026-10-01T00:00:00.000Z' },
      { git: { created: '2022-02-17T21:30:53.000Z' }, id: 'doc-1' },
      DOCPAGETYPE.DOC_ARTICLE,
      [],
    );
    assert.equal(
      getMetadata(document, 'created-time'),
      '2022-02-17T21:30:53.000Z',
    );
    const schema = buildArticleSchema(document, DOCS_PATH);
    assert.equal(schema.dateCreated, '2022-02-17');
  });

  it('gitCreatedFromArticleSearch reads object and list payloads', () => {
    assert.equal(
      gitCreatedFromArticleSearch({
        data: { git: { created: '2022-02-17T21:30:53.000Z' } },
      }),
      '2022-02-17T21:30:53.000Z',
    );
    assert.equal(
      gitCreatedFromArticleSearch({
        data: [{ git: { created: '2021-05-01T00:00:00.000Z' } }],
      }),
      '2021-05-01T00:00:00.000Z',
    );
    assert.equal(gitCreatedFromArticleSearch({ data: {} }), '');
  });

  it('gitCreatedFromArticleSearch prefers the row matching path', () => {
    assert.equal(
      gitCreatedFromArticleSearch(
        {
          data: [
            {
              path: '/en/docs/other',
              git: { created: '2020-01-01T00:00:00.000Z' },
            },
            {
              path: DOCS_PATH,
              git: { created: '2022-02-17T21:30:53.000Z' },
            },
          ],
        },
        DOCS_PATH,
      ),
      '2022-02-17T21:30:53.000Z',
    );
  });

  it('gitCreatedFromArticleSearch does not guess among multiple path misses', () => {
    assert.equal(
      gitCreatedFromArticleSearch(
        {
          data: [
            {
              path: '/en/docs/other',
              git: { created: '2020-01-01T00:00:00.000Z' },
            },
            {
              path: '/en/docs/another',
              git: { created: '2021-01-01T00:00:00.000Z' },
            },
          ],
        },
        DOCS_PATH,
      ),
      '',
    );
  });

  it('htmlFromArticleSearch returns text/html transformedContent', () => {
    const html = htmlFromArticleSearch(
      {
        data: {
          path: DOCS_PATH,
          transformedContent: [
            { contentType: 'text/markdown', raw: '# md' },
            {
              contentType: 'text/html; charset=utf-8',
              raw: '<!doctype html><html><head></head><body>doc</body></html>',
            },
          ],
        },
      },
      DOCS_PATH,
    );
    assert.match(html, /<body>doc<\/body>/);
  });

  it('gitCreatedFromArticleSearch uses sole row when path string differs', () => {
    assert.equal(
      gitCreatedFromArticleSearch(
        {
          data: [
            {
              path: `${DOCS_PATH}/`,
              git: { created: '2022-02-17T21:30:53.000Z' },
            },
          ],
        },
        DOCS_PATH,
      ),
      '2022-02-17T21:30:53.000Z',
    );
  });
});
