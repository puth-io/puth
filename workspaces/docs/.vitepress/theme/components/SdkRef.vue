<script setup lang="ts">
import { computed } from 'vue';
import { useSdk } from '../sdk';
import { clientCall } from '../../lib/sdk';

// A method mentioned in prose, written the way the selected client calls it.
const props = defineProps<{ code: string }>();
const sdk = useSdk();
const call = computed(() => clientCall(props.code, sdk.value));
</script>

<template><code>{{ call }}</code></template>
