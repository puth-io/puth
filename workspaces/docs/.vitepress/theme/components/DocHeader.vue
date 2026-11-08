<script setup lang="ts">
import { computed } from 'vue';
import { useData, type DefaultTheme } from 'vitepress';
import { useSdk } from '../sdk';
import { client, clientSidebar, hasOwnExamples, pageSdks, sdks } from '../../lib/sdk';
import ClientSelector from './ClientSelector.vue';

const { page, frontmatter, theme } = useData<DefaultTheme.Config>();
const sdk = useSdk();
const current = computed(() => client(sdk.value));
const fallback = computed(() => !hasOwnExamples(sdk.value, pageSdks(frontmatter.value)));

// "Introduction / 02" from the sidebar group that lists this page.
const crumb = computed(() => {
  const link = '/' + page.value.relativePath.replace(/(index)?\.md$/, '');
  const groups = (Array.isArray(theme.value.sidebar) ? theme.value.sidebar : []) as DefaultTheme.SidebarItem[];
  const lists = [
    ...groups.map(group => ({ text: group.text, items: group.items ?? [] })),
    ...sdks.map(id => ({ text: client(id).label, items: clientSidebar[id] ?? [] })),
  ];
  for (const list of lists) {
    const index = list.items.findIndex(item => item.link === link);
    if (index !== -1) return `${list.text} / ${String(index + 1).padStart(2, '0')}`;
  }
  return undefined;
});
</script>

<template>
  <header class="doc-header puth-dither">
    <div class="inner">
      <div v-if="crumb" class="crumb">{{ crumb }}</div>
      <!-- The page's own h1 stays in the document for screen readers and search; this is its visual copy. -->
      <p class="title" aria-hidden="true">{{ page.title }}</p>
      <p v-if="frontmatter.description" class="description">{{ frontmatter.description }}</p>
    </div>
  </header>
  <ClientSelector class="mobile-client-selector" />
  <aside v-if="fallback" class="sdk-fallback">
    <span class="label">Note</span>
    <span>This page has no {{ current.label }} examples yet, so it shows the PHP ones. The {{ current.language }} client has the same Browser methods, generated from the same server source.</span>
  </aside>
</template>

<style scoped>
.doc-header { margin-bottom: 32px; padding: 36px 28px 24px; border-radius: 10px; }
.inner { position: relative; z-index: 1; }
.crumb { font-family: var(--vp-font-family-mono); font-size: 12px; color: rgba(219, 234, 254, .8); }
.title {
  margin: 14px 0 0; font-size: 36px; line-height: 1.15; font-weight: 500; letter-spacing: -.02em;
  background: linear-gradient(180deg, #eff6ff, rgba(219, 234, 254, .8)); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.description { margin: 12px 0 0; max-width: 520px; font-size: 15.5px; line-height: 1.65; color: rgba(219, 234, 254, .85); }
.mobile-client-selector { display: none; margin: -12px 0 24px; }
.sdk-fallback {
  display: flex; gap: 12px; margin: -8px 0 28px; padding: 12px 16px; border: 1px dashed rgba(96, 165, 250, .4);
  border-radius: 10px; font-size: 14px; line-height: 1.6; color: #d4d4d4;
}
.label { padding-top: 1px; font-family: var(--vp-font-family-mono); font-size: 12px; color: #93c5fd; }
@media (max-width: 767px) {
  .doc-header { padding: 28px 20px 20px; }
  .title { font-size: 30px; }
  .mobile-client-selector { display: inline-block; }
}
</style>
