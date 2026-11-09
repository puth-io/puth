<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useSdk } from '../sdk';
import { contentSdk, pageSdks } from '../../lib/sdk';
// One client, or several separated by spaces, like "laravel php".
const props = defineProps<{ sdk: string }>();
const selected = useSdk();
const { frontmatter } = useData();
const shown = computed(() => contentSdk(selected.value, pageSdks(frontmatter.value)));
</script>

<template>
  <div v-show="props.sdk.split(' ').includes(shown)" class="sdk-content" :data-sdk="sdk">
    <slot />
  </div>
</template>
