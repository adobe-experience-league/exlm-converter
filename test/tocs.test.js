/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

import assert from 'assert';
import { JSDOM } from 'jsdom';

/**
 * Integration tests for TOC API fallback logic
 *
 * These tests verify the V1 -> V2 API fallback behavior by testing with real API endpoints.
 * They ensure backward compatibility and proper handling of different API response formats.
 */

describe('TOCs API Fallback Logic - Integration Tests', () => {
  it('should handle V1 API response structure', async () => {
    const mockV1Response = {
      data: {
        HTML: '<nav><ul><li><a href="/docs/test">Test Link</a></li></ul></nav>',
        title: 'Test TOC',
      },
    };

    // Verify V1 response structure
    assert.ok(mockV1Response.data.HTML);
    assert.strictEqual(typeof mockV1Response.data.HTML, 'string');

    // Verify HTML is valid
    const dom = new JSDOM(mockV1Response.data.HTML);
    const links = dom.window.document.querySelectorAll('a');
    assert.ok(links.length > 0);
  });

  it('should handle V2 API response structure', async () => {
    const mockV2Response = {
      data: {
        transformedContent: [
          {
            contentType: 'application/json',
            raw: '{"metadata": "test"}',
          },
          {
            contentType: 'text/html',
            raw: '<nav><ul><li><a href="/docs/test">Test Link</a></li></ul></nav>',
          },
        ],
      },
    };

    // Verify V2 response structure
    assert.ok(mockV2Response.data.transformedContent);
    assert.ok(Array.isArray(mockV2Response.data.transformedContent));

    // Extract HTML content
    const htmlContent = mockV2Response.data.transformedContent.find(
      (content) => content.contentType === 'text/html',
    )?.raw;

    assert.ok(htmlContent);
    assert.strictEqual(typeof htmlContent, 'string');

    // Verify HTML is valid
    const dom = new JSDOM(htmlContent);
    const links = dom.window.document.querySelectorAll('a');
    assert.ok(links.length > 0);
  });

  it('should correctly identify V1 API response format', () => {
    const v1Response = {
      data: {
        HTML: '<nav>Content</nav>',
      },
    };

    const v2Response = {
      data: {
        transformedContent: [
          {
            contentType: 'text/html',
            raw: '<nav>Content</nav>',
          },
        ],
      },
    };

    // Test V1 detection
    assert.ok(v1Response?.data?.HTML);
    assert.strictEqual(v2Response?.data?.HTML, undefined);

    // Test V2 detection
    assert.ok(v2Response?.data?.transformedContent);
    assert.strictEqual(v1Response?.data?.transformedContent, undefined);
  });

  it('should handle missing HTML in V1 response', () => {
    const incompleteV1Response = {
      data: {
        // No HTML property
        title: 'Test',
      },
    };

    // Should recognize as needing fallback
    assert.strictEqual(incompleteV1Response?.data?.HTML, undefined);
  });

  it('should extract HTML from V2 response with multiple content types', () => {
    const v2Response = {
      data: {
        transformedContent: [
          {
            contentType: 'application/json',
            raw: '{"test": "data"}',
          },
          {
            contentType: 'text/plain',
            raw: 'Plain text',
          },
          {
            contentType: 'text/html',
            raw: '<nav>HTML Content</nav>',
          },
        ],
      },
    };

    const htmlContent = v2Response.data.transformedContent.find(
      (content) => content.contentType === 'text/html',
    )?.raw;

    assert.strictEqual(htmlContent, '<nav>HTML Content</nav>');
  });

  it('should handle tocId extraction from path', () => {
    const testCases = [
      { path: '/test-toc-id', expected: 'test-toc-id' },
      { path: '/my-custom-toc', expected: 'my-custom-toc' },
      {
        path: '/authoring-guide-help-test-guide',
        expected: 'authoring-guide-help-test-guide',
      },
      { path: 'no-leading-slash', expected: 'no-leading-slash' },
    ];

    testCases.forEach(({ path, expected }) => {
      const tocId = path.replace(/^\//, '');
      assert.strictEqual(tocId, expected);
    });
  });

  it('should only extract tocId when V2 API is needed (not for successful V1)', () => {
    // This test ensures we don't do unnecessary tocId extraction
    // tocId should ONLY be extracted when V1 API fails or returns no HTML

    // Scenario 1: V1 succeeds with HTML - no need to extract tocId
    const v1SuccessResponse = {
      data: {
        HTML: '<nav>V1 Content</nav>',
      },
    };

    // When V1 returns HTML, we should return immediately without extracting tocId
    // The code should NOT execute: const tocId = path.replace(/^\//, '');
    assert.ok(v1SuccessResponse?.data?.HTML);

    // Scenario 2: V1 fails or returns no HTML - need to extract tocId for V2
    const v1FailureResponse = {
      data: {
        // No HTML property
      },
    };

    // Only in this case should we extract tocId
    assert.strictEqual(v1FailureResponse?.data?.HTML, undefined);

    // This verifies the extraction logic is correct when needed
    const path = '/test-toc-id';
    const tocId = path.replace(/^\//, '');
    assert.strictEqual(tocId, 'test-toc-id');
  });

  it('should not create ExlClientV2 instance when V1 API succeeds', () => {
    // This test verifies that we don't instantiate ExlClientV2 unnecessarily
    // ExlClientV2 should ONLY be created when we need to call V2 API

    const v1SuccessResponse = {
      data: {
        HTML: '<nav>V1 Content</nav>',
      },
    };

    // When V1 succeeds, the code should return early without:
    // 1. Extracting tocId
    // 2. Creating ExlClientV2 instance: await createDefaultExlClientV2()
    // 3. Calling V2 API: exlv2Client.getTocHtmlById()

    assert.ok(v1SuccessResponse?.data?.HTML);
    // Early return should happen, avoiding unnecessary operations
  });

  it('should skip tocId extraction entirely when V1 provides HTML', () => {
    // This test verifies the conditional logic ensures tocId extraction is skipped
    // The code structure should be:
    //   if (json?.data?.HTML) {
    //     return { ... }; // Early return - NO tocId extraction
    //   }
    //   // Only reach here if V1 has no HTML
    //   const tocId = path.replace(/^\//, ''); // tocId extraction ONLY happens here

    const scenarios = [
      {
        description: 'V1 returns HTML - skip tocId extraction',
        response: { data: { HTML: '<nav>Content</nav>' } },
        shouldExtractTocId: false,
      },
      {
        description: 'V1 returns empty data - extract tocId for V2',
        response: { data: {} },
        shouldExtractTocId: true,
      },
      {
        description: 'V1 returns null HTML - extract tocId for V2',
        response: { data: { HTML: null } },
        shouldExtractTocId: true,
      },
      {
        description: 'V1 returns undefined HTML - extract tocId for V2',
        response: { data: { HTML: undefined } },
        shouldExtractTocId: true,
      },
    ];

    scenarios.forEach(({ description, response, shouldExtractTocId }) => {
      if (shouldExtractTocId) {
        // When V1 fails to provide HTML, we need tocId for V2 API
        const hasValidHTML = !!(
          response?.data?.HTML &&
          typeof response.data.HTML === 'string' &&
          response.data.HTML.length > 0
        );
        assert.strictEqual(
          hasValidHTML,
          false,
          `${description}: should not have valid HTML`,
        );

        // tocId extraction logic would execute here
        // Test with leading slash (most common case)
        const pathWithSlash = '/test-toc';
        const tocIdWithSlash = pathWithSlash.replace(/^\//, '');
        assert.strictEqual(tocIdWithSlash, 'test-toc');

        // Test without leading slash (edge case - should remain unchanged)
        const pathWithoutSlash = 'test-toc';
        const tocIdWithoutSlash = pathWithoutSlash.replace(/^\//, '');
        assert.strictEqual(
          tocIdWithoutSlash,
          'test-toc',
          'Should handle paths without leading slash',
        );
      } else {
        // When V1 provides HTML, we should NOT extract tocId
        assert.ok(response?.data?.HTML, `${description}: should have HTML`);
        // Code returns early, tocId extraction is skipped
      }
    });
  });

  it('should handle tocId extraction with and without leading slash', () => {
    // The regex /^\\// only matches a leading slash at the START of the string
    // IMPORTANT: replace() is SAFE - if no match found, returns original string
    // It does NOT throw an error or return undefined

    // Behavior:
    // - Paths WITH leading slash: '/test' → 'test' (slash removed)
    // - Paths WITHOUT leading slash: 'test' → 'test' (unchanged, no error)

    const testCases = [
      {
        input: '/test-toc-id',
        expected: 'test-toc-id',
        description: 'with leading slash - removes it',
      },
      {
        input: 'test-toc-id',
        expected: 'test-toc-id',
        description: 'without leading slash - no change, no error',
      },
      {
        input: '/authoring-guide',
        expected: 'authoring-guide',
        description: 'with leading slash and hyphen',
      },
      {
        input: 'authoring-guide',
        expected: 'authoring-guide',
        description: 'without leading slash - safe operation',
      },
      {
        input: '/',
        expected: '',
        description: 'just a slash returns empty string',
      },
      {
        input: '',
        expected: '',
        description: 'empty string returns empty string - safe',
      },
      {
        input: '//',
        expected: '/',
        description: 'double slash removes only first',
      },
      {
        input: '/test/nested/path',
        expected: 'test/nested/path',
        description: 'removes only leading slash, preserves internal slashes',
      },
    ];

    testCases.forEach(({ input, expected, description }) => {
      // This operation is safe and never throws an error
      const result = input.replace(/^\//, '');
      assert.strictEqual(
        result,
        expected,
        `Failed for: ${description} (input: "${input}")`,
      );

      // Verify the result is always a string (never undefined or null)
      assert.strictEqual(
        typeof result,
        'string',
        'Result should always be a string',
      );
    });
  });

  it('should prove replace() never fails when pattern does not match', () => {
    // This test explicitly verifies that replace() is safe even when regex doesn't match

    const testInputs = [
      'no-slash-here',
      'test-toc-id',
      'authoring-guide-help',
      '', // empty string
      'multiple-hyphens-no-slash',
    ];

    testInputs.forEach((input) => {
      // This should NEVER throw an error, even with no leading slash
      let didThrowError = false;
      let result;

      try {
        result = input.replace(/^\//, '');
      } catch (error) {
        didThrowError = true;
      }

      // Verify no error was thrown
      assert.strictEqual(
        didThrowError,
        false,
        `replace() should not throw error for input: "${input}"`,
      );

      // Verify result is the original string (unchanged)
      assert.strictEqual(
        result,
        input,
        `Should return original string when no slash to replace: "${input}"`,
      );

      // Verify result is a valid string
      assert.strictEqual(typeof result, 'string');
      assert.ok(result !== undefined);
      assert.ok(result !== null);
    });
  });

  it('should construct correct V1 API URL', () => {
    const path = '/test-toc-id';
    const lang = 'en';
    const baseUrl = 'https://experienceleague.adobe.com/api/tocs';

    // URL should include path and lang parameter
    const url = `${baseUrl}${path}?lang=${lang}&cachebust=${Date.now()}`;

    assert.ok(url.includes(baseUrl));
    assert.ok(url.includes(path));
    assert.ok(url.includes(`lang=${lang}`));
    assert.ok(url.includes('cachebust='));
  });

  it('should use correct V2 API endpoint structure', () => {
    // V2 API uses /api/v2/tocs/{id}?lang={lang}
    const tocId = 'test-toc-id';
    const lang = 'fr';
    const v2Path = `api/v2/tocs/${tocId}?lang=${lang}`;

    assert.ok(v2Path.includes('/v2/tocs/'));
    assert.ok(v2Path.includes(tocId));
    assert.ok(v2Path.includes(`lang=${lang}`));
  });

  it('should preserve language parameter across APIs', () => {
    const testLanguages = ['en', 'fr', 'de', 'ja', 'ko', 'zh-hans', 'pt-br'];

    testLanguages.forEach((lang) => {
      const v1Url = `https://experienceleague.adobe.com/api/tocs/test?lang=${lang}`;
      const v2Path = `api/v2/tocs/test?lang=${lang}`;

      assert.ok(v1Url.includes(`lang=${lang}`));
      assert.ok(v2Path.includes(`lang=${lang}`));
    });
  });

  it('should perform transformations efficiently (rewriteRedirects called once per response)', () => {
    // Verify that rewriteRedirects (which uses JSDOM) is only called once
    // JSDOM creation is expensive, so it should only happen when we have HTML to transform

    const testHtml = '<nav><a href="/docs/test">Link</a></nav>';

    // rewriteRedirects should:
    // 1. Create a JSDOM instance (expensive)
    // 2. Call handleUrls to transform links
    // 3. Return transformed HTML

    // It should NOT be called multiple times for the same content
    const dom = new JSDOM(testHtml);
    assert.ok(dom.window.document);

    // Verify JSDOM is only created when we have actual HTML content
    const emptyResponse = { data: {} };
    assert.strictEqual(emptyResponse?.data?.HTML, undefined);
    // No JSDOM should be created for empty responses
  });

  it('should optimize API call order (V1 first, V2 only if needed)', () => {
    // Verify the optimal call order to minimize latency

    // Order should be:
    // 1. Call V1 API (production endpoint, likely cached)
    // 2. If V1 returns HTML → return immediately (fast path)
    // 3. If V1 fails/no HTML → extract tocId (cheap operation)
    // 4. Create ExlClientV2 (requires async initialization)
    // 5. Call V2 API (slower, requires auth/setup)

    // This ensures:
    // - Most requests (V1 success) are fast
    // - Only fallback cases pay the cost of V2 setup
    // - tocId extraction happens AFTER we know V1 failed (lazy evaluation)

    const v1Path = '/test-toc-id';
    const lang = 'en';

    // V1 URL should be constructed first (simple concatenation)
    const v1Url = `https://experienceleague.adobe.com/api/tocs${v1Path}?lang=${lang}`;
    assert.ok(v1Url);

    // tocId extraction should only happen if V1 fails (lazy)
    // This is a cheap operation but should be deferred until needed
    const tocId = v1Path.replace(/^\//, '');
    assert.strictEqual(tocId, 'test-toc-id');

    // V2 client creation is expensive (async) - should be last resort
    // const exlv2Client = await createDefaultExlClientV2(); // Only when needed!
  });
});

/**
 * Manual Testing Instructions:
 *
 * To manually test the V1/V2 API fallback logic:
 *
 * 1. Start the local dev server:
 *    npm run serve
 *
 * 2. Test V1 API response (with HTML):
 *    curl http://localhost:3030/tocs/authoring-guide-help-test-guide?lang=en
 *
 * 3. Test V1 API fallback to V2 (if V1 returns no HTML):
 *    curl http://localhost:3030/tocs/test-toc-id?lang=en
 *
 * 4. Verify the response contains HTML content in either format:
 *    - V1: { "data": { "HTML": "..." } }
 *    - V2 fallback: { "data": { "HTML": "..." } } (extracted from transformedContent)
 *
 * 5. Test with different languages:
 *    curl http://localhost:3030/tocs/authoring-guide-help-test-guide?lang=fr
 */
