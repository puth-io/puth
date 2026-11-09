<script setup lang="ts">
import { computed } from 'vue';
import { useSdk } from '../sdk';
import { clientCall } from '../../lib/sdk';
const props = defineProps<{ php: string; laravel: string; spring?: string }>();
const sdk = useSdk();
// Signatures differ between Laravel and the generated clients; Spring Boot can name its own.
const call = computed(() => {
  if (sdk.value === 'laravel') return props.laravel;
  if (sdk.value === 'spring' && props.spring) return props.spring;
  return clientCall(props.php, sdk.value);
});
</script>

<template><code>{{ call }}</code></template>
