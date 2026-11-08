<script setup lang="ts">
import { computed } from 'vue';
import { useSdk } from '../sdk';
const props = defineProps<{ php: string; laravel: string; spring?: string }>();
const sdk = useSdk();
// Signatures differ between Laravel and the generated clients; Spring Boot can name its own.
const call = computed(() => sdk.value === 'laravel' ? props.laravel : sdk.value === 'spring' && props.spring ? props.spring : props.php);
</script>

<template><code>{{ call }}</code></template>
