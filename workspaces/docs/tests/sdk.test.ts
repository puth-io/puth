import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentSdk, hasOwnExamples, pageSdk, pageSdks, sdkFromUrl, sdkHref, sdkParam } from '../.vitepress/lib/sdk.ts';

const base = 'https://puth.io/guide/cookies?sdk=php';

test('direct URLs choose the SDK; missing and unknown values default to Laravel', () => {
  assert.equal(sdkFromUrl(new URL(base)), 'php');
  assert.equal(sdkFromUrl(new URL('/guide/cookies', base)), 'laravel');
  assert.equal(sdkFromUrl(new URL('/guide/cookies?sdk=go', base)), 'laravel');
});

test('navigation preserves SDK, fragments and unrelated parameters', () => {
  assert.equal(sdkHref('/guide/browser-basics#work-inside-an-iframe', 'php', base), '/guide/browser-basics?sdk=php#work-inside-an-iframe');
  assert.equal(sdkHref('/api/browser?other=value#cookies', 'php', base), '/api/browser?other=value&sdk=php#cookies');
  assert.equal(sdkHref('#delete-a-cookie', 'php', base), '/guide/cookies?sdk=php#delete-a-cookie');
});

test('explicit SDK links take precedence over the current SDK', () => {
  assert.equal(sdkHref('/guide/cookies?sdk=laravel', 'php', base), '/guide/cookies?sdk=laravel');
  assert.equal(sdkHref('/guide/cookies?sdk=php', 'laravel', base), '/guide/cookies?sdk=php');
  assert.equal(sdkHref('/guide/cookies?sdk=unknown', 'php', base), '/guide/cookies?sdk=laravel');
});

test('Laravel integration links always open the applicable SDK', () => {
  assert.equal(sdkHref('/guide/laravel-cookies?sdk=php', 'php', base), '/guide/laravel-cookies?sdk=laravel');
  assert.equal(sdkFromUrl(new URL('/guide/laravel-debugging?sdk=php', base)), 'laravel');
  assert.equal(sdkHref('/guide/laravel.html', 'php', base), '/guide/laravel.html?sdk=laravel');
});

test('external links, assets, homepage and email are unchanged', () => {
  for (const href of ['https://example.com/guide/cookies', '/assets/image/puth-code.png', '/', '/.well-known/security.txt', 'mailto:security@example.com']) {
    assert.equal(sdkHref(href, 'php', base), href);
  }
});

test('navigation also supports a configured base path', () => {
  assert.equal(sdkHref('/docs/guide/cookies', 'php', base), '/docs/guide/cookies?sdk=php');
  assert.equal(sdkHref('/docs/guide/laravel', 'php', base), '/docs/guide/laravel?sdk=laravel');
});

test('Spring Boot, Java and Node.js are selectable and carried through links', () => {
  for (const sdk of ['spring', 'java', 'js'] as const) {
    assert.equal(sdkFromUrl(new URL(`/guide/cookies?sdk=${sdk}`, base)), sdk);
    assert.equal(sdkHref('/guide/browser-basics', sdk, base), `/guide/browser-basics?sdk=${sdk}`);
    assert.equal(sdkHref('/guide/laravel', sdk, base), '/guide/laravel?sdk=laravel');
  }
});

test('clients without their own examples show the PHP variant', () => {
  assert.equal(contentSdk('laravel'), 'laravel');
  for (const sdk of ['php', 'spring', 'java', 'js'] as const) assert.equal(contentSdk(sdk), 'php');
  assert.equal(hasOwnExamples('php'), true);
  assert.equal(hasOwnExamples('spring'), false);
});

test('pages can add variants through their frontmatter', () => {
  const available = pageSdks({ sdks: ['spring', 'unknown'] });
  assert.deepEqual(available, ['laravel', 'php', 'spring']);
  assert.equal(contentSdk('spring', available), 'spring');
  assert.equal(contentSdk('java', available), 'php');
  assert.equal(hasOwnExamples('spring', available), true);
});

test('the Spring Boot page always uses Spring Boot', () => {
  assert.equal(pageSdk('/guide/spring-boot'), 'spring');
  assert.equal(pageSdk('/guide/example-laravel'), undefined);
  assert.equal(sdkFromUrl(new URL('/guide/spring-boot?sdk=php', base)), 'spring');
  assert.equal(sdkHref('/guide/spring-boot', 'laravel', base), '/guide/spring-boot?sdk=spring');
});

test('URLs without an SDK leave the choice to the reader', () => {
  assert.equal(sdkParam(new URL('/guide/cookies', base)), undefined);
  assert.equal(sdkParam(new URL('/guide/cookies?sdk=go', base)), 'laravel');
  assert.equal(sdkParam(new URL('/guide/laravel-cookies', base)), 'laravel');
});
