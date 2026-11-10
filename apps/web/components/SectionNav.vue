<script setup lang="ts">
const props=defineProps<{modelValue:string;items:string[][];label:string;disabled?:boolean;gameId?:string;scope?:string}>()
const news=useNavigationNews()
const emit=defineEmits(['update:modelValue'])
</script>
<template><nav class="section-nav" :aria-label="label"><button v-for="item in items" :key="item[0]" type="button" :class="{active:modelValue===item[0]}" :aria-current="modelValue===item[0]?'page':undefined" :disabled="disabled" @click="emit('update:modelValue',item[0])">{{item[1]}}<NavigationBadge v-if="gameId&&scope" :status="news.status(gameId,scope+'.'+item[0])" /></button></nav></template>
