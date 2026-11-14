<script setup lang="ts">
import {nextTurnCount} from '../utils/turnSelection'
import {turnReview} from '../utils/turnReview'
const props=defineProps<{game:any;command:any;busy:boolean;locked:boolean;turns:number;stop:boolean;pending:boolean;result:any;error:string}>()
const emit=defineEmits(['advance','resume','cancel','navigate','update:turns','update:stop','height'])
const reviewOpen=ref(false),reviewDialog=ref<HTMLDialogElement|null>(null)
const expanded=ref(false),element=ref<HTMLElement|null>(null)
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
const orders=computed(()=>props.command?.pendingOrders??[]),agenda=computed(()=>props.command?.agenda??[])
const decisions=computed(()=>props.command?.alerts?.filter((a:any)=>a.id==='decisions')??[])
const suggestedTurns=computed(()=>nextTurnCount(props.game.currentTurn,props.command))
const review=computed(()=>turnReview(props.game.currentTurn,props.turns,props.command))
const forecast=computed(()=>review.value.forecast)
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
const turnOptions=computed(()=>[...new Set([1,4,28,suggestedTurns.value,props.turns])].sort((a,b)=>a-b))
function turnLabel(n:number){return n===1?'1 turno · 6h':n===4?'4 turnos · 1 dia':n===28?'28 turnos · 1 semana':n+' turnos · '+n*6+'h'}
watch(()=>[props.game.id,props.game.currentTurn,props.command,props.pending],()=>{if(props.command&&!props.pending)emit('update:turns',suggestedTurns.value)},{immediate:true})
let observer:ResizeObserver|undefined
onMounted(()=>{observer=new ResizeObserver(entries=>emit('height',Math.ceil(entries[0].contentRect.height)+16));if(element.value)observer.observe(element.value)})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template>
<section ref="element" class="turn-dock" aria-label="Planejamento e passagem de turno">
 <div class="turn-dock-inner">
  <button class="agenda-toggle" :aria-expanded="expanded" aria-controls="turn-agenda" @click="expanded=!expanded"><span><strong>Agenda e previsão</strong><small>{{[orders.length?orders.length+' para confirmar':'',agenda.length?agenda.length+' '+(agenda.length===1?'prazo':'prazos'):''].filter(Boolean).join(' · ')||'Sem ordens pendentes'}}</small></span><span aria-hidden="true">{{expanded?'⌄':'⌃'}}</span></button>
  <div v-if="expanded" id="turn-agenda" class="turn-agenda">
   <section class="order-group"><h2>Para confirmar <span>{{orders.length}}</span></h2><p v-if="!orders.length" class="agenda-empty">Nenhuma ordem planejada.</p><p v-else class="agenda-help">As ordens entram em execução no início do avanço. Esse primeiro turno já conta para os prazos. Nada foi cobrado. Remova uma ordem para desfazer; para alterá-la, remova e agende novamente.</p><article v-for="order in orders" :key="order.id" class="queued-order"><div><strong>{{order.title}}</strong><small>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}}</small><small>{{order.previewText||'O primeiro avanço já conta para a execução.'}}</small></div><button class="secondary" :disabled="busy||locked||pending" :aria-label="'Remover ordem: '+order.title" @click="emit('cancel',order.id)">Remover</button></article></section>
   <section v-if="decisions.length" class="order-group requires-action"><h2>Requer ação</h2><button v-for="decision in decisions" :key="decision.id" class="agenda-link" :disabled="busy||locked" @click="openDestination(decision.tab)">{{decision.title}} →</button><p>Respostas são registradas imediatamente. A execução ocorre no próximo período.</p></section>
   <section v-if="forecast" class="order-group"><p class="forecast-balance">Saldo previsto: <strong>{{money(forecast.cashAfterObligationsCents)}}</strong></p><h2>Compromissos até o turno {{forecast.throughTurn}}</h2><p>Salários {{money(forecast.salaryCents)}} · sede {{money(forecast.headquartersCents)}} · dívidas {{money(forecast.debtCents)}} · devoluções {{money(forecast.refundCents)}}.</p><p>Considera o plano atual e despesas conhecidas. Receitas futuras de missões não entram na estimativa. O lote pode parar antes.</p></section>
   <section class="order-group"><h2>Em andamento <span>{{agenda.length}}</span></h2><p v-if="!agenda.length" class="agenda-empty">Nenhuma atividade ou prazo ativo.</p><button v-for="item in agenda" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="openDestination(item.tab)"><span>{{item.title}}</span><strong>{{Math.max(0,item.dueTurn-game.currentTurn)}} {{Math.max(0,item.dueTurn-game.currentTurn)===1?'turno':'turnos'}}</strong></button><p v-if="agenda.length" class="agenda-help">Prazos de missão são estimativas da próxima etapa. Salários e vínculos aparecem como compromissos.</p></section>
   <label class="check"><input type="checkbox" :checked="stop" :disabled="busy||locked||pending" @change="emit('update:stop',($event.target as HTMLInputElement).checked)"> Interromper lote em evento importante</label>
  </div>
  <p v-if="error" class="dock-error" role="alert">{{error}}</p>
  <p v-if="command?.planningError" class="dock-error">{{command.planningError}}</p>
  <div class="dock-controls"><label><span class="sr-only">Quantidade de turnos</span><select :value="turns" :disabled="busy||locked||pending" @change="emit('update:turns',Number(($event.target as HTMLSelectElement).value))"><option v-for="n in turnOptions" :key="n" :value="n">{{turnLabel(n)}}</option></select></label><button class="primary" :disabled="blocked" @click="requestAdvance">{{busy?'Processando…':result?.status==='failed'?'Retomar lote':pending?'Consultar avanço':review.label}}</button></div>
 </div>
 <dialog ref="reviewDialog" class="turn-review" aria-labelledby="turn-review-title" @cancel="reviewOpen=false" @close="reviewOpen=false">
  <header class="turn-review-heading"><div><span class="eyebrow">REVISÃO DO AVANÇO</span><h2 id="turn-review-title">Avançar {{review.duration}}?</h2><p>Turno {{game.currentTurn}} → {{review.throughTurn}} · {{turns}} {{turns===1?'turno':'turnos'}}</p></div><button class="secondary" autofocus aria-label="Fechar revisão do avanço" @click="reviewOpen=false">✕</button></header>
  <div class="turn-review-body">
   <section><h3>Ao confirmar</h3><p v-if="!orders.length">Nenhuma ordem nova. Atividades e prazos da campanha avançam normalmente.</p><p v-else>{{orders.length}} {{orders.length===1?'ordem entra':'ordens entram'}} em execução no início. O primeiro turno já conta para os prazos.</p><ul class="review-orders"><li v-for="order in orders" :key="order.id"><strong>{{order.title}}</strong><span>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}}</span><small>{{order.previewText}}</small></li></ul>
    <dl v-if="orders.length" class="review-money"><div><dt>Despesas das ordens</dt><dd>{{money(command.plannedExpensesCents||0)}}</dd></div><div v-if="command.plannedIncomeCents"><dt>Receitas líquidas das ordens</dt><dd>{{money(command.plannedIncomeCents)}}</dd></div><div><dt>Saldo após ordens</dt><dd>{{money(command.projectedCashCents)}}</dd></div></dl>
   </section>
   <section><h3>Compromissos até o turno {{review.throughTurn}}</h3><template v-if="forecast"><dl class="review-money"><div><dt>Salários</dt><dd>{{money(forecast.salaryCents)}}</dd></div><div><dt>Sede</dt><dd>{{money(forecast.headquartersCents)}}</dd></div><div v-if="forecast.debtCents"><dt>Dívidas</dt><dd>{{money(forecast.debtCents)}}</dd></div><div v-if="forecast.refundCents"><dt>Devoluções de adiantamentos</dt><dd>{{money(forecast.refundCents)}}</dd></div><div class="review-total"><dt>Saldo previsto ao final</dt><dd>{{money(forecast.cashAfterObligationsCents)}}</dd></div></dl><p v-if="forecast.cashAfterObligationsCents<0" class="review-warning">O saldo previsto fica negativo. Revise o plano e os compromissos antes de avançar.</p></template><p v-else>Previsão financeira indisponível. Confira o caixa e os compromissos em Finanças.</p><p class="form-hint">Inclui ordens e despesas conhecidas. Resultados e receitas futuras de missões não entram na estimativa.</p></section>
   <section v-if="review.milestones.length"><h3>Prazos neste intervalo</h3><ul class="review-milestones"><li v-for="item in review.milestones" :key="item.id" :class="{'review-warning':item.requiresAction}"><strong>{{item.title}}</strong><span>Turno {{item.dueTurn}}<template v-if="item.requiresAction"> · exige ação</template></span></li></ul><p>Etapas de missão são estimativas. Decisões vencidas podem aplicar a política automática.</p></section>
   <section v-if="decisions.length" class="review-warning"><h3>Há decisões pendentes</h3><p>Avançar pode atingir o prazo e aplicar a resposta automática. Consulte a agenda para resolver antes.</p></section>
   <label class="check"><input type="checkbox" :checked="stop" :disabled="busy||locked||pending" @change="emit('update:stop',($event.target as HTMLInputElement).checked)"> Interromper em evento importante</label><p class="form-hint">O avanço pode parar antes do período escolhido. O tempo só passa após sua confirmação.</p>
  </div>
  <div class="turn-review-actions"><button class="secondary" :disabled="busy" @click="reviewOpen=false">Voltar ao plano</button><button class="primary" :disabled="blocked" @click="confirmAdvance">{{orders.length?'Confirmar ordens e avançar':'Confirmar avanço'}}</button></div>
 </dialog>
</section>
</template>
