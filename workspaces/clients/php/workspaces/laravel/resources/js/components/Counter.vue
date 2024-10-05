<script setup>
import {ref} from 'vue';

const count = ref(0);

function increment() {
    setTimeout(() => {count.value++;}, 1000);
}
</script>

<template>
    <div dusk="counter">Count: {{ count }}</div>
    
    <button @click="count++" id="add">
        Add
    </button>
    
    <button @click="increment" id="add-delay">
        Add delay
    </button>
    
    <input v-model="count">
</template>
