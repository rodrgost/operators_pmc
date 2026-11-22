<script setup lang="ts">
const props=defineProps<{
 game:{date:string;currentTurn:number}
 decision:{
  title:string
  description:string
  expiresTurn:number
  fallbackAction:string
  options:{id:string;label:string;consequence:string}[]
 }
 orders:any[]
 disabled:boolean
 inline?:boolean
}>()
const emit=defineEmits<{choose:[choice:string];removeOrder:[orderId:string]}>()
const fallback=computed(()=>props.decision.options.find(option=>option.id===props.decision.fallbackAction))
</script>

<template>
 <section :class="['panel','decision-card',{'decision-inline':inline}]">
  <div class="decision-header">
   <span class="eyebrow">Decisão pendente</span>
   <strong>Prazo até {{formatCampaignTurn(game,decision.expiresTurn)}}</strong>
  </div>
  <component :is="inline?'h4':'h2'">{{decision.title}}</component>
  <p class="decision-description">{{decision.description}}</p>
  <PendingOrderNotice :orders="orders" :disabled="disabled" @remove="emit('removeOrder',$event)" />
  <div class="decision-choices">
   <button v-for="option in decision.options" :key="option.id" type="button" class="secondary decision-choice"
    :disabled="disabled||!!orders.length" @click="emit('choose',option.id)">
    <strong>{{option.label}}</strong><small>{{option.consequence}}</small>
   </button>
  </div>
  <p v-if="fallback" class="decision-default">Sem resposta · <strong>{{fallback.label}}</strong></p>
 </section>
</template>

<style scoped>
.decision-inline { margin:.8rem 0; padding:.75rem; border-inline-start:3px solid var(--command-warning); border-radius:.7rem; }
.decision-header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:.35rem .75rem; margin-bottom:.45rem; }
.decision-header > strong { color:var(--command-warning); font-size:var(--text-caption); }
.decision-inline h4 { margin:0; }
.decision-card .decision-description { margin:.4rem 0 .65rem; }
.decision-card .decision-default { color:#b6c9d1; font-size:var(--text-caption); margin:.65rem 0 0; }
.decision-choices { display:grid; gap:.45rem; }
.decision-choice { display:grid; gap:.2rem; text-align:start; padding:.55rem .7rem; white-space:normal; }
.decision-choice small { color:#bbcbd2; font-size:var(--text-caption); font-weight:400; line-height:1.4; }
</style>
