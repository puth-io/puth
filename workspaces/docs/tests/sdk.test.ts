import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sdkFromUrl, sdkHref } from '../.vitepress/lib/sdk.ts';

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
