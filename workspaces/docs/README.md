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

The guide covers installation, Laravel, CI snapshots, portal settings and roadmap context. Content from the former site is adapted to the current repository where behavior has changed. Legacy URL compatibility is intentionally omitted; navigation uses `/guide/` routes.
