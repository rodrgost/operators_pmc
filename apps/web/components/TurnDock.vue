<script setup lang="ts">
import {nextAdvance} from '../utils/turnSelection'
import {turnReview} from '../utils/turnReview'
import {campaignDay,campaignDayOffset,campaignDuration,campaignHour,campaignTimeAt} from '../../../packages/rules/campaign-time'
import {formatCampaignTurn} from '../utils/campaignTime'
import {rules} from '../../../packages/rules'
const props=defineProps<{game:any;command:any;busy:boolean;locked:boolean;turns:number;stop:boolean;pending:boolean;result:any;hasInterruptedDecision?:boolean;error:string}>()
const emit=defineEmits(['advance','resume','cancel','navigate','open-decision','update:turns','update:stop','height'])
const reviewOpen=ref(false),reviewDialog=ref<HTMLDialogElement|null>(null)
const expanded=ref(false),element=ref<HTMLElement|null>(null)
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
type AgendaItem={id:string;title:string;dueTurn:number;tab:string;requiresAction?:boolean}
const orders=computed(()=>props.command?.pendingOrders??[])
const agenda=computed<AgendaItem[]>(()=>props.command?.agenda??[])
const decisions=computed(()=>props.command?.alerts?.filter((a:any)=>a.id==='decisions')??[])
const suggestion=computed(()=>nextAdvance(props.game.currentTurn,props.command))
const review=computed(()=>turnReview(props.game.currentTurn,props.turns,props.command))
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
 for(const item of [...agenda.value].sort((a,b)=>a.dueTurn-b.dueTurn)){
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
function confirmAdvance(){if(blocked.value||!reviewOpen.value)return;reviewOpen.value=false;expanded.value=false;emit('advance')}
function openDestination(destination:string){expanded.value=false;emit('navigate',destination)}
watch(reviewOpen,async value=>{await nextTick();if(value&&!reviewDialog.value?.open)reviewDialog.value?.showModal();else if(!value&&reviewDialog.value?.open)reviewDialog.value.close()})
watch(()=>[props.game.id,props.game.stateVersion,props.turns,props.command],()=>{reviewOpen.value=false})
const fixedDurations=[1,24/rules.hoursPerTurn,rules.turnsPerWeek]
const turnOptions=computed(()=>[...new Set([...fixedDurations,suggestion.value.turns,props.turns])].sort((a,b)=>a-b))
function turnLabel(turns:number){
 if(!fixedDurations.includes(turns)&&turns===suggestion.value.turns&&suggestion.value.item)return 'Até '+dateAt(props.game.currentTurn+turns)
 return campaignDuration(turns)
}
const advanceReason=computed(()=>{
 const next=suggestion.value
 if(next.turns!==props.turns||!next.item?.title)return ''
 const destination='Até '+dateAt(props.game.currentTurn+next.turns)
 if(next.beforeDeadline)return destination+' · Você terá '+campaignDuration(1)+' para agir · '+next.item.title
 if(next.item.requiresAction)return destination+' · Prazo para agir · '+next.item.title
 if(orders.value.includes(next.item))return destination+' · Se confirmar a ordem · '+next.item.title
 return destination+' · '+next.item.title
})
watch(()=>[props.game.id,props.game.currentTurn,props.command,props.pending],()=>{if(props.command&&!props.pending)emit('update:turns',suggestion.value.turns)},{immediate:true})
let observer:ResizeObserver|undefined
onMounted(()=>{observer=new ResizeObserver(entries=>emit('height',Math.ceil(entries[0].contentRect.height)+16));if(element.value)observer.observe(element.value)})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template>
<section ref="element" class="turn-dock" aria-label="Planejamento e avanço do tempo">
 <div class="turn-dock-inner">
  <button class="agenda-toggle" :aria-expanded="expanded" aria-controls="turn-agenda" @click="expanded=!expanded"><span><strong>Agenda e previsão</strong><small>{{[orders.length?orders.length+' para confirmar':'',agenda.length?agenda.length+' '+(agenda.length===1?'compromisso':'compromissos'):''].filter(Boolean).join(' · ')||'Sem ordens pendentes'}}</small></span><span aria-hidden="true">{{expanded?'⌄':'⌃'}}</span></button>
  <div v-if="expanded" id="turn-agenda" class="turn-agenda">
   <section class="order-group"><h2>Para confirmar <span>{{orders.length}}</span></h2><p v-if="!orders.length" class="agenda-empty">Nenhuma ordem planejada.</p><p v-else class="agenda-help">As ordens entram em execução no início do avanço. As primeiras 6h já contam para os prazos. Nada foi cobrado. Remova uma ordem para desfazer; para alterá-la, remova e agende novamente.</p><article v-for="order in orders" :key="order.id" class="queued-order"><div><strong>{{order.title}}</strong><small>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}}</small><small>{{order.previewText||'O primeiro avanço já conta para a execução.'}}</small></div><button class="secondary" :disabled="busy||locked||pending" :aria-label="'Remover ordem: '+order.title" @click="emit('cancel',order.id)">Remover</button></article></section>
   <section v-if="decisions.length" class="order-group requires-action"><h2>Requer ação</h2><button v-for="decision in decisions" :key="decision.id" class="agenda-link" :disabled="busy||locked" @click="openDestination(decision.tab)">{{decision.title}} →</button><p>Respostas são registradas imediatamente. A execução ocorre no próximo período.</p></section>
   <section class="order-group">
    <h2>Próximos compromissos</h2>
    <p v-if="!agenda.length" class="agenda-empty">Nenhum compromisso na agenda.</p>
    <div v-for="day in agendaDays" :key="day.title" class="agenda-day">
     <h3>{{day.title}}</h3>
     <button v-for="item in day.items" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="openDestination(item.tab)">
      <span>{{item.title}}</span><strong :class="{'review-warning':item.requiresAction}">{{eventTiming(item)}}</strong>
     </button>
    </div>
   </section>
   <label class="check"><input type="checkbox" :checked="stop" :disabled="busy||locked||pending" @change="emit('update:stop',($event.target as HTMLInputElement).checked)"> Interromper lote em evento importante</label>
  </div>
  <div v-if="result?.reason==='critical_decision'" class="dock-interruption">
   <p role="status">Avanço interrompido em {{dateAt(result.currentTurn)}} por uma decisão da equipe.</p>
   <button v-if="hasInterruptedDecision" type="button" class="secondary" :disabled="busy||locked" @click="emit('open-decision')">Ver decisão</button>
  </div>
  <p v-if="error" class="dock-error" role="alert">{{error}}</p>
  <p v-if="command?.planningError" class="dock-error">{{command.planningError}}</p>
  <div class="dock-controls"><label><span class="sr-only">Período de avanço</span><select :value="turns" :disabled="busy||locked||pending" @change="emit('update:turns',Number(($event.target as HTMLSelectElement).value))"><option v-for="n in turnOptions" :key="n" :value="n">{{turnLabel(n)}}</option></select></label><button class="primary" :disabled="blocked" @click="requestAdvance">{{busy?'Processando…':result?.status==='failed'?'Retomar lote':pending?'Consultar avanço':review.label}}</button></div>
  <p v-if="advanceReason&&!pending&&result?.status!=='failed'" class="advance-reason">{{advanceReason}}</p>
 </div>
 <dialog ref="reviewDialog" class="turn-review" aria-labelledby="turn-review-title" @cancel="reviewOpen=false" @close="reviewOpen=false">
  <header class="turn-review-heading"><div><span class="eyebrow">REVISÃO DO AVANÇO</span><h2 id="turn-review-title">Avançar {{review.duration}}?</h2><p>{{dateAt(game.currentTurn)}} → {{dateAt(review.throughTurn)}}</p></div><button class="secondary" autofocus aria-label="Fechar revisão do avanço" @click="reviewOpen=false">✕</button></header>
  <div class="turn-review-body">
   <section><h3>Ao confirmar</h3><p v-if="!orders.length">Nenhuma ordem nova. Atividades e prazos da campanha avançam normalmente.</p><p v-else>{{orders.length}} {{orders.length===1?'ordem entra':'ordens entram'}} em execução no início. As primeiras 6h já contam para os prazos.</p><ul class="review-orders"><li v-for="order in orders" :key="order.id"><strong>{{order.title}}</strong><span>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}}</span><small>{{order.previewText}}</small></li></ul>
    <dl v-if="orders.length" class="review-money"><div><dt>Despesas das ordens</dt><dd>{{money(command.plannedExpensesCents||0)}}</dd></div><div v-if="command.plannedIncomeCents"><dt>Receitas líquidas das ordens</dt><dd>{{money(command.plannedIncomeCents)}}</dd></div><div><dt>Saldo após ordens</dt><dd>{{money(command.projectedCashCents)}}</dd></div></dl>
   </section>
   <section v-if="review.startingActivities.length"><h3>Atividades a iniciar com o avanço</h3><p>Você pode desfazer essas atividades em Operadores antes de avançar.</p><ul class="review-milestones"><li v-for="item in review.startingActivities" :key="item.id"><strong>{{item.title}}</strong><span>Conclusão prevista para {{dateAt(item.dueTurn)}}</span></li></ul></section>
   <section><h3>Compromissos até {{dateAt(review.throughTurn)}}</h3><template v-if="forecast"><dl class="review-money"><div><dt>Salários</dt><dd>{{money(forecast.salaryCents)}}</dd></div><div><dt>Sede</dt><dd>{{money(forecast.headquartersCents)}}</dd></div><div v-if="forecast.debtCents"><dt>Dívidas</dt><dd>{{money(forecast.debtCents)}}</dd></div><div v-if="forecast.refundCents"><dt>Devoluções de adiantamentos</dt><dd>{{money(forecast.refundCents)}}</dd></div><div class="review-total"><dt>Saldo previsto ao final</dt><dd>{{money(forecast.cashAfterObligationsCents)}}</dd></div></dl><p v-if="forecast.cashAfterObligationsCents<0" class="review-warning">O saldo previsto fica negativo. Revise o plano e os compromissos antes de avançar.</p></template><p v-else>Previsão financeira indisponível. Confira o caixa e os compromissos em Finanças.</p><p class="form-hint">Inclui ordens e despesas conhecidas. Resultados e receitas futuras de missões não entram na estimativa.</p></section>
   <section v-if="review.milestones.length"><h3>Eventos neste intervalo</h3><ul class="review-milestones"><li v-for="item in review.milestones" :key="item.id" :class="{'review-warning':item.requiresAction}"><strong>{{item.title}}</strong><span>{{eventTiming(item,true)}}</span></li></ul><p>Etapas de missão são estimativas. Decisões vencidas podem aplicar a política automática.</p></section>
   <p v-if="advanceReason" class="form-hint">{{advanceReason}}</p>
   <section v-if="decisions.length" class="review-warning"><h3>Há decisões pendentes</h3><p>Avançar pode atingir o prazo e aplicar a resposta automática. Consulte a agenda para resolver antes.</p></section>
   <label class="check"><input type="checkbox" :checked="stop" :disabled="busy||locked||pending" @change="emit('update:stop',($event.target as HTMLInputElement).checked)"> Interromper em evento importante</label><p class="form-hint">O avanço pode parar antes do período escolhido. O tempo só passa após sua confirmação.</p>
  </div>
  <div class="turn-review-actions"><button class="secondary" :disabled="busy" @click="reviewOpen=false">Voltar ao plano</button><button class="primary" :disabled="blocked" @click="confirmAdvance">{{orders.length?'Confirmar ordens e avançar':'Confirmar avanço'}}</button></div>
 </dialog>
</section>
</template>

<style scoped>
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
.agenda-day h3 {
 margin: .65rem 0 .2rem;
 font-size: var(--text-caption);
}
.agenda-day .agenda-link > strong.review-warning {
 color: #e9ac64;
}
.advance-reason {
 margin: .45rem 0 0;
 font-size: var(--text-caption);
 color: #c5d0d6;
}
.turn-dock .dock-controls > label {
 width: clamp(150px, 48%, 245px);
}
</style>
