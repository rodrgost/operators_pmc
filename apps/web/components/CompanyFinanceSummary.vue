<script setup lang="ts">
const props=defineProps<{game:any;command:any}>()
const finance=computed(()=>props.command?.finance)
const forecast=computed(()=>props.command?.advanceForecasts?.find((f:any)=>f.turns===28))
const bills=computed<{id:string;title:string;dueTurn:number}[]>(()=>(props.command?.agenda??[]).filter((item:any)=>item.tab==='finance').sort((a:any,b:any)=>a.dueTurn-b.dueTurn))
const nextBill=computed(()=>bills.value[0])
const billsAtNextDue=computed(()=>bills.value.filter(item=>item.dueTurn===nextBill.value?.dueTurn))
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
const runway=computed(()=>{
 const weeks=finance.value?.runwayWeeks
 if(weeks==null)return 'Sem despesas semanais'
 if(weeks===0)return 'Menos de uma semana'
 return weeks===1?'1 semana':weeks+' semanas'
})
</script>

<template>
 <div v-if="finance" class="company-finance">
  <section class="panel finance-overview">
   <div><h2>Saldo disponível</h2><strong class="finance-balance">{{money(game.cashCents)}}</strong></div>
   <dl class="finance-facts">
    <div><dt>Autonomia estimada</dt><dd>{{runway}}</dd></div>
    <div><dt>Despesa semanal</dt><dd>{{money(finance.weeklyTotalCents)}}</dd></div>
   </dl>
   <p v-if="finance.totalArrearsCents" class="purchase-issue">Em atraso · {{money(finance.totalArrearsCents)}}</p>
  </section>
  <section class="panel finance-next-bill">
   <h2>Próxima cobrança</h2>
   <template v-if="nextBill">
    <p><strong>{{formatCampaignTurn(game,nextBill.dueTurn)}}</strong><template v-if="nextBill.dueTurn>game.currentTurn"> · em {{formatCampaignDuration(nextBill.dueTurn-game.currentTurn)}}</template></p>
    <p>{{nextBill.title}}<template v-if="billsAtNextDue.length>1"> · +{{billsAtNextDue.length-1}} no mesmo horário</template></p>
    <details v-if="billsAtNextDue.length>1" class="card-details">
     <summary>Ver cobranças</summary>
     <ul><li v-for="item in billsAtNextDue" :key="item.id">{{item.title}}</li></ul>
    </details>
   </template>
   <p v-else>Nenhuma cobrança prevista.</p>
  </section>
  <section class="panel finance-forecast" aria-labelledby="finance-forecast-title">
   <h2 id="finance-forecast-title">Previsão da próxima semana</h2>
   <p v-if="forecast">Saldo previsto · <strong :class="forecast.cashAfterObligationsCents<0?'debit':''">{{money(forecast.cashAfterObligationsCents)}}</strong></p>
   <p v-else class="form-hint">Previsão indisponível.</p>
   <p v-if="command.planningError" class="purchase-issue">{{command.planningError}}</p>
   <details class="card-details">
    <summary>Despesas e ordens</summary>
    <dl class="review-money">
     <div><dt>Salários semanais</dt><dd>{{money(finance.weeklySalariesCents)}}</dd></div>
     <div><dt>Manutenção semanal da sede</dt><dd>{{money(finance.weeklyInfrastructureCents)}}</dd></div>
     <div><dt>Ordens para confirmar</dt><dd>{{command.pendingOrders?.length||0}}</dd></div>
     <div v-if="command.pendingOrders?.length"><dt>Despesas das ordens</dt><dd>{{money(command.plannedExpensesCents)}}</dd></div>
     <div v-if="command.plannedIncomeCents"><dt>Receitas líquidas das ordens</dt><dd>{{money(command.plannedIncomeCents)}}</dd></div>
     <div v-if="command.pendingOrders?.length"><dt>Saldo após ordens</dt><dd>{{money(command.projectedCashCents)}}</dd></div>
     <div v-if="forecast"><dt>Compromissos até {{formatCampaignTurn(game,forecast.throughTurn)}}</dt><dd>{{money(forecast.obligationsCents)}}</dd></div>
    </dl>
    <p class="form-hint">A autonomia considera o caixa, as dívidas e as despesas atuais. A previsão inclui ordens e despesas conhecidas. Receitas futuras de missões ficam fora da estimativa.</p>
   </details>
  </section>
 </div>
 <p v-else role="status">Carregando resumo financeiro…</p>
</template>

<style scoped>
.company-finance{display:grid;gap:var(--space-3)}
.company-finance .panel{margin:0;padding:var(--space-4)}
.company-finance h2{margin:0 0 var(--space-1);font-size:var(--text-subtitle)}
.finance-balance{font-size:var(--text-title);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.finance-facts{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-5);margin:var(--space-3) 0 0}
.finance-facts dt{color:#b6c9d1;font-size:var(--text-caption)}
.finance-facts dd{margin:0;font-weight:600}
.finance-next-bill p+p{margin-top:var(--space-1)}
.company-finance .card-details{margin-bottom:0}
</style>
