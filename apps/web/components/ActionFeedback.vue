<script setup lang="ts">
defineProps<{target:string;error?:string;notice?:string}>()
</script>
<template><Transition name="feedback"><div v-if="error||notice" :key="error||notice" v-context-panel class="action-feedback"><p v-if="error" class="error" role="alert"><GameIcon name="alert" /><span><strong>Ação não concluída</strong>{{error}}</span></p><p v-if="notice" class="personnel-notice" role="status"><GameIcon name="check" /><span><strong>Comando registrado</strong>{{notice}}</span></p></div></Transition></template>
