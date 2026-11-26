<script setup lang="ts">
const {feedbackTarget,captureAction}=useActionFeedback()
const props=defineProps<{game:any;mode:string;active?:boolean;regionId?:string;regionName?:string;cardTarget?:{id:string;report?:boolean}|null;agendaContractId?:string;ledger?:{sourceId:string;entryType:string;amountCents:number}[]}>(),emit=defineEmits(['changed','processing','clear-region','open-world','navigate','card-opened','clear-agenda-contract'])
const dateAt=(turn:number|null|undefined,includeYear=false)=>formatCampaignTurn(props.game,turn,includeYear)
const navigationNews=useNavigationNews()
const data=ref<any>({contracts:[],missions:[],decisions:[]}),people=ref<any>({operators:[],squads:[]}),busy=ref(false),error=ref(''),notice=ref(''),filter=ref(''),selectedContract=ref<any>(null),selectedMission=ref<any>(null),reports=ref<any[]>([]),preview=ref<any>(null),withdrawal=ref<any>(null)
const panelElement=ref<HTMLElement|null>(null)
const operationSection=ref('missions'),planError=ref('')
const preparationStep=ref('team'),launchContract=ref(''),plannerElement=ref<HTMLElement|null>(null)
const missionContext=useState<any>('mission-preparation',()=>null)
const readiness=computed(()=>missionReadiness(selectedContract.value,people.value,planBody(),data.value.logistics?.inventory??[]))
const preparationSteps=[['team','Equipe'],['kits','Kits'],['plan','Plano'],['launch','Mobilização']]
const readyKits=computed(()=>(data.value.logistics?.inventory??[]).filter((kit:any)=>kit.ready))
const missingReadyKits=computed(()=>readiness.value.missingEquipment.filter(category=>!readyKits.value.some((kit:any)=>kit.category===category)))
const kitOptions=computed(()=>kitSupplyOptions(missingReadyKits.value,data.value.logistics?.inventory??[],data.value.pendingOrders??[]))
const blockedStep=computed(()=>readiness.value.teamIssues.length?'team':readiness.value.missingEquipment.length?'kits':null)
function leavePreparation(destination:string,section:string,kit?:{category:string;catalogId?:string}){
 if(selectedContract.value)missionContext.value={gameId:props.game.id,contractId:selectedContract.value.id,title:selectedContract.value.title,type:selectedContract.value.type,requiredEquipment:selectedContract.value.requiredEquipment}
 emit('navigate',destination,section,kit)
}
watch(()=>[selectedContract.value?.id,preparationStep.value],async([id],[previousId])=>{
 await nextTick()
 if(id!==previousId)scrollCampaignElement(plannerElement.value)
 else scrollCampaignElement(plannerElement.value?.querySelector<HTMLElement>('.preparation-nav'))
})
function closePreparation(){selectedContract.value=null;preview.value=null;missionContext.value=null}
async function backToContracts(){
 const id=selectedContract.value?.id
 closePreparation()
 await nextTick()
 const card=document.getElementById('operations-c-'+id)
 scrollCampaignElement(card)
 card?.querySelector<HTMLElement>('.contract-prepare')?.focus({preventScroll:true})
}
function stepReady(step:string){return step==='team'?readiness.value.teamIssues.length===0:step==='kits'?readiness.value.missingEquipment.length===0:step==='plan'?!!preview.value:false}
function acceptBeforePreparation(){
 if(!selectedContract.value||!blockedStep.value)return
 preparationStep.value=blockedStep.value
 return run('/contracts/'+selectedContract.value.id+'/accept')
}

const ongoingMissionStatuses=['active','awaiting_decision','returning']
const visibleMissions=computed(()=>data.value.missions.filter((mission:any)=>{
 const ongoing=ongoingMissionStatuses.includes(mission.status)
 if(operationSection.value==='history')return !ongoing
 return ongoing||isRecentMissionEnd(mission.endedTurn,data.value.currentTurn)
}))
const boardStatuses=['available','accepted','rival_active']
const statusFilter=ref('board'),search=ref('')
const filtersOpen=ref(false)
const activeFilters=computed(()=>Number(!!filter.value)+Number(statusFilter.value!=='board'))
const intelContract=ref<any>(null),departure=ref<any>(null)
const equipmentIds=ref<string[]>([])
const squadId=ref(''),members=ref<string[]>([]),reinforcements=ref<string[]>([]),leader=ref(''),deputy=ref(''),posture=ref('balanced'),priority=ref('team_safety'),risk=ref('medium'),policy=ref('normal')
const pendingStore=useState<Record<string,any>>('operation-commands',()=>({}))
const pending=computed({get:()=>pendingStore.value[props.game.id]??null,set:(value:any)=>{pendingStore.value={...pendingStore.value,[props.game.id]:value}}})
const locked=computed(()=>busy.value||!!pending.value),base=()=>'/api/v1/games/'+props.game.id
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100)
const statusNames:any={rival_active:'Em execução por rival',rival_completed:'Concluído por rival',rival_failed:'Rival fracassou',available:'Disponível',accepted:'Aceito',active:'Em execução',awaiting_decision:'Aguardando decisão',returning:'Retornando',completed:'Concluído',failed:'Fracassado',expired:'Expirado',cancelled:'Cancelado',withdrawn:'Retirada concluída'}
const orderedReports=computed(()=>[...reports.value].sort((a,b)=>b.turn-a.turn||Number(b.id.split(':').at(-1))-Number(a.id.split(':').at(-1))))
const closingReport=computed(()=>orderedReports.value.find(report=>report.paymentCents!==undefined))
const closingCash=computed(()=>selectedMission.value?missionCashImpact(selectedMission.value.id,props.ledger??[]):null)
const returnCrew=computed<{operatorId:string;name:string;availability?:string;health?:number;fatigue?:number;morale?:number}[]>(()=>closingReport.value?.crewAtReturn??[])
const readyAtReturn=computed(()=>returnCrew.value.filter(operator=>operator.availability==='available').length)
const progressReports=computed(()=>orderedReports.value.filter(report=>report!==closingReport.value).map(report=>({
 ...report,heading:missionReportTitle(report.title),result:missionReportOutcome(report.outcome),reason:missionStageReason(report),
})))
const executionReport=computed(()=>progressReports.value.find(report=>report.stageIndex===2&&['success','partial','failure','complication'].includes(report.outcome)))
const closingReason=computed(()=>closingReport.value?missionClosingReason(
 closingReport.value,executionReport.value,progressReports.value.find(report=>report.outcome==='returning'),
):'')
function diplomaticSummary(contract:any){
 const effect=contract?.diplomacy;
 if(!effect)return '';
 if(effect.restricted)return 'O governo local restringiu esta oferta para PMCs do país de origem da sua companhia.';
 if(effect.level==='cooperative')return 'A boa relação com o país da operação reduz um pouco o risco de contratempos.';
 return (effect.level==='conflict'?'Os dois países estão em conflito. ':'A relação com o país da operação está '+(effect.level==='hostile'?'hostil. ':'tensa. '))+
  'O risco de complicações é maior'+(effect.premiumCents?' e a oferta inclui '+money(effect.premiumCents)+' a mais.':'.');
}
const missionDecisions=computed(()=>new Map<string,any>(data.value.decisions.map((decision:any)=>[decision.missionId,decision])))
function missionCrew(mission:any){
 const finished=mission.endedTurn!==null
 const snapshot=mission.recentReports?.find((entry:any)=>entry.paymentCents!==undefined)?.crewAtReturn??[]
 const conditions=finished?snapshot:people.value.operators
 return mission.crew.map((member:any)=>{
  const condition=conditions.find((entry:any)=>(finished?entry.operatorId:entry.id)===member.operatorId)
  const role=member.operatorId===mission.leaderId?'Líder':member.assignmentType==='reinforcement'?'Reforço':''
  const availability=condition?(availabilityLabels[condition.availability]??'Vínculo encerrado'):'Condição sem registro'
  return {...member,condition,caption:[role,availability].filter(Boolean).join(' · ')}
 })
}

function contractMatchesStatus(contract:any){
 if(statusFilter.value==='all')return true
 if(statusFilter.value!=='board')return contract.status===statusFilter.value
 return boardStatuses.includes(contract.status)||navigationNews.status(props.game.id,'contracts.'+contract.id+'.intelligence')==='new'||intelContract.value?.id===contract.id
}
const contracts=computed(()=>data.value.contracts.filter((c:any)=>(!filter.value||c.type===filter.value)&&(!props.regionId||c.regionId===props.regionId)&&contractMatchesStatus(c)&&(!search.value||[c.title,c.regionName,c.countryName,c.clientName,c.rival?.name].join(' ').toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR')))).sort((a:any,b:any)=>contractRank(a)-contractRank(b)||(a.mobilizationDueTurn??a.expiresTurn??Infinity)-(b.mobilizationDueTurn??b.expiresTurn??Infinity)))
function contractRank(c:any){return c.status==='accepted'?0:(data.value.pendingOrders??[]).some((o:any)=>o.target===c.id&&o.kind==='accept')?1:c.status==='available'?2:3}
const agendaContract=computed(()=>props.agendaContractId?data.value.contracts.find((contract:any)=>contract.id===props.agendaContractId):null)
const visibleContracts=computed(()=>agendaContract.value?[agendaContract.value]:contracts.value)
function openContract(contract:any){
 navigationNews.markRead(props.game.id,'contracts.'+contract.id+'.offer:new')
 emit('clear-agenda-contract')
 if(selectedContract.value?.id!==contract.id)plan(contract)
 else nextTick(()=>scrollCampaignElement(plannerElement.value))
}
const permanentOptions=computed(()=>people.value.operators.filter((o:any)=>people.value.squads.find((s:any)=>s.id===squadId.value)?.memberIds.includes(o.id)))
const availabilityLabels:Record<string,string>={
 available:'Disponível',training:'Em treinamento',rest:'Em descanso',recovery:'Em recuperação',
 mission:'Em missão',contract_pending:'Renovação pendente',recovery_needed:'Precisa de recuperação',exhausted:'Precisa descansar',
}
function planningAvailability(operator:any){
 const label=availabilityLabels[operator.availability]??'Indisponível'
 const reservation=operator.reservation
 const contract=selectedContract.value
 const deadline=contract?.mobilizationDueTurn??contract?.expiresTurn
 if(!reservation)return label
 if(reservation.kind==='mission'){
  const mission=data.value.missions.find((m:any)=>m.id===reservation.source_id)
  if(!mission)return label
  if(mission.status==='awaiting_decision')return label+' · aguardando decisão'
  return label+' · '+(mission.status==='returning'?'retorno previsto':'próxima etapa')+
   ' em '+dateAt(mission.stageDueTurn)+(deadline!=null&&mission.stageDueTurn>=deadline?' · coincide com o prazo ou ocorre depois':'')
 }
 const end=reservation.end_turn
 return end==null?label:label+' · atividade prevista até '+dateAt(end)+
  (deadline!=null&&end>=deadline?' · coincide com o prazo ou termina depois':'')
}
const scheduled=(target:string,kind?:string)=>(data.value.pendingOrders??[]).filter((o:any)=>o.target===target&&(!kind||o.kind===kind))
const launchScheduled=computed(()=>!!launchContract.value&&scheduled(launchContract.value,'start').length>0)
const launchedMissionInProgress=computed(()=>!!launchContract.value&&data.value.missions.some((m:any)=>m.contractId===launchContract.value&&ongoingMissionStatuses.includes(m.status)))
const name=(id:string)=>people.value.operators.find((o:any)=>o.id===id)?.name||id
const leadershipLabel=(id:string)=>{const op=people.value.operators.find((o:any)=>o.id===id);return `${name(id)} · Liderança ${op?.attributes?.leadership??'—'}`}
async function refresh(){try{const [ops,staff]=await Promise.all([$fetch<any>(base()+'/operations'),$fetch<any>(base()+'/personnel')]);data.value=ops;people.value=(staff as any).plannedPersonnel??staff;
 if(selectedContract.value){const updated=ops.contracts.find((c:any)=>c.id===selectedContract.value.id);if(updated&&['available','accepted'].includes(updated.status)){selectedContract.value=updated;if(!squadId.value&&people.value.squads.length){squadId.value=people.value.squads[0].id;chooseSquad()}}else closePreparation()}
 return true}catch(e:any){error.value=e.data?.message||'Não foi possível carregar as operações.';return false}}
function resolveDecision(decisionId:string,choice:string){return run('/decisions/'+decisionId+'/resolve',{choice})}
async function run(path:string,body:any={}){
 if(busy.value)return
 const command=pending.value||{path,body:{...body,requestId:crypto.randomUUID(),expectedVersion:body.expectedVersion??data.value.stateVersion}}
 pending.value=command;busy.value=true;emit('processing',true);error.value='';notice.value='';let done=false
 try{const response=await $fetch<any>(base()+command.path,{method:'POST',body:command.body});if(!await refresh())return;pending.value=null;preview.value=null;
 if(command.path.endsWith('/accept')){const accepted=data.value.contracts.find((c:any)=>command.path==='/contracts/'+c.id+'/accept');if(accepted&&!selectedContract.value)plan(accepted)}
 else if(command.path.endsWith('/start')){launchContract.value=command.path.split('/')[2];closePreparation()}
 else if(command.path.endsWith('/cancel'))closePreparation()
 withdrawal.value=null;notice.value=response.cancelledOrderId?'Ordem removida. A ação não será confirmada.':response.queued?'':({accept:'Contrato aceito agora. Confira o prazo de mobilização.',cancel:'Contrato cancelado, sem passagem de tempo.',decision:'Resposta registrada. A equipe executará a ordem no próximo período.',withdraw:'Retirada ordenada. A equipe retorna no próximo período.'} as Record<string,string>)[response.action]||'';done=true}
 catch(e:any){if(e.status>=400&&e.status<500){pending.value=null;preview.value=null;await refresh()}error.value=e.data?.message||'Falha de conexão. Repetir usará o mesmo comando.'}
 finally{busy.value=false;emit('processing',!!pending.value)}
 if(done){if(command.path.endsWith('/accept')&&selectedContract.value?.status==='accepted'&&preparationStep.value==='plan')await review();emit('changed')}
}
function chooseSquad(){const s=people.value.squads.find((s:any)=>s.id===squadId.value);members.value=[...(s?.memberIds??[])];reinforcements.value=[];leader.value=s?.effectiveLeaderId||s?.leaderId||'';deputy.value=s?.deputyId===leader.value?'':s?.deputyId||'';posture.value=s?.directives.posture||'balanced';priority.value=s?.directives.priority||'team_safety';risk.value=s?.directives.riskTolerance||'medium';policy.value=s?.directives.withdrawalPolicy||'normal';preview.value=null}
function plan(c:any){preparationStep.value='team';missionContext.value={gameId:props.game.id,contractId:c.id,title:c.title,type:c.type,requiredEquipment:c.requiredEquipment};planError.value='';equipmentIds.value=[];selectedContract.value=c;preview.value=null;squadId.value=people.value.squads[0]?.id||'';chooseSquad()}
function planBody(){return {equipmentIds:equipmentIds.value,squadId:squadId.value,memberIds:members.value,reinforcementIds:reinforcements.value,leaderId:leader.value||undefined,deputyId:deputy.value||null,directives:{posture:posture.value,priority:priority.value,riskTolerance:risk.value,withdrawalPolicy:policy.value}}}
async function review(){if(locked.value)return;busy.value=true;emit('processing',true);error.value='';notice.value='';planError.value='';preview.value=null;try{const body=planBody();preview.value={...await $fetch<any>(base()+'/contracts/'+selectedContract.value.id+'/plan',{method:'POST',body}),body};preparationStep.value='launch'}catch(e:any){planError.value=e.data?.message||'Formação inválida.'}finally{busy.value=false;emit('processing',false)}}
const reportsLoading=ref(false)
let reportRequest=0
async function details(m:any){
 const request=++reportRequest,gameId=props.game.id
 selectedMission.value=m;reports.value=[];departure.value=null;reportsLoading.value=true
 const [detail,history]=await Promise.allSettled([$fetch<any>(base()+'/missions/'+m.id),$fetch<any[]>(base()+'/missions/'+m.id+'/reports?limit=100')])
 if(request!==reportRequest||props.game.id!==gameId||selectedMission.value?.id!==m.id)return
 if(detail.status==='fulfilled')departure.value=detail.value.intelligenceAtDeparture
 if(history.status==='fulfilled'){
  reports.value=history.value
  if(data.value.stateVersion===props.game.stateVersion)navigationNews.markRead(gameId,'operations.'+(m.endedTurn==null?'missions:':'history:')+m.id)
 }
 if(detail.status==='rejected'||history.status==='rejected')error.value='Não foi possível carregar todos os relatórios. Tente abrir novamente.'
 reportsLoading.value=false
}

watch(()=>[props.cardTarget,data.value,operationSection.value,props.active],()=>{
 const target=props.cardTarget
 if(!target||!props.active)return
 requestAnimationFrame(()=>{
  if(props.cardTarget!==target||!props.active)return
  const card=document.getElementById(target.id)
  if(!card?.getClientRects().length||!panelElement.value?.contains(card))return
  card.focus({preventScroll:true})
  scrollCampaignElement(card,'center')
  if(target.report){
   const mission=data.value.missions.find((item:any)=>'operations-m-'+item.id===target.id)
   if(mission)details(mission)
  }
  emit('card-opened',target)
 })
},{flush:'post'})

watch(operationSection,()=>{selectedMission.value=null;withdrawal.value=null})
watch(()=>[props.game.id,props.game.stateVersion],async()=>{if(preview.value?.stateVersion!==props.game.stateVersion)preview.value=null;selectedMission.value=null;await refresh()})
onMounted(async()=>{emit('processing',!!pending.value);await refresh()})

</script>
<template>
<div ref="panelElement" class="operations-panel" :aria-busy="busy" @click.capture="captureAction($event)">
 <ActionFeedback :target="feedbackTarget" :section="operationSection" :turn="game.currentTurn" v-model:error="error" v-model:notice="notice" />
 <section v-if="pending&&!busy" class="panel"><p>Comando aguardando confirmação. A repetição não duplica efeitos.</p><button class="primary action-block" @click="run(pending.path,pending.body)">Repetir comando</button></section>
 <section v-if="mode==='contracts'&&(launchScheduled||launchedMissionInProgress)" class="panel mission-handoff"><h2>{{launchScheduled?'Início agendado':'Acompanhe sua missão'}}</h2><p>{{launchScheduled?'O início agendado será confirmado no próximo avanço. Confira as ordens e os custos antes de avançar.':'O início foi confirmado. Consulte o andamento e os relatórios em Operações.'}}</p><button class="primary action-block" :disabled="locked" @click="emit('navigate','operations','missions')">Acompanhar operações →</button></section>
 <section v-if="mode==='operations'&&(data.pendingOrders??[]).some((o:any)=>o.kind==='start')" class="panel mission-handoff"><h2>Mobilização aguardando confirmação</h2><p>Avance o tempo para confirmar o início. A equipe e os kits ainda não estão reservados.</p><button class="secondary action-block" :disabled="locked" @click="emit('navigate','contracts')">Revisar contratos →</button></section>
 <div class="personnel-summary"><span>{{data.missions.filter((m:any)=>ongoingMissionStatuses.includes(m.status)).length}} / {{data.capacity||1}} operações simultâneas</span><span>{{data.decisions.length}} decisões pendentes</span></div>
 <SectionNav :game-id="game.id" scope="operations" v-if="mode==='operations'" v-model="operationSection" label="Seções de operações" :disabled="locked" :items="[['missions','Em andamento'],['decisions','Decisões ('+data.decisions.length+')'],['history','Histórico']]" />
 <p v-if="mode==='contracts'&&data.decisions.length" class="batch-result">{{data.decisions.length}} decisão(ões) pendente(s). Consulte Operações → Decisões.</p>
 <template v-if="mode==='operations'&&operationSection==='decisions'">
  <p v-if="!data.decisions.length" class="empty">Nenhuma decisão pendente.</p>
  <OperationDecision :game="game" v-for="d in data.decisions" :key="d.id" data-action-card tabindex="-1" :id="'operations-d-'+d.id"
   :decision="d" :orders="scheduled(d.id)" :disabled="locked" @choose="resolveDecision(d.id,$event)" @remove-order="run('/orders/'+$event+'/cancel')" />
 </template><template v-if="mode==='contracts'">
  <section v-if="selectedContract&&!agendaContract" ref="plannerElement" class="panel mission-planner">
   <div class="planner-heading">
    <button type="button" class="planner-back secondary" :disabled="locked" @click="backToContracts">← Contratos</button>
    <span>{{selectedContract.countryName}}</span>
   </div>
   <h2><GameLabel kind="mission" :code="selectedContract.type" :label="selectedContract.title" /></h2>
   <p v-if="selectedContract.diplomacy">{{diplomaticSummary(selectedContract)}}</p>
   <p class="planner-deadline">{{selectedContract.status==='accepted'?'Mobilizar até ':'Aceitar até '}}{{dateAt(selectedContract.mobilizationDueTurn??selectedContract.expiresTurn)}}</p>
   <nav class="preparation-nav" aria-label="Etapas da missão">
    <button v-for="(step,index) in preparationSteps" :key="step[0]" type="button" :class="{active:preparationStep===step[0]}" :aria-current="preparationStep===step[0]?'step':undefined" :disabled="locked" @click="preparationStep=step[0]">
     <span aria-hidden="true">{{stepReady(step[0])?'✓':index+1}}</span>{{step[1]}}
    </button>
   </nav>

   <form id="mission-preparation-form" @submit.prevent="review" @change="preview=null;planError=''">
    <section v-show="preparationStep==='team'" class="preparation-stage">
     <h3>Equipe · mínimo {{selectedContract.minimumOperators}}</h3>
     <label class="personnel-label">Equipe permanente
      <select v-model="squadId" :disabled="locked" required @change="chooseSquad">
       <option value="">Selecione</option>
       <option v-for="s in people.squads" :key="s.id" :value="s.id">{{s.name}}</option>
      </select>
     </label>
     <fieldset v-if="permanentOptions.length" :disabled="locked">
      <legend>Membros enviados</legend>
      <label v-for="o in permanentOptions" :key="o.id" class="member-check"><input v-model="members" type="checkbox" :value="o.id" :disabled="o.availability!=='available'">{{o.name}} · {{planningAvailability(o)}}</label>
     </fieldset>
     <label v-if="members.length||reinforcements.length" class="personnel-label">Líder
      <select v-model="leader" :disabled="locked">
       <option value="">Selecionar líder</option>
       <option v-for="id in [...members,...reinforcements]" :key="id" :value="id">{{leadershipLabel(id)}}</option>
      </select>
     </label>
     <details v-if="squadId" class="card-details">
      <summary>Reforços e substituto{{reinforcements.length?' · '+reinforcements.length+' reforço(s)':''}}</summary>
      <fieldset :disabled="locked">
       <legend>Reforços temporários (até 2)</legend>
       <label v-for="o in people.operators.filter((o:any)=>!members.includes(o.id)&&o.employment)" :key="o.id" class="member-check"><input v-model="reinforcements" type="checkbox" :value="o.id" :disabled="o.availability!=='available'||(!reinforcements.includes(o.id)&&reinforcements.length>=2)">{{o.name}} · {{planningAvailability(o)}}</label>
      </fieldset>
      <label class="personnel-label">Substituto
       <select v-model="deputy" :disabled="locked">
        <option value="">Sem substituto</option>
        <option v-for="id in [...members,...reinforcements].filter(id=>id!==leader)" :key="id" :value="id">{{leadershipLabel(id)}}</option>
       </select>
      </label>
     </details>
     <details class="card-details">
      <summary>Atributos recomendados e gestão da equipe</summary>
      <MissionFit :contract="selectedContract" :operators="people.operators" />
      <div class="preparation-links action-row">
       <button type="button" class="secondary" :disabled="locked" @click="leavePreparation('operators','squads')">Gerenciar equipes</button>
       <button type="button" class="secondary" :disabled="locked" @click="leavePreparation('operators','recruitment')">Recrutar operadores</button>
       <button v-if="squadId" type="button" class="secondary" :disabled="locked" @click="chooseSquad">Restaurar formação</button>
      </div>
     </details>
    </section>

    <section v-show="preparationStep==='kits'" class="preparation-stage">
     <h3>Equipamentos da missão</h3>
     <p>Obrigatórios · <KitList :categories="selectedContract.requiredEquipment" empty="nenhum" /></p>
     <ul v-if="kitOptions.length>1" class="other-kit-options">
      <li v-for="option in kitOptions.slice(1)" :key="option.category">
       <div><GameLabel kind="kit" :code="option.category" /><small v-if="option.dueTurn!=null">Previsão · {{dateAt(option.dueTurn)}}</small></div>
       <button type="button" class="secondary action-block" :disabled="locked" @click="leavePreparation('infrastructure',option.section,option)">{{option.action}}</button>
      </li>
     </ul>
     <fieldset v-if="readyKits.length" :disabled="locked">
      <legend>Kits aptos</legend>
      <label v-for="k in readyKits" :key="k.id" class="member-check">
       <input v-model="equipmentIds" type="checkbox" :value="k.id">
       <span><GameLabel kind="kit" :code="k.category" :label="k.name" /> · condição {{k.condition}} · suprimentos {{k.supplies}} · carga {{k.weight}}</span>
      </label>
     </fieldset>
     <details class="card-details">
      <summary>Catálogo e estoque</summary>
      <div class="preparation-links action-row">
       <button type="button" class="secondary" :disabled="locked" @click="leavePreparation('infrastructure','catalog')">Comprar kits</button>
       <button type="button" class="secondary" :disabled="locked" @click="leavePreparation('infrastructure','inventory')">Estoque e serviços</button>
      </div>
     </details>
    </section>

    <section v-show="preparationStep==='plan'" class="preparation-stage">
     <h3>Revise o plano</h3>
     <p>{{members.length+reinforcements.length}} operadores · {{equipmentIds.length}} {{equipmentIds.length===1?'kit':'kits'}} · líder {{name(leader)||'não definido'}}.</p>
     <details v-if="blockedStep&&selectedContract.status==='available'" class="card-details">
      <summary>Aceitar com pendências</summary>
      <p>O prazo de mobilização começa no aceite. Termine a preparação antes de agendar a missão.</p>
      <button type="button" class="secondary action-block" :disabled="locked" @click="acceptBeforePreparation">Aceitar contrato agora</button>
     </details>
     <details class="advanced-options">
      <summary>Diretrizes da missão</summary>
      <div class="planning-directives">
       <label class="personnel-label">Postura<select v-model="posture" :disabled="locked"><option value="cautious">Cautelosa</option><option value="balanced">Equilibrada</option><option value="aggressive">Agressiva</option></select></label>
       <label class="personnel-label">Prioridade<select v-model="priority" :disabled="locked"><option value="objective">Objetivo</option><option value="team_safety">Segurança da equipe</option><option value="deadline">Prazo</option></select></label>
       <label class="personnel-label">Tolerância a risco<select v-model="risk" :disabled="locked"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label>
       <label class="personnel-label">Política de retirada<select v-model="policy" :disabled="locked"><option value="conservative">Conservadora</option><option value="normal">Normal</option><option value="persistent">Persistente</option></select></label>
      </div>
     </details>
    </section>
   </form>

   <section v-if="preparationStep==='launch'&&preview" class="preparation-stage">
    <h3>Revisão de mobilização</h3>
    <p v-if="preview.intelligenceAdvice">{{preview.intelligenceAdvice}}</p>
    <p>{{preview.operatorIds.map(name).join(', ')}}</p>
    <p>Mobilização: {{money(preview.mobilizationCents)}}<br>Adiantamento: {{money(preview.advanceCents)}}<br>Saldo previsto: {{money(preview.cashAfterCents)}}<br>Reserva máxima inicial: {{formatCampaignDuration(preview.maxTurns)}}<br>Carga dos kits: {{preview.load}} / {{preview.loadCapacity}}</p>
    <details class="card-details">
     <summary>Condições de mobilização</summary>
     <p>Falha ou retirada devolve o adiantamento e mantém a despesa de mobilização. Condições e reputação podem mudar. Kits ficam indisponíveis até o retorno. Desgaste e consumo não geram débito adicional.</p>
    </details>
   </section>
   <details class="card-details planner-briefing">
    <summary>Briefing e requisitos do contrato</summary>
    <p v-if="selectedContract.briefing">{{selectedContract.briefing}}</p>
    <p><OrganizationEmblem :id="selectedContract.clientId" />Contratante: {{selectedContract.clientName}} · até {{money(selectedContract.rewardCents)}}</p>
    <ContractEstimates :contract="selectedContract" />
    <p>Mínimo: {{selectedContract.minimumOperators}} operadores · kits <KitList :categories="selectedContract.requiredEquipment" empty="nenhum obrigatório" />.</p>
   </details>

   <div class="planner-action">
    <template v-if="preparationStep==='team'">
     <p v-if="readiness.teamIssues.length" role="status">{{people.squads.length?readiness.teamIssues[0]:'A missão exige uma equipe permanente.'}}</p>
     <button v-if="!people.squads.length&&people.operators.filter((o:any)=>o.employment).length<selectedContract.minimumOperators" type="button" class="primary" :disabled="locked" @click="leavePreparation('operators','recruitment')">Recrutar operadores</button>
     <button v-else-if="!people.squads.length" type="button" class="primary" :disabled="locked" @click="leavePreparation('operators','squads')">Montar equipe</button>
     <button v-else type="button" class="primary" :disabled="locked||!stepReady('team')" @click="preparationStep='kits'">Continuar para kits</button>
    </template>
    <template v-else-if="preparationStep==='kits'">
     <p v-if="kitOptions.length" role="status"><GameLabel kind="kit" :code="kitOptions[0].category" /> · {{kitOptions[0].dueTurn!=null?'Previsão '+dateAt(kitOptions[0].dueTurn):'Sem kit apto'}}</p>
     <p v-else-if="readiness.missingEquipment.length" role="status">Selecione · <KitList :categories="readiness.missingEquipment" /></p>
     <button v-if="kitOptions.length" type="button" class="primary" :disabled="locked" @click="leavePreparation('infrastructure',kitOptions[0].section,kitOptions[0])">{{kitOptions[0].action}}</button>
     <button v-else type="button" class="primary" :disabled="locked||!stepReady('kits')" @click="preparationStep='plan'">Continuar para o plano</button>
    </template>
    <template v-else-if="preparationStep==='plan'">
     <p v-if="planError" class="planner-error" role="alert">{{planError}}</p>
     <button v-if="blockedStep" type="button" class="primary" :disabled="locked" @click="preparationStep=blockedStep">{{blockedStep==='team'?'Completar equipe':'Completar kits'}}</button>
     <template v-else-if="selectedContract.status==='available'">
      <p>O prazo de mobilização começa agora. A validação vem em seguida.</p>
      <button type="button" class="primary" :disabled="locked" @click="run('/contracts/'+selectedContract.id+'/accept')">Aceitar contrato</button>
     </template>
     <button v-else type="submit" form="mission-preparation-form" class="primary" :disabled="locked">Validar formação e custos</button>
    </template>
    <template v-else>
     <p v-if="!preview">Valide o plano antes de agendar.</p>
     <button v-if="!preview" type="button" class="primary" :disabled="locked" @click="preparationStep='plan'">Revisar plano</button>
     <button v-else type="button" class="primary" :disabled="locked" @click="run('/contracts/'+selectedContract.id+'/start',{...preview.body,expectedVersion:preview.stateVersion})">Agendar início da missão</button>
    </template>
   </div>
  </section>
  <template v-else>
   <div v-if="agendaContract" class="contract-toolbar">
    <button type="button" class="secondary action-block" @click="emit('clear-agenda-contract')">{{selectedContract?'Voltar à preparação':'Ver lista de contratos'}}</button>
   </div>
   <template v-else>
   <div class="contract-toolbar">
    <input v-model="search" type="search" aria-label="Buscar contratos" placeholder="Buscar contratos">
    <button type="button" class="secondary" :aria-expanded="filtersOpen" aria-controls="contract-filters" @click="filtersOpen=!filtersOpen">Filtros{{activeFilters?' ('+activeFilters+')':''}}</button>
   </div>
   <div v-if="regionId" class="contract-region">
    <span>{{regionName||data.contracts.find((c:any)=>c.regionId===regionId)?.regionName||'País selecionado'}}</span>
    <button type="button" class="secondary action-block" @click="emit('clear-region')">Ver todos os países</button>
   </div>
   <div v-show="filtersOpen" id="contract-filters" class="contract-filters">
    <label class="personnel-label">Situação
     <select v-model="statusFilter">
      <option value="board">Disponíveis, aceitos e com rivais</option><option value="all">Todas as situações</option><option value="available">Disponíveis</option><option value="accepted">Aceitos</option><option value="active">Missões da companhia</option><option value="rival_active">Em execução por rival</option>
     </select>
    </label>
    <label class="personnel-label">Tipo<GameLabelSelect v-model="filter" kind="mission" all="Todos os tipos" /></label>
   </div>
   </template>

  <section v-if="!visibleContracts.length" class="empty action-empty"><h3>Nenhum contrato encontrado</h3><template v-if="search||filter||regionId||statusFilter!=='board'"><p>Tente ampliar os filtros para consultar outras ofertas.</p><button class="secondary" :disabled="locked" @click="search='';filter='';statusFilter='board';emit('clear-region')">Limpar filtros →</button></template><template v-else><p>Novas ofertas chegam em {{dateAt(nextCampaignWeek(game.currentTurn))}}. Enquanto isso, prepare os operadores, a equipe e os kits.</p><button class="secondary" :disabled="locked" @click="emit('navigate','overview')">Preparar companhia →</button></template></section>
   <div class="personnel-grid compact-contracts">
    <article v-for="c in visibleContracts" :key="c.id" data-action-card :id="'operations-c-'+c.id" class="panel operator-card" :class="{'contract-rival-active':c.status==='rival_active'}">
     <div class="card-status-line">
      <span class="eyebrow"><GameLabel kind="mission" :code="c.type" /></span>
      <StateBadge :status="scheduled(c.id).length?'planned':c.status" :label="scheduled(c.id).length?'Ação agendada':statusNames[c.status]||c.status" />
     </div>
     <h3>{{c.title}}<CardNews :game-id="game.id" :news-key="'contracts.'+c.id+'.offer:new'" :label="c.title" /><NavigationBadge v-if="!navigationNews.status(game.id,'contracts.'+c.id+'.offer')" :status="navigationNews.status(game.id,'contracts.'+c.id+'.intelligence')" /></h3>
     <p class="contract-location">
      {{c.countryName}}<template v-if="c.status==='accepted'||c.status==='available'"> · {{c.status==='accepted'?'Mobilizar até':'Aceitar até'}} {{dateAt(c.mobilizationDueTurn??c.expiresTurn)}}</template>
     </p>
     <p v-if="c.diplomacy">{{diplomaticSummary(c)}}</p>
     <p v-if="c.objective">{{c.objective}}</p>
     <p v-if="c.rival" class="contract-rival-company"><OrganizationEmblem :id="c.rival.id" /><strong>{{c.rival.name}}</strong></p>
     <p v-if="c.status==='available'&&c.previousRewardCents!=null" class="contract-reopened">Reaberto após falha de rival · antes {{money(c.previousRewardCents)}}</p>
     <div class="contract-key-facts">
      <span><small>Pagamento máximo</small><strong>{{money(c.rewardCents)}}</strong></span>
      <span><small>Equipe mínima</small><strong>{{c.minimumOperators}} operadores</strong></span>
     </div>
     <p v-if="c.requiredEquipment.length" class="contract-equipment">Kits · <KitList :categories="c.requiredEquipment" /></p>
     <button v-if="(c.status==='accepted'||(c.status==='available'&&scheduled(c.id,'accept').length))&&!scheduled(c.id,'start').length&&!scheduled(c.id,'cancel').length" type="button" class="primary contract-prepare" :disabled="locked" @click="openContract(c)">Planejar missão</button>
     <button v-else-if="c.status==='available'&&!c.diplomacy?.restricted&&!scheduled(c.id).length" type="button" class="primary contract-prepare" :disabled="locked" @click="openContract(c)">Preparar missão</button>
     <details class="card-details contract-briefing" @toggle="($event.currentTarget as HTMLDetailsElement).open&&navigationNews.markRead(game.id,'contracts.'+c.id+'.offer:new')">
      <summary>Briefing e estimativas <NavigationBadge :status="navigationNews.status(game.id,'contracts.'+c.id+'.intelligence')" /></summary>
      <ContractEstimates :contract="c" />
      <p v-if="c.briefing">{{c.briefing}}</p>
      <p v-if="c.context">{{c.context}}</p>
      <p><OrganizationEmblem :id="c.clientId" />{{c.source==='commercial'?'Oferta comercial':'Demanda emergente'}} · {{c.clientName}}</p>
      <p>Fonte da estimativa de risco: {{c.intelSource}}<br>Adiantamento: {{money(c.advanceCents)}}</p>
      <div class="personnel-actions contract-actions">
       <button type="button" class="secondary" @click="intelContract=c">Inteligência e análises <NavigationBadge :status="navigationNews.status(game.id,'contracts.'+c.id+'.intelligence')" /></button>
       <button v-if="c.originEventId" type="button" class="secondary" @click="emit('open-world',{regionId:c.regionId,eventId:c.originEventId})">Consultar notícia de origem</button>
       <button v-if="c.status==='accepted'&&!scheduled(c.id,'start').length&&!scheduled(c.id,'cancel').length" type="button" class="secondary" :disabled="locked" @click="run('/contracts/'+c.id+'/cancel')">Cancelar aceite · sem custo</button>
      </div>
     </details>
     <PendingOrderNotice :orders="scheduled(c.id)" label-kind="mission" :label-code="c.type" :disabled="locked" @remove="run('/orders/'+$event+'/cancel')" />
     <FocusDialog v-if="intelContract?.id===c.id" title="Inteligência e análises" :busy="busy" :error="error" @close="intelContract=null">
      <section class="inline-action">
       <h2><GameLabel kind="mission" :code="intelContract.type" :label="intelContract.title" /></h2>
       <IntelligencePanel :key="game.id+':'+intelContract.id" :game="game" target-type="contract" :target-id="intelContract.id" @changed="emit('changed')" @processing="emit('processing',$event)" />
      </section>
     </FocusDialog>
    </article>
   </div>
 </template>
 </template>
 <template v-else-if="operationSection!=='decisions'">
  <section v-if="!visibleMissions.length&&(operationSection==='history'||!(data.pendingOrders??[]).some((o:any)=>o.kind==='start'))" class="empty action-empty"><h3>{{operationSection==='history'?'Sua história ainda vai começar':'Prepare sua próxima operação'}}</h3><p>{{operationSection==='history'?'As missões encerradas aparecerão aqui com seus resultados.':'Escolha um contrato e prepare a equipe antes de iniciar a mobilização.'}}</p><button class="primary" :disabled="locked" @click="emit('navigate','contracts')">Encontrar contrato →</button></section><div class="personnel-grid"><article v-for="m in visibleMissions" :key="m.id" data-action-card tabindex="-1" :id="'operations-m-'+m.id" class="panel operator-card"><StateBadge :status="m.status" :label="statusNames[m.status]||m.status" /><h3><GameLabel kind="mission" :code="m.contractType ?? data.contracts.find((c:any)=>c.id===m.contractId)?.type" :label="m.contractTitle||data.contracts.find((c:any)=>c.id===m.contractId)?.title||'Missão registrada'" /><CardNews :game-id="game.id" :news-key="'operations.'+operationSection+':'+m.id" :label="m.contractTitle||'Missão'" /></h3>
<div class="mission-progress-label"><strong>{{m.completedStages}} de {{m.totalStages}} etapas</strong><small>Início · {{dateAt(m.startedTurn)}}</small></div>
<progress class="mission-progress" :value="m.completedStages" :max="m.totalStages" :aria-label="'Etapas concluídas de '+(m.contractTitle||'missão')" />
<p v-if="m.status==='active'||m.status==='returning'" class="mission-next">
 <span>{{m.status==='returning'?'Retorno previsto':'Próxima etapa'}}</span>
 <strong>{{m.status==='active'?m.stageName+' · ':''}}{{dateAt(m.stageDueTurn)}}</strong>
</p>
<p v-if="m.status==='active'&&m.stageDescription">{{m.stageDescription}}</p>
<OperationDecision :game="game" v-if="missionDecisions.has(m.id)" inline
 :decision="missionDecisions.get(m.id)" :orders="scheduled(missionDecisions.get(m.id).id)" :disabled="locked"
 @choose="resolveDecision(missionDecisions.get(m.id).id,$event)" @remove-order="run('/orders/'+$event+'/cancel')" />
<MissionTurnBrief :mission="m" :game="game" :current-turn="data.currentTurn" />
<details v-if="m.crew.length" class="card-details mission-crew">
 <summary>{{m.endedTurn===null?'Equipe atual':'Equipe no retorno'}} <span>{{m.crew.length}}</span></summary>
 <MissionSnapshot v-for="member in missionCrew(m)" :key="member.operatorId" :name="member.name" :caption="member.caption" :metrics="missionCrewMetrics(member.condition)" />
</details>
<div class="personnel-actions">
 <button class="primary" @click="details(m)">{{m.endedTurn==null?'Ver relatório':'Ver resultado'}}</button><button v-if="['active','awaiting_decision'].includes(m.status)" class="secondary" :disabled="locked||!!scheduled(m.id).length" @click="withdrawal=m">Solicitar retirada</button></div>  <PendingOrderNotice :orders="scheduled(m.id)" label-kind="mission" :label-code="m.contractType" :disabled="locked" @remove="run('/orders/'+$event+'/cancel')" /><FocusDialog v-if="selectedMission?.id===m.id" title="Relatórios da missão" :busy="busy" :error="error" @close="selectedMission=null"><section class="inline-action mission-reports">
 <p v-if="reportsLoading" role="status">Carregando relatórios…</p>
 <p v-else-if="!reports.length">Nenhum relatório disponível.</p>

 <section v-if="closingReport" class="mission-closing">
  <h3>{{closingReport.title}}</h3>
  <p class="report-meta">{{m.contractTitle}} · {{dateAt(closingReport.turn,true)}}</p>
  <p><strong>Por que deu esse resultado?</strong> {{closingReason}}</p>
  <p v-if="executionReport?.reason">{{executionReport.heading}} · {{executionReport.reason}}</p>
  <p v-if="closingReport.totalPaidCents>0&&closingReport.rewardCents>0">
   {{closingReport.totalPaidCents>=closingReport.rewardCents?'Pagamento integral.':'Pagamento parcial de '+Math.round(closingReport.totalPaidCents/closingReport.rewardCents*100)+'%.'}}
  </p>
  <p v-else-if="closingReport.paymentCents<0">Adiantamento devolvido.</p>
  <dl class="closing-figures">
   <div v-if="closingCash"><dt>Impacto no caixa</dt><dd :class="closingCash.netCents<0?'debit':closingCash.netCents>0?'credit':''">{{closingCash.netCents>0?'+':''}}{{money(closingCash.netCents)}}</dd></div>
   <div v-else-if="closingReport.totalPaidCents!==undefined"><dt>Total recebido</dt><dd>{{money(closingReport.totalPaidCents)}}</dd></div>
   <div v-if="closingReport.reputationDelta!==undefined"><dt>Reputação</dt><dd>{{closingReport.reputationDelta>0?'+':''}}{{closingReport.reputationDelta}}</dd></div>
   <div v-if="returnCrew.length&&returnCrew.every(operator=>operator.availability)"><dt>Disponíveis no retorno</dt><dd>{{readyAtReturn}} de {{returnCrew.length}}</dd></div>
  </dl>
  <details class="card-details">
   <summary>Acerto financeiro</summary>
   <div class="report-detail-body">
    <p v-if="closingCash">Mobilização {{money(closingCash.mobilizationCents)}}</p>
    <p v-if="closingReport.advanceCents!==undefined">Adiantamento {{money(closingReport.advanceCents)}}</p>
    <p>{{closingReport.paymentCents<0?'Devolução':'Acerto final'}} {{money(Math.abs(closingReport.paymentCents))}}</p>
   </div>
  </details>
  <details v-if="returnCrew.length" class="card-details">
   <summary>Equipe no retorno</summary>
   <MissionSnapshot v-for="operator in returnCrew" :key="operator.operatorId"
    :name="operator.name" :caption="operator.availability?availabilityLabels[operator.availability]:undefined" :metrics="missionCrewMetrics(operator)" />
  </details>
  <details v-if="closingReport.evacuationChoice" class="card-details">
   <summary>Decisão de evacuação</summary>
   <p>{{closingReport.evacuationChoice.label==='Aguardar mais um turno'?'Aguardar mais '+formatCampaignDuration(1):closingReport.evacuationChoice.label}} · {{dateAt(closingReport.evacuationChoice.turn,true)}}<span v-if="closingReport.evacuationChoice.automatic"> · decisão automática</span></p>
  </details>
  <button class="secondary action-block" @click="selectedMission=null;emit('clear-region');emit('navigate','contracts')">Ver próximos contratos</button>
 </section>
 <section v-else-if="!reportsLoading&&m.endedTurn==null" class="mission-closing">
  <h3>{{m.contractTitle||'Operação em andamento'}}</h3>
  <p v-if="missionDecisions.has(m.id)">Decisão pendente · até {{dateAt(missionDecisions.get(m.id).expiresTurn)}}</p>
  <p v-else>{{m.status==='returning'?'Retorno previsto':'Próxima etapa · '+m.stageName}} · {{dateAt(m.stageDueTurn)}}</p>
  <p v-if="progressReports.length">{{progressReports[0].heading}} · {{progressReports[0].reason||formatCampaignReport(progressReports[0].description)}}</p>
 </section>

 <details v-if="progressReports.length" class="card-details">
 <summary>Ver etapas · {{progressReports.length}}</summary>
 <details v-for="report in progressReports" :key="report.id" class="card-details report-timeline-entry">
  <summary>
   <span class="report-summary">
    <span class="report-turn">{{dateAt(report.turn,true)}}</span>
    <strong>{{report.heading}}</strong>
    <StateBadge v-if="report.result" v-bind="report.result" />
   </span>
  </summary>
  <div class="report-detail-body">
   <p v-if="report.stageDescription">{{report.stageDescription}}</p>
   <p v-if="report.reason"><strong>Motivo</strong> {{report.reason}}</p>
   <p>{{formatCampaignReport(report.description)}}</p>
   <MissionReportFactors v-if="report.assessment" :assessment="report.assessment" />
   <div v-if="report.conditions?.length">
    <h4>Equipe após a etapa</h4>
    <MissionSnapshot v-for="operator in report.conditions" :key="operator.operatorId" :name="operator.name" :metrics="missionCrewMetrics(operator)" />
   </div>
   <div v-if="report.equipment?.length">
    <h4>Kits após a etapa</h4>
    <MissionSnapshot v-for="kit in report.equipment" :key="kit.id" :name="kit.name" :kit-category="kit.category ?? reportedKitCategory(kit.name) ?? ''" :metrics="missionKitMetrics(kit)" />
   </div>
   <p v-if="report.intelligence">Inteligência nível {{report.intelligence.level}}<span v-if="report.intelligence.stale"> · desatualizada</span><span v-if="report.intelligence.conflicting"> · fontes conflitantes</span></p>
  </div>
 </details>
 </details>
 <details v-if="departure" class="card-details report-departure">
  <summary>Inteligência inicial <span class="report-meta">{{dateAt(departure.collectedTurn,true)}}</span></summary>
  <div class="report-detail-body">
   <p v-for="topic in departure.contract.topics" :key="topic.topic">{{topic.topic==='risk'?'Risco':'Dificuldade'}} · {{topic.estimate?topic.estimate.min+'–'+topic.estimate.max:'desconhecido'}} · confiança {{topic.confidence}}% · válida até {{dateAt(topic.validUntilTurn)}}</p>
  </div>
 </details>
</section></FocusDialog></article></div>
 </template>
</div>
</template>

<style scoped>
.contract-toolbar,.contract-region,.planner-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)}
.contract-toolbar,.contract-region,.contract-filters{margin-bottom:var(--space-3)}
.contract-toolbar input{flex:1;min-width:0;min-height:46px;padding:8px 12px;border:1px solid var(--command-line);border-radius:10px;background:var(--command-surface);color:inherit}
.contract-toolbar button,.contract-region button,.planner-back{min-height:46px;padding:8px 12px;font-size:var(--text-caption)}
.contract-region,.planner-heading,.planner-deadline{font-size:var(--text-caption)}
.contract-filters{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
.contract-filters .personnel-label{margin-bottom:0}
.compact-contracts .operator-card{gap:var(--space-2)}
.compact-contracts .contract-key-facts{margin:0}
.contract-prepare{align-self:stretch;margin-top:var(--space-1)}
.compact-contracts .contract-briefing{margin:0}
.planner-heading{margin-bottom:var(--space-2);color:#b6c9d1}
.mission-planner>h2{margin:0 0 var(--space-1)}
.mission-planner .preparation-nav{margin:var(--space-3) 0}
.mission-planner .preparation-nav button{min-height:48px;padding-block:4px;gap:2px}
.planner-briefing{margin-top:var(--space-3)}
.planner-action{display:grid;gap:var(--space-1);margin-top:var(--space-3);padding:var(--space-2);border:1px solid var(--command-line);border-radius:12px;background:var(--command-surface)}
.planner-action p{font-size:var(--text-caption);line-height:1.4;color:var(--command-warning)}
.planner-action .planner-error{color:var(--command-danger)}
.other-kit-options{list-style:none;padding:0;margin:var(--space-2) 0}
.other-kit-options li{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:1px solid var(--command-line)}
.other-kit-options small{display:block;font-size:var(--text-caption)}
@media(max-width:640px){
 .contract-region,.other-kit-options li{flex-direction:column;align-items:stretch}
}
@media(max-width:999px) and (min-height:500px){
 .planner-action{position:sticky;bottom:6px;z-index:3}
}
@media(max-width:420px){
 .contract-filters{grid-template-columns:1fr}
 .compact-contracts .operator-card{padding:var(--space-3)}
}
@media(min-width:641px){.contract-actions>button{flex:1 1 130px;text-align:center;white-space:normal}}
.mission-closing { display:grid; gap:.55rem; margin-bottom:1.25rem; }
.mission-closing > :is(h3,p) { margin:0; }
.mission-closing > button { justify-self:start; }
.mission-progress-label,.mission-next { display:flex; align-items:baseline; justify-content:space-between; gap:.25rem .75rem; flex-wrap:wrap; }
.mission-progress-label small,.mission-next span,.mission-crew summary span { color:#b6c9d1; font-size:var(--text-caption); }
.mission-next { margin:.65rem 0; }
.mission-crew summary span { margin-inline-start:.35rem; }
.closing-figures { display:flex; flex-wrap:wrap; gap:.55rem 1.3rem; margin:0; padding:.65rem 0; }
.closing-figures dt { color:#b6c9d1; font-size:var(--text-caption); }
.closing-figures dd { margin:0; font-weight:700; }
.report-timeline-entry { margin:0; }
.report-timeline-entry + .report-timeline-entry { border-top:1px solid var(--command-line,#304047);border-start-start-radius:0;border-start-end-radius:0; }
.report-summary { display:inline-flex; flex-wrap:wrap; align-items:baseline; gap:.3rem .55rem; }
.report-summary :deep(.state-badge) { padding:2px 6px; }
.report-turn { color:var(--command-info); font-size:var(--text-caption); font-variant-numeric:tabular-nums; }
.report-meta { font-size:.875em; opacity:.85; }
.report-detail-body :is(h4,p) { margin:.4rem 0; }
.report-departure { margin-top:.8rem; }
</style>
