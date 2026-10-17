# Puth documentation

This private workspace uses VitePress. From the repository root:

```sh
npm install
npm run docs:dev
npm run docs:build
npm run docs:preview
```

The equivalent workspace commands are `npm -w @puth/docs run dev`, `build`, and `preview`.

Edit Markdown pages here and navigation in `.vitepress/config.ts`. Local search is generated during the production build. VitePress checks internal links during the build.

Deploy `.vitepress/dist` to a static host after running `npm run docs:build`. The site assumes it is hosted at the domain root; configure VitePress `base` before hosting under a subdirectory. With `cleanUrls` enabled, configure the host to serve extensionless page URLs from their corresponding HTML files.

This workspace replaces the puth.io landing page and documentation. Its homepage uses the existing site's branding and image assets, copied into `public/assets/image` so the build has no dependency on the old site. Theme overrides live in `.vitepress/theme/style.css`.

The guide covers installation, Laravel, CI snapshots, portal settings, browser testing concepts and roadmap context, with Browser and Context API references under `/api/`. Content from the former site and the manual migration on the `docs` branch is adapted to the current repository where behavior has changed. The SDK selector changes examples, API signatures and client-specific explanations for Laravel or standalone PHP. Legacy URL compatibility is intentionally omitted; guide navigation uses `/guide/` routes.

## SDK-aware content

Documentation defaults to Laravel. Use `?sdk=laravel` or `?sdk=php` to select the whole-page view. SDK selection comes from the URL and is carried through documentation links, including search results and previous/next links. Laravel-only integration pages always use Laravel mode. No browser preference overrides a direct URL.

Write shared explanations once. Wrap client-specific paragraphs or examples in `<SdkContent sdk="laravel">` or `<SdkContent sdk="php">`, with blank lines around their Markdown content. Keep headings outside these blocks so both views share the same outline and anchors. Use `<SdkCall php="$browser-&gt;_keys($selector, $keys)" laravel="$browser-&gt;keys($selector, ...$keys)" />` for short signatures that differ. These components are registered globally by the theme.

Always include the receiver when documenting a call: `$browser->`, `$context->`, `$page->`, `$element->` or the appropriate integration object. Examples use explicit receivers on each call. Verify core behavior against `workspaces/puth/src/shims/Browser.ts`, `workspaces/puth/src/plugins/PuthStandardPlugin.ts` and Context source, then check callable names against the generated PHP classes and Laravel overrides. Plugin extensions belong to the registered Page, Frame or ElementHandle; they are not all Browser shim methods.

Keep Laravel-only configuration, encrypted cookies and automatic test artifacts in dedicated integration pages. Register new Laravel-only routes in `.vitepress/lib/sdk.ts` so links select the applicable view. Shared pages should describe client-independent behavior first. Other SDKs should be added only when their examples can be verified.

Local search indexes both variants with SDK labels. Shared results retain the selected SDK; Laravel-only results open in Laravel mode. Run `npm -w @puth/docs run test` for URL-selection checks and `npm -w @puth/docs run build` for production rendering and link validation.
