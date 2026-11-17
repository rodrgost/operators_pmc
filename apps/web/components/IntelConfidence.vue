<script setup lang="ts">
defineProps<{value:number}>()
</script>
<template><div class="intel-confidence"><div><span>Confiança da informação</span><strong>{{value}}%</strong></div><meter min="0" max="100" :value="value" :aria-label="`Confiança da informação: ${value}%`"></meter><small>Qualidade da informação disponível; diminui com o tempo.</small></div></template>
<style scoped>
.intel-confidence{margin:16px 0;max-width:420px}.intel-confidence>div{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#c2cac6}.intel-confidence meter{display:block;width:100%;height:14px;margin:7px 0;accent-color:#b7cce7}.intel-confidence meter::-webkit-meter-bar{background:#263139;border:0;border-radius:4px}.intel-confidence meter::-webkit-meter-optimum-value{background:#b7cce7;border-radius:4px}.intel-confidence small{display:block;color:#a9b0b6;font-size:11px;line-height:1.5}
</style>
