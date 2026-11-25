<script setup lang="ts">
const props=defineProps<{contract:any;operators?:any[]}>()
const labels:Record<string,string>={combat:'Combate',stealth:'Furtividade',technical:'Técnica',perception:'Percepção',endurance:'Resistência',leadership:'Liderança'}
const weights=computed(()=>missionFitWeights(props.contract?.type))
const ranked=computed(()=>(props.operators??[]).map(o=>({...o,fit:missionFitScore(weights.value,o.attributes)})).sort((a,b)=>b.fit-a.fit))
</script>
<template>
 <section v-if="contract&&weights.length" class="mission-fit" aria-label="Orientação para escolher operadores">
  <h3>O que esta missão pede</h3>
  <p><strong>Atributos prioritários:</strong> {{weights.map(([key,weight])=>labels[key]+' '+Math.round(weight*100)+'%').join(' · ')}}.</p>
  <p><strong>Kits obrigatórios:</strong> <KitList :categories="contract.requiredEquipment" empty="nenhum" />. A especialização do operador não substitui o kit.</p>
  <p>O cálculo combina os dois melhores integrantes em cada atributo. Compare perfis complementares e a liderança.</p>
  <details v-if="ranked.length" open>
   <summary>Comparar atributos dos operadores</summary>
   <ul><li v-for="o in ranked" :key="o.id"><strong>{{o.name}} · {{o.fit}}/100</strong> · {{weights.map(([key])=>labels[key]+': '+(o.attributes?.[key]??0)).join(' · ')}}<span v-if="!weights.some(([key])=>key==='leadership')"> · Liderança: {{o.attributes?.leadership??0}}</span> · {{o.availability==='available'?'Disponível':'Confira a disponibilidade na formação'}}</li></ul>
   <p>Índice = média dos atributos ponderada pelos pesos acima. Não é chance de sucesso nem avaliação da equipe: saúde, fadiga, liderança, familiaridade, kits e dificuldade também influenciam o resultado.</p>
  </details>
 </section>
</template>
<style scoped>
.mission-fit{padding:1rem;border:1px solid var(--border,#667085);border-radius:12px;margin:1rem 0;overflow-wrap:anywhere}.mission-fit h3{margin-top:0}.mission-fit li{margin:.65rem 0}.mission-fit ul{padding-left:1.25rem}.mission-fit summary{cursor:pointer;font-weight:600}
</style>
