<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { useRouter } from 'vitepress';
import { isDocsPath, sdkFromUrl, sdkHref, type Sdk } from '../lib/sdk';
import { sdkKey } from './sdk';
import SdkSelector from './components/SdkSelector.vue';
import SiteFooter from './SiteFooter.vue';

const sdk = ref<Sdk>('laravel');
provide(sdkKey, sdk);
const router = useRouter();
let observer: MutationObserver | undefined;
const links = new WeakMap<HTMLAnchorElement, { original: string; rewritten: string }>();
let before: typeof router.onBeforeRouteChange;
let after: typeof router.onAfterRouteChange;
let beforeHook: typeof router.onBeforeRouteChange;
let afterHook: typeof router.onAfterRouteChange;

function updateLinks() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (link.hasAttribute('download')) continue;
    const href = link.getAttribute('href')!;
    const saved = links.get(link);
    const original = saved?.rewritten === href ? saved.original : href;
    const rewritten = sdkHref(original, sdk.value, window.location.href);
    links.set(link, { original, rewritten });
    if (rewritten !== href) link.setAttribute('href', rewritten);
  }
}

async function sync() {
  sdk.value = sdkFromUrl(new URL(window.location.href));
  await nextTick();
  updateLinks();
}

onMounted(() => {
  before = router.onBeforeRouteChange;
  after = router.onAfterRouteChange;
  beforeHook = async href => {
    if (await before?.(href) === false) return false;
    const rewritten = sdkHref(href, sdk.value, window.location.href);
    const incoming = new URL(href, window.location.href);
    const target = new URL(rewritten, window.location.href);
    if (target.href !== incoming.href) {
      await router.go(rewritten);
      return false;
    }
  };
  afterHook = async href => { await after?.(href); await sync(); };
  router.onBeforeRouteChange = beforeHook;
  router.onAfterRouteChange = afterHook;
  // Read the query after hydration so the server and initial client render match.
  void sync();
  observer = new MutationObserver(updateLinks);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  // Direct links to Laravel-only pages always use their applicable SDK.
  const url = new URL(window.location.href);
  if (isDocsPath(url.pathname) && url.searchParams.has('sdk') && url.searchParams.get('sdk') !== sdk.value) {
    url.searchParams.set('sdk', sdk.value);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (router.onBeforeRouteChange === beforeHook) router.onBeforeRouteChange = before;
  if (router.onAfterRouteChange === afterHook) router.onAfterRouteChange = after;
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before><SdkSelector /></template>
    <template #layout-bottom><SiteFooter /></template>
  </DefaultTheme.Layout>
</template>
