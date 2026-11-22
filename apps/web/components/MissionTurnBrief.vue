<script setup lang="ts">
interface TurnReport {
 id:string
 turn:number
 title:string
 outcome:string
 totalPaidCents?:number
 reputationDelta?:number
 reputationAfter?:number
 paymentCents?:number
}
const props=defineProps<{
 mission:{startedTurn:number;endedTurn:number|null;paidCents:number;recentReports?:TurnReport[]}
 currentTurn:number
 compact?:boolean
}>()
const reports=computed(()=>props.mission.recentReports??[])
const turn=computed(()=>props.mission.endedTurn??props.currentTurn)
const closing=computed(()=>reports.value.find(report=>report.paymentCents!==undefined))
const turnRows=computed(()=>{
 const rows=[{turn:turn.value,label:props.mission.endedTurn===null?'Último turno':'Encerramento'}]
 if(turn.value>0)rows.push({turn:turn.value-1,label:'Turno anterior'})
 const latest=reports.value[0]
 if(latest&&latest.turn<turn.value-1)rows.push({turn:latest.turn,label:'Último registro'})
 return rows.map(row=>({...row,reports:reports.value.filter(report=>report.turn===row.turn).map(report=>({
  id:report.id,title:missionReportTitle(report.title),result:missionReportOutcome(report.outcome),
 }))}))
})
function emptyTurn(at:number){
 if(at<props.mission.startedTurn)return 'Missão ainda não iniciada'
 if(at===props.mission.startedTurn)return 'Missão mobilizada'
 return 'Sem atualização'
}
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'})
const reputation=new Intl.NumberFormat('pt-BR',{signDisplay:'exceptZero'})
</script>

<template>
 <section :class="['turn-brief',{'compact-brief':compact}]" aria-label="Boletim de turnos">
  <dl v-if="!compact&&mission.endedTurn!==null" class="mission-settlement">
   <div>
    <dt>Total recebido</dt>
    <dd>{{money.format((closing?.totalPaidCents??mission.paidCents)/100)}}</dd>
   </div>
   <div>
    <dt>Reputação</dt>
    <dd v-if="closing?.reputationAfter!==undefined">{{closing.reputationAfter}}<small>/100</small></dd>
    <dd v-else>{{closing?.reputationDelta!==undefined?reputation.format(closing.reputationDelta):'Sem registro'}}</dd>
    <dd v-if="closing?.reputationAfter!==undefined&&closing.reputationDelta!==undefined" class="reputation-change">{{reputation.format(closing.reputationDelta)}} nesta missão</dd>
   </div>
  </dl>
  <ol class="brief-timeline">
   <li v-for="row in turnRows" :key="row.turn" class="brief-turn">
    <span class="turn-marker" :aria-label="'Turno '+row.turn">T{{row.turn}}</span>
    <div class="brief-events">
     <small>{{row.label}}</small>
     <span v-if="!row.reports.length">{{emptyTurn(row.turn)}}</span>
     <div v-for="report in row.reports" :key="report.id" class="brief-event">
      <strong>{{report.title}}</strong>
      <StateBadge v-if="report.result" v-bind="report.result" />
     </div>
    </div>
   </li>
  </ol>
 </section>
</template>

<style scoped>
.turn-brief { margin:.75rem 0; overflow-wrap:anywhere; }
.mission-settlement { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.45rem; margin:0 0 .85rem; }
.mission-settlement > div { background:var(--command-raised); border:1px solid var(--command-line); border-radius:.65rem; padding:.55rem .65rem; }
.mission-settlement dt,.reputation-change,.brief-events > small { color:#b6c9d1; font-size:var(--text-caption); }
.mission-settlement dd { margin:0; font-weight:700; font-variant-numeric:tabular-nums; }
.mission-settlement dd small { font-weight:500; }
.mission-settlement .reputation-change { font-weight:500; }
.brief-timeline { list-style:none; padding:0; margin:0; }
.brief-turn { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:start; gap:.65rem; padding:.45rem 0; }
.brief-turn + .brief-turn { border-top:1px solid var(--command-line); }
.turn-marker { min-width:2.5rem; padding:.24rem .35rem; border-radius:.4rem; background:var(--command-raised); color:var(--command-info); text-align:center; font-size:var(--text-caption); font-variant-numeric:tabular-nums; }
.brief-events { display:grid; gap:.2rem; }
.brief-event { display:flex; align-items:baseline; flex-wrap:wrap; gap:.15rem .45rem; }
.brief-event :deep(.state-badge) { padding:2px 5px; }
.brief-event :deep(.state-badge .game-icon) { width:12px; height:12px; }
.compact-brief { font-size:var(--text-caption); margin:.5rem 0 0; }
</style>
