<script setup lang="ts">
import { useData, withBase } from 'vitepress';

const { frontmatter } = useData();
</script>

<template>
  <footer v-if="frontmatter.layout === 'home'" class="site-footer">
    <span>© {{ new Date().getFullYear() }} Puth</span>
    <nav aria-label="Footer">
      <a href="https://github.com/puth-io/puth">GitHub</a>
      <a href="https://github.com/puth-io/puth/releases">Releases</a>
      <a href="https://github.com/puth-io/puth/issues">Report an issue</a>
      <a :href="withBase('/.well-known/security.txt')">Security</a>
    </nav>
  </footer>
</template>

<style scoped>
.site-footer {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px;
  max-width: var(--puth-container); margin: 0 auto; padding: 40px 24px 48px; box-sizing: content-box;
  font-size: 13px; color: var(--vp-c-text-2);
}
nav { display: flex; flex-wrap: wrap; gap: 20px; }
a { color: var(--vp-c-text-2); transition: color .2s; }
a:hover { color: var(--vp-c-text-1); }
a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 4px; border-radius: 2px; }
</style>
