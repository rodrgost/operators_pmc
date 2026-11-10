<script setup lang="ts">
defineProps<{modelValue:string;items:string[][];label:string;disabled?:boolean}>()
const emit=defineEmits(['update:modelValue'])
</script>
<template><nav class="section-nav" :aria-label="label"><button v-for="item in items" :key="item[0]" type="button" :class="{active:modelValue===item[0]}" :aria-current="modelValue===item[0]?'page':undefined" :disabled="disabled" @click="emit('update:modelValue',item[0])">{{item[1]}}</button></nav></template>
