<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useSdk } from '../sdk';
import { contentSdk, pageSdks, type Sdk } from '../../lib/sdk';
defineProps<{ sdk: Sdk }>();
const selected = useSdk();
const { frontmatter } = useData();
const shown = computed(() => contentSdk(selected.value, pageSdks(frontmatter.value)));
</script>

<template>
  <div v-show="shown === sdk" class="sdk-content" :data-sdk="sdk">
    <slot />
  </div>
</template>
