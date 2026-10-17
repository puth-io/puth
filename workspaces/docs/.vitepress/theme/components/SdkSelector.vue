<script setup lang="ts">
import { computed } from 'vue';
import { useData, useRouter } from 'vitepress';
import { useSdk } from '../sdk';
import { isLaravelPage, type Sdk } from '../../lib/sdk';
const sdk = useSdk();
const router = useRouter();
const { page } = useData();
const laravelOnly = computed(() => isLaravelPage('/' + page.value.relativePath.replace(/\.md$/, '')));
function select(event: Event) {
  const value = (event.target as HTMLSelectElement).value as Sdk;
  const url = new URL(window.location.href);
  url.searchParams.set('sdk', value);
  void router.go(url.pathname + url.search + url.hash);
}
</script>

<template>
  <div class="sdk-selector">
    <label for="docs-sdk">Client SDK</label>
    <select id="docs-sdk" :value="sdk" :disabled="laravelOnly" @change="select">
      <option value="laravel">Laravel</option>
      <option value="php">PHP</option>
    </select>
    <span v-if="laravelOnly" class="sdk-description">Laravel integration</span>
    <span v-else class="sdk-description">Examples and API calls for {{ sdk === 'php' ? 'standalone PHP' : 'Laravel' }}</span>
  </div>
</template>

<style scoped>
.sdk-selector { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 28px; font-size: 13px; }
label { font-weight: 600; color: var(--vp-c-text-1); }
select { appearance: auto; padding: 6px 10px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); font: inherit; }
select:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
select:disabled { opacity: 0.75; }
.sdk-description { color: var(--vp-c-text-2); }
@media (max-width: 480px) { .sdk-description { flex-basis: 100%; } }
</style>
