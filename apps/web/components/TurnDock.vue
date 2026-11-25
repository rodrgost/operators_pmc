<script setup lang="ts">
import {nextAdvance} from '../utils/turnSelection'
import {turnReview} from '../utils/turnReview'
import {campaignDay,campaignDayOffset,campaignDuration,campaignHour,campaignTimeAt} from '../../../packages/rules/campaign-time'
import {formatCampaignTurn} from '../utils/campaignTime'
import {rules} from '../../../packages/rules'
import type {AgendaItem} from '../utils/agendaItem'
const props=defineProps<{game:any;command:any;busy:boolean;locked:boolean;turns:number;stop:boolean;pending:boolean;result:any;hasInterruptedDecision?:boolean;error:string}>()
const emit=defineEmits(['advance','resume','cancel','open-item','open-decision','update:turns','update:stop'])
const reviewOpen=ref(false),reviewDialog=ref<HTMLDialogElement|null>(null)
const agendaOpen=defineModel<boolean>('agendaOpen')
const agendaView=ref<'list'|'week'>('list')
const showFinancialEvents=ref(false)
const agendaPreferenceKey='operators-agenda-show-financial-events'
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
const orders=computed(()=>props.command?.pendingOrders??[])
const agenda=computed<AgendaItem[]>(()=>{
 const items:AgendaItem[]=props.command?.agenda??[]
 return showFinancialEvents.value?items:items.filter(item=>item.tab!=='finance')
})
onMounted(()=>{
 try{showFinancialEvents.value=localStorage.getItem(agendaPreferenceKey)==='true'}catch{}
})
function setShowFinancialEvents(show:boolean){
 showFinancialEvents.value=show
 try{localStorage.setItem(agendaPreferenceKey,String(show))}catch{}
}
const deadlines=computed(()=>agenda.value.filter(item=>item.requiresAction))
const upcoming=computed(()=>agenda.value.filter(item=>!item.requiresAction))
const suggestion=computed(()=>nextAdvance(props.game.currentTurn,props.command))
const review=computed(()=>turnReview(props.game.currentTurn,props.turns,props.command))
const milestones=computed<AgendaItem[]>(()=>review.value.milestones)
const expiring=computed(()=>milestones.value.filter(item=>item.requiresAction))
const otherMilestones=computed(()=>milestones.value.filter(item=>!item.requiresAction))
const forecast=computed(()=>review.value.forecast)
const today=computed(()=>new Date(props.game.date))
const timeAt=(turn:number)=>campaignTimeAt(props.game.date,props.game.currentTurn,turn)
const dateAt=(turn:number)=>formatCampaignTurn(props.game,turn)
function eventTiming(item:AgendaItem,absolute=false){
 const date=timeAt(item.dueTurn)
 const time=absolute||!Number.isFinite(date.getTime())?dateAt(item.dueTurn):campaignHour(date)
 if(item.requiresAction)return 'Até '+time
 if(item.id.startsWith('mission-')||item.id.startsWith('activity-'))return 'Previsto para '+time
 return time
}
const agendaDays=computed(()=>{
 const days=new Map<number,{title:string;items:AgendaItem[]}>()
 for(const item of [...upcoming.value].sort((a,b)=>a.dueTurn-b.dueTurn)){
  const date=timeAt(item.dueTurn)
  const offset=campaignDayOffset(date,today.value)
  let day=days.get(offset)
  if(!day){
   const title=offset===0?'Hoje':offset===1?'Amanhã':Number.isFinite(offset)?campaignDay(date):'Data indisponível'
   day={title,items:[]}
   days.set(offset,day)
  }
  day.items.push(item)
 }
 return [...days.values()]
})
const blocked=computed(()=>props.busy||props.locked||(!props.pending&&props.result?.status!=='failed'&&!!props.command?.planningError))
function requestAdvance(){
 if(blocked.value)return
 if(props.result?.status==='failed'){emit('resume');return}
 if(props.pending){emit('advance');return}
 if(review.value.requiresReview)reviewOpen.value=true
 else emit('advance')
}
function confirmAdvance(){if(blocked.value||!reviewOpen.value)return;reviewOpen.value=false;emit('advance')}
function reviewFromAgenda(){
 if(blocked.value||props.pending||props.result?.status==='failed')return
 agendaOpen.value=false
 reviewOpen.value=true
}
function openItem(item:AgendaItem){agendaOpen.value=false;reviewOpen.value=false;emit('open-item',item)}
watch(reviewOpen,async value=>{await nextTick();if(value&&!reviewDialog.value?.open)reviewDialog.value?.showModal();else if(!value&&reviewDialog.value?.open)reviewDialog.value.close()})
watch(()=>[props.game.id,props.game.stateVersion,props.turns,props.command],()=>{reviewOpen.value=false})
const fixedDurations=[1,24/rules.hoursPerTurn,rules.turnsPerWeek]
const turnOptions=computed(()=>[...new Set([...fixedDurations,suggestion.value.turns,props.turns])].sort((a,b)=>a-b))
function turnLabel(turns:number){
 if(turns===suggestion.value.turns&&suggestion.value.item)return 'Até '+dateAt(props.game.currentTurn+turns)
 return campaignDuration(turns)
}
const advanceReason=computed(()=>{
 const next=suggestion.value
 if(next.turns!==props.turns||!next.item?.title)return ''
 if(!showFinancialEvents.value&&next.item.tab==='finance')return ''
 if(next.beforeDeadline)return 'Você terá '+campaignDuration(1)+' para agir · '+next.item.title
 if(next.item.requiresAction)return 'Prazo para agir · '+next.item.title
 if(orders.value.includes(next.item))return 'Se confirmar a ordem · '+next.item.title
 return 'Próximo compromisso · '+next.item.title
})
const advanceReasonIcon=computed(()=>{
 const item=suggestion.value.item
 return item?.tab==='finance'&&!showFinancialEvents.value?undefined:item?.labelIcon
})
watch(()=>[props.game.id,props.game.currentTurn,props.command,props.pending],()=>{if(props.command&&!props.pending)emit('update:turns',suggestion.value.turns)},{immediate:true})
</script>
<template>
<section class="turn-dock" aria-label="Planejamento e avanço do tempo">
 <div class="turn-dock-inner">
  <div v-if="result?.reason==='critical_decision'&&hasInterruptedDecision" class="dock-interruption">
   <p role="status">Avanço interrompido por uma decisão.</p>
   <button type="button" class="secondary action-block" :disabled="busy||locked" @click="emit('open-decision')">Ver decisão</button>
  </div>
  <p v-if="error||command?.planningError" class="dock-error" role="alert">{{error||command.planningError}}</p>
  <div class="dock-row action-row">
   <button type="button" class="secondary dock-agenda" aria-haspopup="dialog" :aria-expanded="agendaOpen" @click="agendaOpen=true">
    Agenda <span v-if="deadlines.length" class="agenda-count" :aria-label="deadlines.length+' pendências com prazo'">{{deadlines.length}}</span>
   </button>
   <button type="button" class="primary" :disabled="blocked" @click="requestAdvance">{{busy?'Processando…':locked?'Ordem pendente':result?.status==='failed'?'Retomar lote':pending?'Consultar avanço':review.label}}</button>
  </div>
 </div>
 <FocusDialog v-if="agendaOpen" title="Agenda" :error="error" @close="agendaOpen=false">
  <div class="agenda-screen">
   <section v-if="deadlines.length" class="order-group requires-action">
    <h3>Requer ação · {{deadlines.length}}</h3>
    <button v-for="item in deadlines" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="openItem(item)">
     <span><GameLabel v-bind="item.labelIcon" :label="item.title" /></span><strong>{{eventTiming(item,true)}}</strong>
    </button>
   </section>
   <section v-if="orders.length" class="order-group">
    <h3>Ordens para confirmar · {{orders.length}}</h3>
    <article v-for="order in orders" :key="order.id" class="queued-order">
     <div>
      <strong><GameLabel v-bind="order.labelIcon" :label="order.title" /></strong>
      <small>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}}</small>
      <small v-if="order.previewText">{{order.previewText}}</small>
     </div>
     <button class="secondary action-block" :disabled="busy||locked||pending" :aria-label="'Remover ordem: '+order.title" @click="emit('cancel',order.id)">Remover</button>
    </article>
   </section>
   <details class="agenda-settings" open>
    <summary>Avanço do tempo</summary>
    <label class="personnel-label">Período
     <select :value="turns" :disabled="busy||locked||pending" @change="emit('update:turns',Number(($event.target as HTMLSelectElement).value))">
      <option v-for="n in turnOptions" :key="n" :value="n">{{turnLabel(n)}}</option>
     </select>
    </label>
    <p v-if="advanceReason&&!pending&&result?.status!=='failed'" class="agenda-help"><GameLabel v-bind="advanceReasonIcon" :label="advanceReason" /></p>
    <label class="check"><input type="checkbox" :checked="stop" :disabled="busy||locked||pending" @change="emit('update:stop',($event.target as HTMLInputElement).checked)"> Interromper em ocorrência importante de missão</label>
    <button type="button" class="secondary agenda-review action-block" :disabled="blocked||pending||result?.status==='failed'" @click="reviewFromAgenda">Revisar avanço</button>
   </details>
   <section class="order-group">
    <div class="agenda-heading">
     <h3>Próximos compromissos</h3>
     <div class="agenda-views action-row" role="group" aria-label="Visualização da agenda">
      <button type="button" class="secondary" :aria-pressed="agendaView==='list'" @click="agendaView='list'">Lista</button>
      <button type="button" class="secondary" :aria-pressed="agendaView==='week'" @click="agendaView='week'">Semana</button>
     </div>
    </div>
    <label class="check agenda-finance"><input type="checkbox" :checked="showFinancialEvents" @change="setShowFinancialEvents(($event.target as HTMLInputElement).checked)"> Exibir eventos financeiros</label>
    <AgendaWeek v-if="agendaView==='week'" :game="game" :items="agenda" v-slot="{items}">
     <button v-for="item in items" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="openItem(item)">
      <span><GameLabel v-bind="item.labelIcon" :label="item.title" /></span><strong :class="{'review-warning':item.requiresAction}">{{eventTiming(item)}}</strong>
     </button>
    </AgendaWeek>
    <template v-else>
     <p v-if="!upcoming.length" class="agenda-empty">Nenhum outro compromisso visível.</p>
     <div v-for="day in agendaDays" :key="day.title" class="agenda-day">
      <h4>{{day.title}}</h4>
      <button v-for="item in day.items" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="openItem(item)">
       <span><GameLabel v-bind="item.labelIcon" :label="item.title" /></span><strong>{{eventTiming(item)}}</strong>
      </button>
     </div>
    </template>
   </section>
  </div>
 </FocusDialog>
 <dialog ref="reviewDialog" class="turn-review" aria-labelledby="turn-review-title" @cancel="reviewOpen=false" @close="reviewOpen=false">
  <header class="turn-review-heading">
   <div><h2 id="turn-review-title">Avançar {{review.duration}}?</h2><p>{{dateAt(game.currentTurn)}} → {{dateAt(review.throughTurn)}}</p></div>
   <button class="secondary" autofocus aria-label="Fechar revisão do avanço" @click="reviewOpen=false">✕</button>
  </header>
  <div class="turn-review-body">
   <section class="review-overview" aria-label="Efeitos do avanço">
    <p v-if="orders.length||review.startingActivities.length"><strong>{{orders.length+review.startingActivities.length}}</strong> {{orders.length+review.startingActivities.length===1?'início previsto':'inícios previstos'}}</p>
    <p v-if="forecast" :class="{'review-warning':forecast.cashAfterObligationsCents<0}">Saldo previsto ao final · <strong>{{money(forecast.cashAfterObligationsCents)}}</strong></p>
    <p v-else>Previsão financeira indisponível.</p>
    <p v-if="forecast&&forecast.cashAfterObligationsCents<0" class="review-warning">O saldo previsto fica negativo.</p>
   </section>
   <section v-if="expiring.length" class="review-deadlines">
    <h3>Prazos neste avanço</h3>
    <button v-for="item in expiring" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="openItem(item)">
     <span><GameLabel v-bind="item.labelIcon" :label="item.title" /></span><strong>{{eventTiming(item,true)}}</strong>
    </button>
    <p class="form-hint">Decisões vencidas podem aplicar a resposta automática.</p>
   </section>
   <details v-if="orders.length||review.startingActivities.length" class="review-detail">
    <summary>Ordens e atividades a iniciar</summary>
    <ul v-if="orders.length" class="review-orders">
     <li v-for="order in orders" :key="order.id">
      <strong><GameLabel v-bind="order.labelIcon" :label="order.title" /></strong>
      <span>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}}</span>
      <small v-if="order.previewText">{{order.previewText}}</small>
     </li>
    </ul>
    <ul v-if="review.startingActivities.length" class="review-milestones">
     <li v-for="item in review.startingActivities" :key="item.id"><strong><GameLabel v-bind="item.labelIcon" :label="item.title" /></strong><span>Conclusão prevista para {{dateAt(item.dueTurn)}}</span></li>
    </ul>
    <p class="form-hint">O primeiro período já conta para a execução.</p>
   </details>
   <details v-if="forecast" class="review-detail">
    <summary>Detalhes financeiros</summary>
    <dl class="review-money">
     <div v-if="orders.length"><dt>Despesas das ordens</dt><dd>{{money(command.plannedExpensesCents||0)}}</dd></div>
     <div v-if="command?.plannedIncomeCents"><dt>Receitas líquidas das ordens</dt><dd>{{money(command.plannedIncomeCents)}}</dd></div>
     <div v-if="orders.length"><dt>Saldo após ordens</dt><dd>{{money(command.projectedCashCents)}}</dd></div>
     <div><dt>Salários</dt><dd>{{money(forecast.salaryCents)}}</dd></div>
     <div><dt>Sede</dt><dd>{{money(forecast.headquartersCents)}}</dd></div>
     <div v-if="forecast.debtCents"><dt>Dívidas</dt><dd>{{money(forecast.debtCents)}}</dd></div>
     <div v-if="forecast.refundCents"><dt>Devoluções de adiantamentos</dt><dd>{{money(forecast.refundCents)}}</dd></div>
    </dl>
    <p class="form-hint">Receitas futuras de missões ficam fora da previsão.</p>
   </details>
   <details v-if="otherMilestones.length" class="review-detail">
    <summary>Outros eventos no intervalo</summary>
    <ul class="review-milestones">
     <li v-for="item in otherMilestones" :key="item.id"><strong><GameLabel v-bind="item.labelIcon" :label="item.title" /></strong><span>{{eventTiming(item,true)}}</span></li>
    </ul>
   </details>
  </div>
  <div class="turn-review-actions action-row"><button class="secondary" :disabled="busy" @click="reviewOpen=false">Voltar</button><button class="primary" :disabled="blocked" @click="confirmAdvance">{{orders.length?'Confirmar ordens e avançar':'Confirmar avanço'}}</button></div>
 </dialog>
</section>
</template>

<style scoped>
.turn-dock{padding-top:6px;padding-bottom:6px}
.dock-row{display:flex;align-items:stretch;justify-content:space-between;gap:var(--space-2)}
.dock-row .primary{min-width:0;min-height:48px;padding:8px 12px}
.dock-agenda{display:flex;align-items:center;justify-content:center;gap:6px}
.agenda-count{padding:1px 6px;border-radius:10px;background:var(--command-warning);color:var(--command-bg);font-size:var(--text-caption)}
.agenda-screen{display:grid;gap:var(--space-4)}
.agenda-screen .order-group{margin:0}
.agenda-screen .order-group h3{font-size:var(--text-subtitle)}
.agenda-screen .agenda-link,.agenda-views .secondary{min-height:44px}
.agenda-screen .requires-action .agenda-link strong,.review-deadlines .agenda-link strong{color:var(--command-warning)}
.agenda-settings,.review-detail{border-bottom:1px solid var(--command-line);padding:var(--space-2) 0}
.agenda-settings summary,.review-detail summary{display:list-item;min-height:44px;padding:10px 0;cursor:pointer}
.agenda-settings .personnel-label{margin-bottom:var(--space-2)}
.agenda-review{margin-bottom:var(--space-2)}
.agenda-finance{margin-top:var(--space-2)}
.review-detail .form-hint{margin-bottom:var(--space-2)}
.review-overview p+p{margin-top:var(--space-1)}
.agenda-heading {
 display: flex;
 align-items: center;
 justify-content: space-between;
 flex-wrap: wrap;
 gap: .35rem .75rem;
}
.agenda-views {
 display: flex;
 gap: .25rem;
}
.agenda-views .secondary {
 padding: .35rem .55rem;
 font-size: var(--text-caption);
}
.agenda-views [aria-pressed="true"] {
 background: var(--command-raised);
 border-color: var(--command-info);
}
@media(max-width:640px){.agenda-views{width:100%}}
.dock-interruption {
 display: flex;
 flex-wrap: wrap;
 align-items: center;
 justify-content: space-between;
 gap: .5rem;
}
.dock-interruption p {
 margin: 0;
}
.agenda-day h4 {
 margin: .65rem 0 .2rem;
 font-size: var(--text-caption);
}
.agenda-link > strong.review-warning {
 color: #e9ac64;
}
@media (max-width:999px) {
 .dock-row .primary{font-size:var(--text-body)}
 .dock-agenda{padding-inline:12px}
}
</style>
