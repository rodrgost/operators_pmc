<script setup lang="ts">
const props=defineProps<{game:any;command:any;busy:boolean;locked:boolean;turns:number;stop:boolean;pending:boolean;result:any;error:string}>()
const emit=defineEmits(['advance','resume','cancel','navigate','update:turns','update:stop','height'])
const expanded=ref(false),element=ref<HTMLElement|null>(null)
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
const orders=computed(()=>props.command?.pendingOrders??[]),agenda=computed(()=>props.command?.agenda??[])
const decisions=computed(()=>props.command?.alerts?.filter((a:any)=>a.id==='decisions')??[])
let observer:ResizeObserver|undefined
onMounted(()=>{observer=new ResizeObserver(entries=>emit('height',Math.ceil(entries[0].contentRect.height)+16));if(element.value)observer.observe(element.value)})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template>
<section ref="element" class="turn-dock" aria-label="Planejamento e passagem de turno">
 <div class="turn-dock-inner">
  <button class="agenda-toggle" :aria-expanded="expanded" aria-controls="turn-agenda" @click="expanded=!expanded"><span><strong>Ações agendadas</strong><small>{{orders.length}} para confirmar · {{agenda.length}} em andamento</small></span><span aria-hidden="true">{{expanded?'⌄':'⌃'}}</span></button>
  <div v-if="expanded" id="turn-agenda" class="turn-agenda">
   <section class="order-group"><h2>Para confirmar <span>{{orders.length}}</span></h2><p v-if="!orders.length" class="agenda-empty">Nenhuma ordem planejada.</p><p v-else class="agenda-help">Nada foi cobrado. Remova uma ordem para desfazer; para alterá-la, remova e agende novamente.</p><article v-for="order in orders" :key="order.id" class="queued-order"><div><strong>{{order.title}}</strong><small>{{order.costCents>0?money(order.costCents)+' ao confirmar':order.costCents<0?money(-order.costCents)+' de saldo líquido previsto':'Sem custo imediato'}} · próximo turno</small></div><button class="secondary" :disabled="busy||locked||pending" :aria-label="'Remover ordem: '+order.title" @click="emit('cancel',order.id)">Remover</button></article></section>
   <section v-if="decisions.length" class="order-group requires-action"><h2>Requer ação</h2><button v-for="decision in decisions" :key="decision.id" class="agenda-link" :disabled="busy||locked" @click="emit('navigate',decision.tab)">{{decision.title}} →</button><p>Respostas também serão confirmadas ao passar o turno.</p></section>
   <section class="order-group"><h2>Em andamento <span>{{agenda.length}}</span></h2><p v-if="!agenda.length" class="agenda-empty">Nenhuma atividade ou prazo ativo.</p><button v-for="item in agenda" :key="item.id" class="agenda-link" :disabled="busy||locked" @click="emit('navigate',item.tab)"><span>{{item.title}}</span><strong>{{Math.max(0,item.dueTurn-game.currentTurn)}} {{Math.max(0,item.dueTurn-game.currentTurn)===1?'turno':'turnos'}}</strong></button><p v-if="agenda.length" class="agenda-help">Prazos de missão são estimativas da próxima etapa. Salários e vínculos aparecem como compromissos.</p></section>
   <label class="check"><input type="checkbox" :checked="stop" :disabled="busy||locked||pending" @change="emit('update:stop',($event.target as HTMLInputElement).checked)"> Interromper lote em evento importante</label>
  </div>
  <p v-if="error" class="dock-error" role="alert">{{error}}</p>
  <p v-if="orders.length" class="commit-hint">{{orders.length}} {{orders.length===1?'ordem será confirmada':'ordens serão confirmadas'}} no primeiro turno do lote.</p>
  <div class="dock-controls"><label><span class="sr-only">Quantidade de turnos</span><select :value="turns" :disabled="busy||locked||pending" @change="emit('update:turns',Number(($event.target as HTMLSelectElement).value))"><option :value="1">1 turno · 6h</option><option :value="4">4 turnos · 1 dia</option><option :value="28">28 turnos · 1 semana</option></select></label><button class="primary" :disabled="busy||locked" @click="result?.status==='failed'?emit('resume'):emit('advance')">{{busy?'Processando…':result?.status==='failed'?'Retomar lote':pending?'Repetir requisição':'Passar turno →'}}</button></div>
 </div>
</section>
</template>
