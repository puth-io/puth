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

The site is deployed to `https://puth.io` using GitHub Pages. It uses the domain root and clean URLs, which GitHub Pages serves from the corresponding HTML files.

This workspace replaces the puth.io landing page and documentation. Its image assets live in `public/assets/image` so the build has no dependency on the old site. The site is dark only. Theme tokens, the dithered blue (`.puth-dither`), cards (`.home-card`) and the layout overrides that keep the nav, sidebar and content in one 1200px container live in `.vitepress/theme/style.css`. The homepage is `components/HomePage.vue`; its per-client code samples are Markdown slots in `index.md`, so they are highlighted like any other code block. `components/DocHeader.vue` shows each page's title and description in a header card, and `components/ClientSelector.vue` is the client selector in the nav. Geist and JetBrains Mono are bundled through Fontsource, so no fonts load from third-party servers.

The guide covers installation, Laravel, CI snapshots, portal settings, browser testing concepts and roadmap context, with Browser and Context API references under `/api/`. Content from the former site and the manual migration on the `docs` branch is adapted to the current repository where behavior has changed. The client selector changes examples, API signatures and client-specific explanations. Legacy URL compatibility is intentionally omitted; guide navigation uses `/guide/` routes.

## Deployment

The `Docs` workflow in `.github/workflows/docs.yml` runs only on pushes to `master` that change `workspaces/docs/**`, the root `package.json` or `package-lock.json`, or the workflow itself. It installs dependencies with Node 24, runs the docs tests, builds the site, and deploys `workspaces/docs/.vitepress/dist` using the GitHub Pages artifact actions. Deployments use the `github-pages` environment and are serialized without cancelling an active deployment. Pull requests do not run this workflow.

Docs deployment is independent of Changesets and package publishing. This private workspace does not need a Changeset for documentation or deployment changes. The workflow uses the repository's built-in `GITHUB_TOKEN`; no deployment secret is needed.

To enable hosting or move the domain from another host:

1. Inspect the repository's existing **Settings → Pages** configuration. Set **Build and deployment → Source** to **GitHub Actions**, and set the custom domain to `puth.io`. The tracked `public/CNAME` is also copied into the build; with an Actions deployment, configure the custom domain in Pages settings explicitly.
2. Replace the existing apex (`@`) web-hosting records with these GitHub Pages A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. Remove old apex AAAA records so IPv6 traffic cannot reach the previous host. Preserve unrelated DNS records, including mail and domain-verification records. Configuring `www.puth.io` is outside this setup.
3. Allow GitHub to validate DNS and provision the certificate, then enable **Enforce HTTPS** in Pages settings. Ensure any `github-pages` environment deployment rules allow `master`.
4. Merge the deployment configuration into `master` to trigger the first build. After DNS propagation and deployment, check the homepage, direct guide/API URLs and refreshes, search, SDK selection, assets, `.well-known/security.txt`, and an unknown URL's 404 page over HTTPS.

For local validation, run `npm -w @puth/docs run test` and `npm run docs:build`. The output should include `index.html`, guide/API HTML, assets, `404.html`, `CNAME`, and `.well-known` files. To redeploy without a new commit, rerun a previous `Docs` workflow run in GitHub Actions.

## SDK-aware content

Readers choose a client in the nav, or in the homepage's code card: Laravel, Spring Boot, plain PHP, plain Java or Node.js (`?sdk=laravel|spring|php|java|js`). Pages are written for Laravel and plain PHP. A page that also has a Spring Boot variant lists it in its frontmatter (`sdks: [spring]`); clients without a variant on a page see the PHP one with a note. A direct URL wins and is remembered in local storage; without `sdk`, pages use the remembered choice, otherwise Laravel. The choice is carried through documentation links, including search results and previous/next links. Client-only pages, such as the Laravel integration or `guide/spring-boot.md`, always use their client and keep the remembered choice for other pages. They are listed in `clientPages` in `.vitepress/lib/sdk.ts`, and `clientSidebar` there defines the sidebar group shown for the selected client right after Introduction. Keep these pages out of the static sidebar in `config.ts`.

Write shared explanations once. Wrap client-specific paragraphs or examples in `<SdkContent sdk="laravel">` or `<SdkContent sdk="php">`, with blank lines around their Markdown content. Keep headings outside these blocks so both views share the same outline and anchors. Use `<SdkCall php="$browser-&gt;_keys($selector, $keys)" laravel="$browser-&gt;keys($selector, ...$keys)" />` for short signatures that differ. These components are registered globally by the theme.

Always include the receiver when documenting a call: `$browser->`, `$context->`, `$page->`, `$element->` or the appropriate integration object. Examples use explicit receivers on each call. Verify core behavior against `workspaces/puth/src/shims/Browser.ts`, `workspaces/puth/src/plugins/PuthStandardPlugin.ts` and Context source, then check callable names against the generated PHP classes and Laravel overrides. Plugin extensions belong to the registered Page, Frame or ElementHandle; they are not all Browser shim methods.

Keep Laravel-only configuration, encrypted cookies and automatic test artifacts in dedicated integration pages, and Spring Boot setup in `guide/spring-boot.md`. Register new client-only routes in `clientPages` and `clientSidebar` so links select the applicable view. Shared pages should describe client-independent behavior first. Give a client its own `SdkContent` variant only when its examples can be verified; until then `contentSdk()` in `.vitepress/lib/sdk.ts` maps it to the PHP variant.

Wrap the sections of a step-by-step guide in `<div class="steps">`, with blank lines around the Markdown. Each `##` heading inside becomes a numbered step on a dashed rail.

Local search indexes both variants with SDK labels. Shared results retain the selected SDK; Laravel-only results open in Laravel mode. Run `npm -w @puth/docs run test` for URL-selection checks and `npm -w @puth/docs run build` for production rendering and link validation.
