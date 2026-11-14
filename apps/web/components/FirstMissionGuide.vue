<script setup lang="ts">
import {firstMissionGuide,type PreparationStep} from '../utils/firstMission'
const props=defineProps<{command:any;employed?:number;compact?:boolean;disabled?:boolean}>()
const emit=defineEmits<{navigate:[destination:string,section?:string]}>()
const guide=computed(()=>firstMissionGuide(props.command,props.employed))
const sections:Record<string,string>={recruit:'recruitment',squad:'squads',kits:'catalog',mission:''}
function open(step:PreparationStep){emit('navigate',step.tab,sections[step.id]||'')}
</script>
<template>
 <section v-if="guide" :class="['first-mission',{compact}]" aria-label="Roteiro da primeira missão">
  <template v-if="compact"><div><strong>Primeira missão · {{guide.completed}}/{{guide.total}}</strong><p>{{guide.next.title}}</p></div><button class="secondary" :disabled="disabled" @click="emit('navigate','overview')">Ver roteiro →</button></template>
  <template v-else>
   <div class="guide-heading"><div><span class="eyebrow">SEU PRIMEIRO OBJETIVO</span><h2>Sua primeira missão</h2></div><span class="tag">{{guide.completed}} de {{guide.total}}</span></div>
   <progress :value="guide.completed" :max="guide.total" aria-label="Etapas concluídas da preparação" />
   <div class="guide-next"><span class="eyebrow">PRÓXIMO PASSO</span><h3>{{guide.next.title}}</h3><p>{{guide.next.description}}</p><button class="primary" :disabled="disabled" @click="emit('navigate',guide.next.tab,guide.next.section)">{{guide.next.action}} →</button></div>
   <details class="guide-steps"><summary>Ver etapas da preparação</summary><ol><li v-for="step in guide.steps" :key="step.id"><button :disabled="disabled" :aria-current="step.id===guide.next.id?'step':undefined" @click="open(step)"><span aria-hidden="true">{{step.done?'✓':'○'}}</span><span>{{step.title}}<small>{{step.done?'Concluído':step.id===guide.next.id?'Próximo passo':'A preparar'}}</small></span><span aria-hidden="true">→</span></button></li></ol></details>
  </template>
 </section>
</template>
