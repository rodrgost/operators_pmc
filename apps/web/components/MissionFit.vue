<script setup lang="ts">
import rules from '../../../packages/rules/operations.json'
const props=defineProps<{contract:any;operators?:any[];recruitment?:boolean;inventory?:any[]}>()
const labels:Record<string,string>={combat:'Combate',stealth:'Furtividade',technical:'Técnica',perception:'Percepção',endurance:'Resistência',leadership:'Liderança'}
const weights=computed(()=>Object.entries(rules.templates.find(t=>t.type===props.contract?.type)?.weights??{}).filter((entry):entry is [string,number]=>typeof entry[1]==='number').sort((a,b)=>b[1]-a[1]))
const ranked=computed(()=>(props.operators??[]).map(o=>({...o,fit:Math.round(weights.value.reduce((sum,[key,weight])=>sum+(o.attributes?.[key]??0)*weight,0))})).sort((a,b)=>b.fit-a.fit))
</script>
<template>
 <section v-if="contract&&weights.length" class="mission-fit" aria-label="Orientação para escolher operadores">
  <h3>{{recruitment?'Contratar para: ':'O que esta missão pede: '}}<GameLabel kind="mission" :code="contract.type" :label="contract.title" /></h3>
  <p><strong>Atributos prioritários:</strong> {{weights.map(([key,weight])=>labels[key]+' '+Math.round(weight*100)+'%').join(' · ')}}.</p>
  <p><strong>Kits obrigatórios:</strong> <KitList :categories="contract.requiredEquipment" empty="nenhum" />. A especialização do operador não substitui o kit.</p>
  <ul v-if="inventory"><li v-for="category in contract.requiredEquipment??[]" :key="category"><GameLabel kind="kit" :code="category" />: {{inventory.some(k=>k.category===category&&k.ready)?'há kit apto no estoque; selecione na etapa Kits':'falta kit apto; confira compra, entrega, reparo ou reposição'}}.</li></ul>
  <p>{{recruitment?'Compare os candidatos abaixo antes de contratar.':'Você pode consultar os candidatos e comprar kits antes de aceitar. Aceitar inicia o prazo de mobilização.'}} Qualquer especialização pode participar; compare os atributos e escolha também um bom líder. O cálculo da missão combina os dois melhores integrantes em cada atributo, favorecendo perfis complementares.</p>
  <details v-if="ranked.length" open>
   <summary>{{recruitment?'Comparar candidatos para esta missão':'Comparar atributos dos operadores para esta missão'}}</summary>
   <ul><li v-for="o in ranked" :key="o.id"><strong>{{o.name}} — {{o.fit}}/100</strong> · {{weights.map(([key])=>labels[key]+': '+(o.attributes?.[key]??0)).join(' · ')}}<span v-if="!weights.some(([key])=>key==='leadership')"> · Liderança: {{o.attributes?.leadership??0}}</span><span v-if="!recruitment"> · {{o.availability==='available'?'Disponível':'Confira a disponibilidade na formação'}}</span></li></ul>
   <p>Índice = média dos atributos ponderada pelos pesos acima. Não é chance de sucesso nem avaliação da equipe: saúde, fadiga, liderança, familiaridade, kits e dificuldade também influenciam o resultado.</p>
  </details>
 </section>
</template>
<style scoped>
.mission-fit{padding:1rem;border:1px solid var(--border,#667085);border-radius:12px;margin:1rem 0;overflow-wrap:anywhere}.mission-fit h3{margin-top:0}.mission-fit li{margin:.65rem 0}.mission-fit ul{padding-left:1.25rem}.mission-fit summary{cursor:pointer;font-weight:600}
</style>
