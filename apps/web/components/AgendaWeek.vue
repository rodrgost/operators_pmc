<script setup lang="ts">
import {campaignDay} from '../../../packages/rules/campaign-time'

type AgendaEvent={id:string;title:string;dueTurn:number;tab:string;requiresAction?:boolean}
const props=defineProps<{game:{id:string;date:string;currentTurn:number};items:AgendaEvent[]}>()
const weekOffset=ref(0),selectedIndex=ref<number|null>(null)
const days=computed(()=>campaignAgendaWeek(props.game,props.items,weekOffset.value))
const fullDate=new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})
const weekLabel=computed(()=>fullDate.formatRange(days.value[0].date,days.value[6].date))
const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const activeIndex=computed(()=>selectedIndex.value??Math.max(0,days.value.findIndex(day=>weekOffset.value===0?day.isToday:day.items.length>0)))
const activeDay=computed(()=>days.value[activeIndex.value])

function showWeek(offset:number){
 weekOffset.value=offset
 selectedIndex.value=null
}

watch(()=>[props.game.id,props.game.currentTurn],()=>showWeek(0))
</script>

<template>
 <div class="agenda-week">
  <div class="week-navigation">
   <button type="button" class="secondary week-arrow" aria-label="Semana anterior" :disabled="weekOffset===0" @click="showWeek(weekOffset-1)">‹</button>
   <div class="week-range">
    <strong aria-live="polite">{{weekLabel}}</strong>
    <button v-if="weekOffset>0" type="button" class="secondary week-current" @click="showWeek(0)">Semana atual</button>
   </div>
   <button type="button" class="secondary week-arrow" aria-label="Próxima semana" @click="showWeek(weekOffset+1)">›</button>
  </div>
  <div class="week-days" role="group" aria-label="Dias da semana">
   <button v-for="(day,index) in days" :key="day.date.getTime()" type="button" class="secondary week-day"
    :aria-current="day.isToday?'date':undefined" :aria-pressed="activeIndex===index"
    :aria-label="campaignDay(day.date)+' · '+day.items.length+(day.items.length===1?' compromisso':' compromissos')+(day.items.some(item=>item.requiresAction)?' · exige ação':'')"
    @click="selectedIndex=index">
    <span class="week-day-name">{{weekdays[index]}}</span>
    <strong>{{day.date.getUTCDate()}}</strong>
    <span class="week-day-count" :class="{'week-day-action':day.items.some(item=>item.requiresAction)}">{{day.items.length||'–'}}</span>
    <span v-for="item in day.items.slice(0,2)" :key="item.id" class="week-day-preview" aria-hidden="true">{{item.title}}</span>
   </button>
  </div>
  <div class="agenda-day">
   <h3>{{activeDay.isToday?'Hoje · ':''}}{{campaignDay(activeDay.date)}}</h3>
   <slot v-if="activeDay.items.length" :items="activeDay.items" />
   <p v-else class="agenda-empty">Nenhum compromisso visível neste dia.</p>
  </div>
 </div>
</template>

<style scoped>
.week-navigation { display:flex; align-items:center; gap:.5rem; margin:.5rem 0; }
.week-range { flex:1; display:grid; justify-items:center; text-align:center; gap:.25rem; font-size:var(--text-caption); }
.week-arrow { min-width:44px; min-height:44px; padding:0; font-size:1.35rem; }
.week-current { padding:.25rem .55rem; font-size:var(--text-caption); }
.week-days { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:4px; }
.week-day { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:.18rem; min-width:0; min-height:64px; padding:.35rem .1rem; }
.week-day[aria-pressed="true"] { background:var(--command-raised); border-color:var(--command-info); }
.week-day[aria-current="date"] .week-day-name { color:var(--command-info); }
.week-day-name,.week-day-count,.week-day-preview { font-size:var(--text-caption); line-height:1.25; }
.week-day-count { color:#b6c9d1; }
.week-day-action { color:var(--command-warning); font-weight:700; }
.week-day-preview { display:none; }
@media (min-width:900px) {
 .week-day { padding:.4rem .3rem; }
 .week-day-preview { display:block; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; }
}
.agenda-day h3 { margin:.65rem 0 .2rem; font-size:var(--text-caption); }
</style>
