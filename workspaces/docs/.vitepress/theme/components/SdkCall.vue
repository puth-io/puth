<script setup lang="ts">
import { computed } from 'vue';
import { useSdk } from '../sdk';
const props = defineProps<{ php: string; laravel: string }>();
const sdk = useSdk();
const call = computed(() => props[sdk.value]);
</script>

<template><code>{{ call }}</code></template>
