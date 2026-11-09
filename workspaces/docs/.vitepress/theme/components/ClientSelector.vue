<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useSdkState } from '../sdk';
import { client, clients, languages, plannedLanguages, type Sdk } from '../../lib/sdk';

const { sdk, select } = useSdkState();
const open = ref(false);
const language = ref<string>('PHP');
const root = ref<HTMLElement>();
const current = computed(() => client(sdk.value));
const frameworks = computed(() => clients.filter(c => c.language === language.value));
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function show() {
  clearTimeout(closeTimer);
  if (!open.value) language.value = current.value.language;
  open.value = true;
}

function hide(delay = 150) {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => { open.value = false; }, delay);
}

function toggle() {
  if (open.value) hide(0); else show();
}

function pick(id: Sdk) {
  open.value = false;
  select(id);
}

function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) hide(0);
}

onBeforeUnmount(() => clearTimeout(closeTimer));
</script>

<template>
  <div
    ref="root"
    class="client-selector"
    @mouseenter="show"
    @mouseleave="hide()"
    @focusout="onFocusOut"
    @keydown.esc="hide(0)"
  >
    <button
      type="button"
      class="trigger"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggle"
    >
      <span class="language">{{ current.language }}</span>
      <span class="slash" aria-hidden="true">/</span>
      <span class="framework">{{ current.label }}</span>
      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div v-if="open" class="popover">
      <div class="panel">
        <div class="languages">
          <div class="heading">Language</div>
          <button
            v-for="name in languages"
            :key="name"
            type="button"
            class="language-item"
            :class="{ active: language === name, planned: plannedLanguages.has(name) }"
            :aria-pressed="language === name"
            @mouseenter="language = name"
            @focus="language = name"
            @click="language = name"
          >
            <span>{{ name }}</span>
            <span v-if="plannedLanguages.has(name)" class="note">Soon</span>
          </button>
        </div>
        <div class="frameworks">
          <div class="heading accent">{{ language }}</div>
          <button
            v-for="item in frameworks"
            :key="item.id"
            type="button"
            class="framework-item"
            :class="{ active: item.id === sdk }"
            :aria-pressed="item.id === sdk"
            @click="pick(item.id)"
          >
            <span class="row"><span class="name">{{ item.label }}</span><span class="status" :data-status="item.status">{{ item.status }}</span></span>
            <span class="description">{{ item.description }}</span>
          </button>
          <p v-if="!frameworks.length" class="planned-note">{{ language }} support is coming soon.</p>
          <p class="footnote">Examples and API signatures follow this choice on every page.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-selector { position: relative; }
.trigger {
  display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px 0 12px;
  border: 1px solid var(--puth-border); border-radius: 8px; background: var(--puth-surface);
  color: var(--vp-c-text-1); font-size: 13px; cursor: pointer; transition: border-color .2s;
}
.trigger:hover, .trigger[aria-expanded="true"] { border-color: var(--puth-border-hover); }
.trigger:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.language { color: var(--vp-c-text-2); }
.slash { color: #525252; }
.framework { font-weight: 500; }
.popover { position: absolute; top: 100%; right: 0; z-index: 30; padding-top: 10px; }
.panel {
  display: flex; width: 572px; max-width: calc(100vw - 32px); overflow: hidden; white-space: normal;
  border: 1px solid var(--puth-border); border-radius: 10px; background: var(--puth-surface);
  box-shadow: 0 20px 50px rgba(0, 0, 0, .6);
}
.languages { width: 170px; flex: none; padding: 8px; border-right: 1px dashed #404040; display: flex; flex-direction: column; gap: 2px; }
.frameworks { flex: 1; min-width: 0; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.heading { padding: 6px 10px; font-family: var(--vp-font-family-mono); font-size: 11px; color: var(--vp-c-text-2); }
.heading.accent { color: var(--vp-c-brand-1); }
.language-item {
  display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 10px; border-radius: 6px;
  color: var(--vp-c-text-1); font-size: 14px; text-align: left; cursor: pointer;
}
.language-item span:first-child { flex: 1; }
.language-item.planned { color: var(--vp-c-text-2); }
.language-item.active { background: #262626; }
.note { font-size: 11px; color: var(--vp-c-text-2); }
.framework-item {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 12px;
  border: 1px solid transparent; border-radius: 8px; color: var(--vp-c-text-1); text-align: left; cursor: pointer;
}
.framework-item:hover { background: #1f1f1f; }
.framework-item.active { border-color: rgba(96, 165, 250, .6); background: rgba(37, 99, 235, .12); }
.language-item:focus-visible, .framework-item:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
.row { display: flex; align-items: center; gap: 8px; width: 100%; }
.name { flex: 1; font-size: 14px; font-weight: 500; }
.description { font-size: 12.5px; line-height: 1.5; color: var(--vp-c-text-2); }
.status { padding: 1px 6px; border-radius: 4px; font-family: var(--vp-font-family-mono); font-size: 10.5px; white-space: nowrap; }
.status[data-status="Primary"] { background: rgba(37, 99, 235, .2); color: #93c5fd; }
.status[data-status="Supported"] { background: rgba(34, 197, 94, .14); color: #86efac; }
.status[data-status="Beta"] { background: rgba(245, 158, 11, .14); color: #fcd34d; }
.planned-note { margin: 0; padding: 10px; font-size: 13.5px; line-height: 1.6; color: var(--vp-c-text-2); }
.footnote { margin: auto 0 0; padding: 10px 10px 4px; font-size: 12px; color: var(--vp-c-text-2); }
@media (max-width: 560px) {
  .panel { flex-direction: column; }
  .languages { width: auto; border-right: 0; border-bottom: 1px dashed #404040; flex-direction: row; flex-wrap: wrap; }
  .languages .heading { width: 100%; }
}
</style>
