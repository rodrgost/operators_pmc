<script setup lang="ts">
defineProps<{name:string;caption?:string;metrics:{label:string;value?:number}[]}>()
</script>

<template>
 <div class="mission-snapshot">
  <div class="snapshot-name"><strong>{{name}}</strong><small v-if="caption">{{caption}}</small></div>
  <dl v-if="metrics.some(metric=>metric.value!==undefined)">
   <template v-for="metric in metrics" :key="metric.label">
    <div v-if="metric.value!==undefined">
     <dt>{{metric.label}}</dt>
     <dd>{{metric.value}}<small>/100</small></dd>
    </div>
   </template>
  </dl>
 </div>
</template>

<style scoped>
.mission-snapshot { display:grid; gap:.45rem; padding:.6rem 0; border-top:1px solid var(--command-line); }
.snapshot-name { display:flex; flex-wrap:wrap; align-items:baseline; gap:.2rem .55rem; }
.snapshot-name small,.mission-snapshot dt,.mission-snapshot dd small { color:#b2c4cb; font-size:var(--text-caption); }
.mission-snapshot dl { display:flex; flex-wrap:wrap; gap:.35rem 1.1rem; margin:0; }
.mission-snapshot dd { margin:0; font-weight:650; font-variant-numeric:tabular-nums; }
</style>
