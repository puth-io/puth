<script setup lang="ts">
import { useSdk } from '../sdk';
import type { Sdk } from '../../lib/sdk';
defineProps<{ sdk: Sdk }>();
const selected = useSdk();
</script>

<template>
  <div v-show="selected === sdk" class="sdk-content" :data-sdk="sdk">
    <slot />
  </div>
</template>
