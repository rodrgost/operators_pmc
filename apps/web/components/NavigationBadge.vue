<script setup lang="ts">
defineProps<{status:string}>()
</script>
<template><i v-if="status" :class="['navigation-badge',status]" role="img" :aria-label="status==='attention'?'Requer atenção':'Novidades não lidas'" :title="status==='attention'?'Requer atenção':'Novidades não lidas'">{{status==='attention'?'!':''}}</i></template>
