<script setup lang="ts">
import { computed } from 'vue';
import { useSdk } from '../sdk';
import { codeLanguage } from '../../lib/sdk';

// One block of an example written for several clients. Readers see their client's block, or the PHP one.
const props = defineProps<{ lang: string; langs: string }>();
const sdk = useSdk();
const shown = computed(() => {
  const wanted = codeLanguage(sdk.value);
  return props.langs.split(' ').includes(wanted) ? props.lang === wanted : props.lang === 'php';
});
</script>

<template>
  <div v-show="shown" class="sdk-code" :data-lang="lang"><slot /></div>
</template>
