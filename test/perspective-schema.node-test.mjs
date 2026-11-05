import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { buildPerspectiveSchema } from '../src/converter/modules/schemas/builders/perspective-schema.js';
import { buildArticleSchema } from '../src/converter/modules/schemas/builders/article-schema.js';
import {
  getMetadata,
  setMetadata,
} from '../src/converter/modules/utils/dom-utils.js';

const CANONICAL =
  'https://experienceleague.adobe.com/en/perspectives/from-data-to-delight';

const articleParagraph = `Design scalable commerce experiences by moving beyond conversion funnels and enabling journey-based engagement with data for every shopper.`;

function perspectiveDocument(
  metas,
  body = `<div><p>${articleParagraph}</p></div>`,
) {
  const { document } = new JSDOM(
    `<!doctype html><html><head><title>From data to delight</title><link rel="canonical" href="${CANONICAL}"></head><body>${body}</body></html>`,
  ).window;
  Object.entries(metas).forEach(([name, content]) => {
    setMetadata(document, name, content);
  });
  return document;
}

const baseMetas = {
  'og:title': 'From data to delight',
  description:
    'Design scalable commerce experiences by moving beyond conversion funnels and enabling journey-based engagement with data.',
  'published-time': '2026-08-18T17:22:05.049Z',
  'modified-time': '2026-04-29T22:34:42.000Z',
  'content-modified-time': '2026-01-02T00:00:00.000Z',
  'last-update':
    'Fri Jan 02 2026 00:00:00 GMT+0000 (Coordinated Universal Time)',
  'author-name': 'Guillermo Raya',
  'author-bio-page': '/en/perspectives/authors/guillermo-raya',
  role: 'Admin, Developer, Leader',
  'tq-products': JSON.stringify([
    { label: 'Experience Platform' },
    { label: 'Experience Platform' },
    { label: 'Commerce' },
  ]),
  solution: 'Experience Platform,Commerce',
  feature: 'Catalog management, Configuration, Accounts',
  feature_v1: 'Should Not Appear, Admin Workspace',
  'coveo-content-type': 'Perspective',
  'og:image': 'https://experienceleague.adobe.com/default-image.png',
};

test('BlogPosting uses author, meta description, and the later date', () => {
  const document = perspectiveDocument(baseMetas);
  const schema = buildPerspectiveSchema(
    document,
    '/en/perspectives/from-data-to-delight',
  );

  assert.equal(schema['@type'], 'BlogPosting');
  assert.equal(schema['@id'], `${CANONICAL}#/schema`);
  assert.equal(schema.url, CANONICAL);
  assert.equal(schema.headline, 'From data to delight');
  assert.equal(
    schema.description,
    'Design scalable commerce experiences by moving beyond conversion funnels and enabling journey-based engagement with data.',
  );
  assert.equal(schema.datePublished, '2026-08-18');
  assert.equal(schema.dateCreated, '2026-08-18');
  assert.equal(schema.dateModified, '2026-08-18');
  assert.deepEqual(schema.author, {
    '@type': 'Person',
    name: 'Guillermo Raya',
    url: 'https://experienceleague.adobe.com/en/perspectives/authors/guillermo-raya',
  });
  assert.deepEqual(schema.about, [
    { '@type': 'SoftwareApplication', name: 'Experience Platform' },
    { '@type': 'SoftwareApplication', name: 'Commerce' },
  ]);
  assert.deepEqual(schema.keywords, [
    'Experience Platform',
    'Commerce',
    'Catalog management',
    'Configuration',
    'Accounts',
  ]);
  assert.equal(schema.image, undefined);
  assert.equal(schema.mainEntityOfPage.headline, undefined);
  assert.equal(schema.mainEntityOfPage.description, schema.description);
  assert.equal(schema.mainEntityOfPage.name, schema.headline);
});

test('dateModified stays on modified-time when that day is later than published-time', () => {
  const document = perspectiveDocument({
    ...baseMetas,
    'published-time': '2026-05-20T00:00:00.000Z',
    'modified-time': '2026-09-01T00:00:00.000Z',
  });
  const schema = buildPerspectiveSchema(
    document,
    '/en/perspectives/from-data-to-delight',
  );
  assert.equal(schema.datePublished, '2026-05-20');
  assert.equal(schema.dateCreated, '2026-05-20');
  assert.equal(schema.dateModified, '2026-09-01');
});

test('omits author when author-name is empty', () => {
  const document = perspectiveDocument({ ...baseMetas, 'author-name': '' });
  const schema = buildPerspectiveSchema(
    document,
    '/en/perspectives/from-data-to-delight',
  );
  assert.equal(schema.author, undefined);
});

test('description follows the article intro when the meta description is the title', () => {
  const document = perspectiveDocument({
    ...baseMetas,
    description: 'From data to delight',
    'og:description': 'From data to delight',
  });
  const schema = buildPerspectiveSchema(
    document,
    '/en/perspectives/from-data-to-delight',
  );
  assert.equal(
    schema.description,
    'Design scalable commerce experiences by moving beyond conversion funnels and enabling journey-based engagement with data for every shopper.',
  );
  assert.notEqual(schema.description, schema.headline);
  assert.equal(getMetadata(document, 'description'), schema.description);
  assert.equal(getMetadata(document, 'og:description'), schema.description);
});

test('empty tq-products falls back to solution for about and keywords', () => {
  const document = perspectiveDocument({
    ...baseMetas,
    'tq-products': '',
    solution: 'Workfront',
    feature: 'Reports and Dashboards, Reports and Dashboards',
  });
  const schema = buildPerspectiveSchema(
    document,
    '/en/perspectives/driving-workfront-adoption-with-custom-timeline-views',
  );
  assert.deepEqual(schema.about, [
    { '@type': 'SoftwareApplication', name: 'Workfront' },
  ]);
  assert.deepEqual(schema.keywords, ['Workfront', 'Reports and Dashboards']);
});

test('docs articles still take dateModified from last-update', () => {
  const document = perspectiveDocument(baseMetas);
  const schema = buildArticleSchema(
    document,
    '/en/docs/analytics/implementation/home',
    'Documentation',
  );
  assert.equal(schema['@type'], 'HowTo');
  assert.equal(schema.dateModified, '2026-01-02');
  assert.equal(schema.author, undefined);
});
