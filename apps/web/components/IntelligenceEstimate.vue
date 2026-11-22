<script setup lang="ts">
defineProps<{
 label:string
 estimate:{min:number;max:number}|null
 confidence:number
 inverse?:boolean
}>()
</script>

<template>
 <div class="intelligence-estimate">
  <template v-if="estimate">
   <EstimateBar :label="label+' · faixa estimada'" :min="estimate.min" :max="estimate.max" :inverse="inverse" />
   <slot />
   <IntelConfidence :value="confidence" />
  </template>
  <p v-else>{{label}} · Sem estimativa vigente</p>
 </div>
</template>
