<script setup lang="ts">
const props=defineProps<{assessment:{
 skillSpecialists:Record<string,string[]>
 conditionImpact:number
 leaderName:string
 leadershipImpact:number
 familiarityImpact:number
 approach:string
 approachImpact:number
 kitImpact:number
 baseOutcome:string
 rolledOutcome:string
 complication:boolean
}}>()

const skillNames:Record<string,string>={combat:'Combate',stealth:'Furtividade',technical:'Técnica',perception:'Percepção',endurance:'Resistência',leadership:'Liderança'}
const outcomes:Record<string,string>={success:'sucesso',partial:'resultado parcial',delay:'atraso',failure:'falha'}
const format=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1,signDisplay:'exceptZero'})
const points=(n:number)=>format.format(n)
const changedOutcome=computed(()=>props.assessment.baseOutcome!==props.assessment.rolledOutcome)
const contributions=computed(()=>{
 const report=props.assessment
 return [
  {label:'Condição da equipe',value:report.conditionImpact},
  {label:'Liderança',name:report.leaderName,value:report.leadershipImpact},
  {label:'Familiaridade',value:report.familiarityImpact},
  {label:'Abordagem',name:report.approach,value:report.approachImpact},
  {label:'Kits',value:report.kitImpact},
 ]
})
</script>

<template>
 <section class="mission-factors">
  <h4>O que pesou no resultado</h4>
  <dl class="factor-list" aria-label="Pontos de desempenho">
   <div v-for="factor in contributions" :key="factor.label">
    <dt>{{factor.label}}<small v-if="factor.name">{{factor.name}}</small></dt>
    <dd :class="{positive:factor.value>0,negative:factor.value<0}">{{points(factor.value)}} <small>pts</small></dd>
   </div>
  </dl>
  <p><strong>Acaso</strong> <span v-if="changedOutcome">{{outcomes[assessment.baseOutcome]}} → {{outcomes[assessment.rolledOutcome]}}</span><span v-else>Sem mudança no desfecho</span></p>
  <p v-if="assessment.complication" class="negative"><strong>Complicação</strong> Um integrante perdeu saúde.</p>
  <details v-if="Object.keys(assessment.skillSpecialists).length" class="factor-specialists">
   <summary>Quem mais contribuiu por habilidade</summary>
   <dl class="factor-list">
    <div v-for="(names,skill) in assessment.skillSpecialists" :key="skill">
     <dt>{{skillNames[skill]??skill}}</dt><dd>{{names.join(' e ')}}</dd>
    </div>
   </dl>
  </details>
 </section>
</template>

<style scoped>
.mission-factors { margin:.85rem 0; border:1px solid var(--command-line); border-radius:.65rem; padding:.7rem; background:var(--command-surface); }
.mission-factors h4 { margin:0 0 .35rem; }
.factor-list { margin:.3rem 0 .55rem; }
.factor-list > div { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:baseline; gap:.5rem; border-bottom:1px solid var(--command-line); padding:.4rem 0; }
.factor-list dt small { display:block; }
.factor-list dd { margin:0; font-weight:650; font-variant-numeric:tabular-nums; }
.factor-list small { color:#b6c9d1; font-size:var(--text-caption); }
.factor-list dd small { font-weight:500; }
.mission-factors p { margin:.45rem 0; }
.mission-factors p strong { margin-inline-end:.25rem; }
.positive { color:var(--command-accent); }
.negative { color:var(--command-danger); }
.factor-specialists { margin-top:.55rem; }
.factor-specialists summary { cursor:pointer; padding:.45rem 0; }
.factor-specialists dd { font-weight:500; text-align:right; overflow-wrap:anywhere; max-width:15rem; }
</style>
