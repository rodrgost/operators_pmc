<script setup lang="ts">
defineProps<{categories?:string[];empty?:string}>()
</script>

<template>
 <template v-if="categories?.length">
  <template v-for="(category,index) in categories" :key="category"><template v-if="index">, </template><GameLabel kind="kit" :code="category" /></template>
 </template>
 <template v-else>{{empty}}</template>
</template>
