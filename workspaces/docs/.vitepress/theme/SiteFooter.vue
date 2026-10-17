<script setup lang="ts">
import { useData, withBase } from 'vitepress';

const { frontmatter } = useData();
</script>

<template>
  <footer v-if="frontmatter.layout === 'home'" class="site-footer">
    <div class="footer-inner">
      <div class="footer-main">
        <div class="footer-brand">
          <a class="brand" :href="withBase('/')" aria-label="Puth home">
            <img :src="withBase('/assets/image/puth-logo-blue.png')" alt="" width="28" height="28">
            <span>Puth</span>
          </a>
          <p>Browser tests you can see.<br>Failures you can understand.</p>
          <a class="get-started" :href="withBase('/guide/getting-started')">Start testing <span aria-hidden="true">→</span></a>
        </div>
        <nav aria-label="Footer documentation">
          <h2>Documentation</h2>
          <a :href="withBase('/guide/getting-started')">Getting started</a>
          <a :href="withBase('/guide/laravel')">Laravel integration</a>
          <a :href="withBase('/guide/ci-cd')">CI/CD and snapshots</a>
          <a :href="withBase('/guide/portal')">Portal and detours</a>
        </nav>
        <nav aria-label="Footer project">
          <h2>Project</h2>
          <a href="https://github.com/puth-io/puth">GitHub</a>
          <a href="https://github.com/puth-io/puth/releases">Releases</a>
          <a href="https://github.com/puth-io/puth/issues">Report an issue</a>
          <a :href="withBase('/.well-known/security.txt')">Security</a>
        </nav>
      </div>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} Puth</span>
        <span>Native clients. Realtime GUI. Test replay.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: var(--vp-sidebar-bg-color);
  padding: 64px 24px 28px;
}
.footer-inner { max-width: 1152px; margin: 0 auto; }
.footer-main { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 48px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 700; color: var(--vp-c-text-1); }
.brand img { object-fit: contain; }
.footer-brand p { margin: 16px 0 20px; line-height: 1.8; color: var(--vp-c-text-2); }
.get-started { color: var(--vp-c-brand-1); font-size: 14px; font-weight: 600; }
.get-started span { margin-left: 6px; }
nav { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
nav h2 { margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--vp-c-text-1); }
nav a { font-size: 14px; color: var(--vp-c-text-2); transition: color 0.2s; }
a:hover { color: var(--vp-c-brand-1); }
a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 5px; border-radius: 2px; }
.footer-bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 64px; font-size: 12px; color: var(--vp-c-text-2); }
@media (min-width: 960px) { .site-footer { padding-right: 64px; padding-left: 64px; } }
@media (max-width: 639px) {
  .site-footer { padding-top: 40px; }
  .footer-main { grid-template-columns: 1fr 1fr; gap: 36px 24px; }
  .footer-brand { grid-column: 1 / -1; }
  .footer-bottom { flex-direction: column; gap: 8px; margin-top: 40px; }
}
</style>
