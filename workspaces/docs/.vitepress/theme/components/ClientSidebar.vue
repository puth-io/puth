<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import { useSdk } from '../sdk';
import { client, clientSidebar } from '../../lib/sdk';

// The selected client's own pages, such as the Laravel integration. Shared pages
// stay in the static sidebar; this group changes with the client.
const sdk = useSdk();
const { page } = useData();
const items = computed(() => clientSidebar[sdk.value] ?? []);
const current = computed(() => '/' + page.value.relativePath.replace(/(index)?\.md$/, ''));
</script>

<template>
  <section v-if="items.length" class="client-sidebar" :aria-labelledby="`client-sidebar-${sdk}`">
    <h2 :id="`client-sidebar-${sdk}`" class="heading">{{ client(sdk).label }}</h2>
    <a
      v-for="item in items"
      :key="item.link"
      class="link"
      :class="{ active: current === item.link }"
      :href="withBase(item.link)"
      :aria-current="current === item.link ? 'page' : undefined"
    >{{ item.text }}</a>
  </section>
</template>

<style scoped>
.client-sidebar { display: flex; flex-direction: column; gap: 2px; padding: 4px 0 20px; }
.heading {
  margin: 0; padding: 4px 10px 8px; line-height: 24px;
  font-family: var(--vp-font-family-mono); font-size: 11.5px; font-weight: 400; color: #93c5fd;
}
.link {
  padding: 4px 10px; border: 1px solid transparent; border-radius: 6px;
  font-size: 14px; line-height: 24px; color: var(--vp-c-text-2); transition: color .2s;
}
.link:hover { color: var(--vp-c-text-1); }
.link.active { border-color: var(--puth-border); background: var(--puth-surface); color: var(--vp-c-brand-1); }
.link:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
</style>
