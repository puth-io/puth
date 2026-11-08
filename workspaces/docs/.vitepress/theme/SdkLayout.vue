<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useRouter } from 'vitepress';
import { isDocsPath, isSdk, pageSdk, sdkHref, sdkParam, type Sdk } from '../lib/sdk';
import { sdkKey } from './sdk';
import ClientSelector from './components/ClientSelector.vue';
import DocHeader from './components/DocHeader.vue';
import ClientSidebar from './components/ClientSidebar.vue';
import SiteFooter from './SiteFooter.vue';

const storageKey = 'puth-docs-sdk';
const sdk = ref<Sdk>('laravel');
const preferred = ref<Sdk>('laravel');
const fixed = ref<Sdk | undefined>();
const router = useRouter();
let observer: MutationObserver | undefined;
const links = new WeakMap<HTMLAnchorElement, { original: string; rewritten: string }>();
let before: typeof router.onBeforeRouteChange;
let after: typeof router.onAfterRouteChange;
let beforeHook: typeof router.onBeforeRouteChange;
let afterHook: typeof router.onAfterRouteChange;

function stored(): Sdk | undefined {
  try {
    const value = localStorage.getItem(storageKey);
    return isSdk(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function remember(value: Sdk) {
  try { localStorage.setItem(storageKey, value); } catch { /* storage can be unavailable */ }
}

function updateLinks() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (link.hasAttribute('download')) continue;
    const href = link.getAttribute('href')!;
    const saved = links.get(link);
    const original = saved?.rewritten === href ? saved.original : href;
    const rewritten = sdkHref(original, preferred.value, window.location.href);
    links.set(link, { original, rewritten });
    if (rewritten !== href) link.setAttribute('href', rewritten);
  }
}

async function sync() {
  const url = new URL(window.location.href);
  const requested = sdkParam(url);
  fixed.value = pageSdk(url.pathname);
  // A direct URL wins. Client-only pages do not change what the reader chose.
  if (requested && !fixed.value) {
    preferred.value = requested;
    remember(requested);
  } else {
    preferred.value = stored() ?? 'laravel';
  }
  sdk.value = fixed.value ?? preferred.value;
  await nextTick();
  updateLinks();
}

function select(value: Sdk) {
  preferred.value = value;
  remember(value);
  if (fixed.value) return;
  const url = new URL(window.location.href);
  if (isDocsPath(url.pathname)) {
    url.searchParams.set('sdk', value);
    void router.go(url.pathname + url.search + url.hash);
  } else {
    sdk.value = value;
  }
}

provide(sdkKey, { sdk, preferred, fixed, select });
watch(preferred, () => { void nextTick(updateLinks); });

onMounted(() => {
  before = router.onBeforeRouteChange;
  after = router.onAfterRouteChange;
  beforeHook = async href => {
    if (await before?.(href) === false) return false;
    const rewritten = sdkHref(href, preferred.value, window.location.href);
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
  // Read the URL and storage after hydration so the server and initial client render match.
  void sync().then(() => {
    // Keep the address of docs pages in line with the client they show.
    const url = new URL(window.location.href);
    if (isDocsPath(url.pathname) && url.searchParams.get('sdk') !== sdk.value) {
      url.searchParams.set('sdk', sdk.value);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  });
  observer = new MutationObserver(updateLinks);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (router.onBeforeRouteChange === beforeHook) router.onBeforeRouteChange = before;
  if (router.onAfterRouteChange === afterHook) router.onAfterRouteChange = after;
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-before><ClientSelector class="nav-client-selector" /></template>
    <template #sidebar-nav-before><ClientSidebar /></template>
    <template #doc-before><DocHeader /></template>
    <template #layout-bottom><SiteFooter /></template>
  </DefaultTheme.Layout>
</template>
