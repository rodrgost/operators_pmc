<script setup lang="ts">
type Estimate={min:number;max:number}
const props=defineProps<{
 contract:{
  intelligence?:{topics:Record<string,{estimate:Estimate|null;confidence:number}>}|null
  estimatedDifficulty:Estimate
  estimatedRisk:Estimate
  confidence:number
 }
}>()
const topics=computed(()=>[
 {label:'Dificuldade',view:props.contract.intelligence?.topics.difficulty??{estimate:props.contract.estimatedDifficulty,confidence:props.contract.confidence}},
 {label:'Risco',view:props.contract.intelligence?.topics.risk??{estimate:props.contract.estimatedRisk,confidence:props.contract.confidence}},
])
</script>

<template>
 <div class="contract-estimates">
  <IntelligenceEstimate v-for="{label,view} in topics" :key="label" :label="label" :estimate="view.estimate" :confidence="view.confidence" inverse />
 </div>
</template>

<style scoped>
.contract-estimates{display:grid;gap:var(--space-3);margin:var(--space-3) 0}
</style>
