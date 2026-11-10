<script setup lang="ts">
defineProps<{target:string;error?:string;notice?:string}>()
</script>
<template><Teleport :to="target||'body'" :disabled="!target"><div v-if="error||notice" v-context-panel class="action-feedback"><p v-if="error" class="error" role="alert">{{error}}</p><p v-if="notice" class="personnel-notice" role="status">{{notice}}</p></div></Teleport></template>
