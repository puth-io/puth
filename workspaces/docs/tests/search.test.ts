import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarkdownRenderer, type DefaultTheme } from 'vitepress';
import { sdkSearch } from '../.vitepress/lib/search.ts';

const md = await createMarkdownRenderer(process.cwd());
// VitePress's renderer and search hook expose different markdown-it type
// versions. They share the runtime render API exercised by this integration test.
type SearchRenderer = Parameters<NonNullable<DefaultTheme.LocalSearchOptions['_render']>>[2];

async function render(source: string, relativePath: string) {
  return await sdkSearch._render!(source, {
    path: relativePath,
    relativePath,
    cleanUrls: true,
  }, md as unknown as SearchRenderer);
}

test('search indexes both SDK variants and client-specific signatures with labels', async () => {
  const html = await render(`# Cookies

<SdkContent sdk="laravel">

Encrypted cookie helpers.

</SdkContent>

<SdkContent sdk="php">

Raw cookie helpers.

</SdkContent>

<SdkCall php="$browser-&gt;_keys($selector, $keys)" laravel="$browser-&gt;keys($selector, ...$keys)" />
`, 'guide/cookies.md');
  assert.match(html, /Cookies · Laravel \/ PHP <a/);
  assert.match(html, /Encrypted cookie helpers/);
  assert.match(html, /Raw cookie helpers/);
  assert.match(html, /PHP: <code>\$browser-&gt;_keys/);
  assert.match(html, /Laravel: <code>\$browser-&gt;keys/);
  assert.doesNotMatch(html, /SdkContent|SdkCall/);
});

test('Laravel-only results are labeled and excluded pages remain excluded', async () => {
  assert.match(await render('# Laravel cookies\n\nEncrypted cookies.', 'guide/laravel-cookies.md'), /Laravel cookies · Laravel <a/);
  assert.equal(await render('---\nsearch: false\n---\n# Hidden\n\nPrivate.', 'guide/hidden.md'), '');
});
