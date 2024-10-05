<script setup>
import {ref} from 'vue';

const count = ref(0);
const array = ref([]);

function increment() {
    count.value++;
    array.value.push(count.value);
}

function incrementDelayed() {
    setTimeout(() => {
        count.value++;
        array.value.push(count.value);
    }, 1000);
}
</script>

<template>
    <div dusk="counter">Count: {{ count }}</div>
    
    <button @click="increment" id="add">
        Add
    </button>
    
    <button @click="incrementDelayed" id="add-delay">
        Add delay
    </button>
    
    <input v-model="count">
</template>
