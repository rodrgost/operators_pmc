<script setup lang="ts">
import type {RosterAction} from '../utils/rosterRecommendation'
const {feedbackTarget,captureAction}=useActionFeedback()
const trainingAttributes=ref<Record<string,string>>({})
const props=defineProps<{game:any;destination?:{section:string}|null}>()
const dateAt=(turn:number|null|undefined,includeYear=false)=>formatCampaignTurn(props.game,turn,includeYear)
const navigationNews=useNavigationNews()
const missionContext=useState<any>('mission-preparation',()=>null)
const emit=defineEmits(['changed','processing'])
const data=ref<any>({operators:[],candidates:[],squads:[],familiarity:[]}),busy=ref(false),error=ref(''),notice=ref(''),weeks=ref(4),confirmation=ref<any>(null),selected=ref<any>(null),history=ref<any[]>([])
const pendingStore=useState<Record<string,any>>('personnel-commands',()=>({}))
const pending=computed({get:()=>pendingStore.value[props.game.id]??null,set:(value:any)=>{pendingStore.value={...pendingStore.value,[props.game.id]:value}}})
const comparisonOpen=ref(false)
const specialty=ref(''),candidateSort=ref('salary'),search=ref(''),filtersOpen=ref(false),onlyCandidates=ref(false),comparisonIds=ref<string[]>([])
const candidates=computed(()=>candidateList(data.value.candidates,specialty.value,candidateSort.value,search.value))
const routes=useState<Record<string,string>>('campaign-sections',()=>({}))
const activeScope=useState('campaign-active-scope',()=> 'overview')
function applyDestination(section:string|undefined){
 onlyCandidates.value=section==='recruitment'
 search.value=''
 specialty.value=''
 filtersOpen.value=false
}
watch([()=>routes.value.operators,activeScope],([section,active],previous)=>{
 if(active==='operators'&&(section!==previous?.[0]||!previous?.[1]))applyDestination(section)
},{immediate:true})
watch(()=>props.destination,request=>{if(request)applyDestination(request.section)},{immediate:true})
const recruitingFor=computed(()=>missionContext.value?.gameId===props.game.id?missionContext.value:null)
const fitWeights=computed(()=>missionFitWeights(recruitingFor.value?.type))
const comparison=computed(()=>data.value.candidates.filter((c:any)=>comparisonIds.value.includes(c.id)))
async function compareCandidate(id:string){comparisonIds.value=comparisonIds.value.includes(id)?comparisonIds.value.filter(x=>x!==id):[...comparisonIds.value.slice(-1),id];if(comparisonIds.value.length===2)comparisonOpen.value=true}
function strongest(op:any){return Object.entries(op.attributes??{}).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,2).map(([key,value])=>({label:labels[key]||key,value:Number(value)}))}
function squadView(s:any){return squadStatus(s,data.value.operators)}
const suggestionIndex=ref(0)
function suggestSquadName(){const names=(data.value.squadNameSuggestions??[]).filter((n:string)=>!data.value.squads.some((s:any)=>s.name===n));if(names.length)squadName.value=names[suggestionIndex.value++%names.length]}
const editing=ref(false),editorId=ref(''),squadName=ref(''),squadSpec=ref('general'),members=ref<string[]>([]),leader=ref(''),deputy=ref(''),posture=ref('balanced'),priority=ref('team_safety'),risk=ref('medium'),withdrawal=ref('normal')
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n/100)
const labels:any={combat:'Combate',stealth:'Furtividade',technical:'Técnica',perception:'Percepção',endurance:'Resistência',leadership:'Liderança'}
const traits:any={disciplined:'disciplinado',cautious:'cauteloso',impulsive:'impulsivo',resilient:'resiliente',loyal:'leal',ambitious:'ambicioso'}
const specs:any={general:'Geral',recon:'Reconhecimento',assault:'Assalto',medic:'Médico',technical:'Técnico',leader:'Liderança'}
const states:any={available:'Disponível',training:'Em treinamento',rest:'Descansando',recovery:'Em recuperação',mission:'Em missão',contract_pending:'Renovação pendente',recovery_needed:'Precisa de recuperação',exhausted:'Exausto'}
const base=()=>'/api/v1/games/'+props.game.id
const locked=computed(()=>busy.value||!!pending.value)
const formation=computed(()=>data.value.plannedPersonnel??data.value)
const available=computed(()=>formation.value.operators.filter((o:any)=>o.employment))
const rosterGroups=computed(()=>{
 const operatorsById=new Map<string,any>(data.value.operators.map((operator:any)=>[operator.id,operator]))
 const groups:{key:string;name:string;squad:any|null;total:number;operators:any[]}[]=[]
 for(const squad of data.value.squads){
  const operators=[]
  for(const id of squad.memberIds){
   const operator=operatorsById.get(id)
   if(!operator)continue
   operators.push(operator)
   operatorsById.delete(id)
  }
  groups.push({key:squad.id,name:squad.name,squad,total:squad.memberIds.length,operators})
 }
 if(operatorsById.size)groups.push({key:'unassigned',name:'Sem equipe',squad:null,total:operatorsById.size,operators:[...operatorsById.values()]})
 if(!specialty.value&&!search.value.trim())return groups
 return groups.map(group=>({...group,operators:group.operators.filter(operator=>matchesPersonnel(operator,specialty.value,search.value))})).filter(group=>group.operators.length)
})
const assignedTeams=computed(()=>{
 const teams=new Map<string,string>()
 for(const squad of formation.value.squads){
  if(squad.id===editorId.value)continue
  for(const id of squad.memberIds)teams.set(id,squad.name)
 }
 return teams
})
const scheduled=(target:string)=>(data.value.pendingOrders??[]).filter((o:any)=>o.target===target)
type OperatorView=RosterAction|'profile'|'training'|'cancel'
const operatorView=ref<OperatorView>('profile')
const actionLabels:Record<OperatorView,string>={profile:'Ficha do operador',renew:'Renovar vínculo',recovery:'Tratar',rest:'Descansar',training:'Treinar atributo',cancel:'Gerenciar atividade'}
const activityLabels:Record<string,string>={rest:'Descanso',recovery:'Tratamento',training:'Treino'}
function recoveryDuration(operator:any){
 const minimum=operator.health<25?data.value.facilityRules?.seriousRecoveryTurns??0:0
 return Math.max(operator.recoveryTurns,minimum)
}
const rosterActions=computed(()=>new Map<string,RosterAction|null>(data.value.operators.map((operator:any)=>[
 operator.id,rosterRecommendation(operator,data.value.currentTurn,recoveryDuration(operator),scheduled(operator.id).length>0),
])))
const operatorOptions=computed<OperatorView[]>(()=>{
 const operator=selected.value
 if(!operator)return []
 const options:OperatorView[]=['renew']
 if(operator.employment){
  if(operator.health<100)options.push('recovery')
  if(operator.fatigue>0)options.push('rest')
  if(data.value.facilityRules)options.push('training')
 }
 if(operator.reservation&&operator.reservation.kind!=='mission')options.push('cancel')
 return options
})
function operatorStatus(operator:any){
 const action=rosterActions.value.get(operator.id)
 if(operator.reservation?.kind&&operator.reservation.kind!=='mission')return 'Conclusão prevista · '+dateAt(operator.reservation.end_turn)
 if(!operator.employment)return ''
 if(action==='renew')return 'Vínculo até '+dateAt(operator.employment.end_turn)
 if(action==='recovery'||action==='rest')return 'Duração prevista · '+formatCampaignDuration(action==='rest'?operator.restTurns:recoveryDuration(operator))
 return ''
}
const canUndo=(operator:any)=>operator.reservation?.start_turn===data.value.currentTurn&&!!operator.reservation
function isJointTraining(operator:any){
 return operator.reservation?.kind==='training'&&data.value.operators.some((other:any)=>other.id!==operator.id&&other.reservation?.source_id===operator.reservation.source_id)
}
function undoTrainingMember(squad:any){
 return data.value.operators.find((o:any)=>squad.memberIds.includes(o.id)&&canUndo(o)&&isJointTraining(o)&&!scheduled(o.id).length)?.id
}
const hireOrders=(candidateId:string)=>(data.value.pendingOrders??[]).filter((o:any)=>o.kind==='hire'&&o.command.candidateId===candidateId)
const operatorName=(id:string)=>formation.value.operators.find((o:any)=>o.id===id)?.name||'Não designado'
const leadershipLabel=(id:string)=>{const op=formation.value.operators.find((o:any)=>o.id===id);return `${operatorName(id)} · Liderança ${op?.attributes?.leadership??'—'}`}
async function refresh(){try{data.value=await $fetch(base()+'/personnel');for(const section of ['roster','squads','recruitment'])navigationNews.markRead(props.game.id,'operators.'+section);return true}catch(e:any){error.value=e.data?.message||'Não foi possível carregar os operadores.';return false}}
let historyRequest=0
async function details(op:any,view:OperatorView='profile'){
 const request=++historyRequest
 selected.value=op
 operatorView.value=view
 history.value=[]
 error.value=''
 if(view!=='profile')return
 try{
  const entries=await $fetch<any[]>(base()+'/operators/'+op.id+'/history')
  if(request===historyRequest&&selected.value?.id===op.id)history.value=entries
 }catch{if(request===historyRequest&&selected.value?.id===op.id)error.value='Não foi possível carregar o histórico.'}
}
function commandNotice(response:any){
 if(response.cancelledOrderId)return 'Ordem removida. A ação não será confirmada.'
 if(response.queued)return ''
 if(response.action==='activity_cancel'){
  if(!response.activityUndone)return 'Atividade interrompida. Os ganhos obtidos foram preservados.'
  return response.refundedCents?'Atividade desfeita. Estorno de '+money(response.refundedCents)+'.':'Atividade desfeita.'
 }
 if(['activity','squad_training'].includes(response.action))return 'Atividade iniciada. Conclusão prevista para '+dateAt(response.dueTurn)+'.'
 if(response.action==='renew')return 'Vínculo renovado, sem passagem de tempo.'
 if(response.action==='squad_delete')return 'Equipe desfeita. Os operadores continuam na companhia.'
 return 'Equipe salva. A organização é imediata e não avança o relógio.'
}
async function run(path:string,body:any,method='POST'){
 if(busy.value)return
 const command=pending.value||{path,body:{...body,requestId:crypto.randomUUID(),expectedVersion:data.value.stateVersion},method}
 pending.value=command;busy.value=true;emit('processing',true);error.value='';notice.value='';let done=false
 try{
  const response=await $fetch<any>(base()+command.path,{method:command.method as any,body:command.body})
  if(!await refresh())return;pending.value=null;confirmation.value=null;editing.value=false;selected.value=null;notice.value=commandNotice(response);done=true
 }catch(e:any){
  if(e.status>=400&&e.status<500){pending.value=null;await refresh()}
  error.value=e.data?.message||'Falha de conexão. Repetir usará o mesmo comando, sem duplicar efeitos.'
 }finally{busy.value=false;emit('processing',!!pending.value)}
 if(done)emit('changed')
}
function edit(s?:any){editorId.value=s?.id||'';squadName.value=s?.name||'';squadSpec.value=s?.specialization||'general';members.value=[...(s?.memberIds||[])];leader.value=s?.leaderId||'';deputy.value=s?.deputyId||'';posture.value=s?.directives.posture||'balanced';priority.value=s?.directives.priority||'team_safety';risk.value=s?.directives.riskTolerance||'medium';withdrawal.value=s?.directives.withdrawalPolicy||'normal';editing.value=true}
function save(){return run('/squads'+(editorId.value?'/'+editorId.value:''),{name:squadName.value,specialization:squadSpec.value,memberIds:members.value,leaderId:members.value.includes(leader.value)?leader.value:null,deputyId:members.value.includes(deputy.value)?deputy.value:null,directives:{posture:posture.value,priority:priority.value,riskTolerance:risk.value,withdrawalPolicy:withdrawal.value}},editorId.value?'PATCH':'POST')}
watch(()=>[props.game.id,props.game.stateVersion],async()=>{confirmation.value=null;selected.value=null;await refresh();comparisonIds.value=comparisonIds.value.filter(id=>data.value.candidates.some((candidate:any)=>candidate.id===id));if(!comparisonIds.value.length)comparisonOpen.value=false})
onMounted(async()=>{emit('processing',!!pending.value);await refresh()})

</script>
<template>
<div class="personnel" :aria-busy="busy" @click.capture="captureAction($event)">
 <ActionFeedback :target="feedbackTarget" section="operators" :turn="game.currentTurn" v-model:error="error" v-model:notice="notice" />
 <div v-if="pending&&!busy" class="panel"><p>Há um comando aguardando confirmação. Repetir consulta a mesma solicitação.</p><button class="primary action-block" @click="run(pending.path,pending.body,pending.method)">Repetir comando</button></div>
 <div class="personnel-summary"><span>{{data.employed||0}} / {{data.capacity||12}} vínculos ativos</span><span>{{money(data.weeklySalaryCents||0)}} / semana</span><span v-if="data.arrearsCents" class="debit">Em atraso: {{money(data.arrearsCents)}}</span></div>
 <div class="recruitment-toolbar personnel-toolbar">
  <input v-model="search" type="search" aria-label="Buscar operadores e candidatos" placeholder="Nome ou codinome">
  <button type="button" class="secondary" :aria-expanded="filtersOpen" aria-controls="personnel-filters" @click="filtersOpen=!filtersOpen">Filtros{{specialty?' (1)':''}}</button>
 </div>
 <div class="personnel-tools action-row">
  <button type="button" class="secondary candidate-only" :aria-pressed="onlyCandidates" @click="onlyCandidates=!onlyCandidates">Só candidatos</button>
  <button v-if="!onlyCandidates" type="button" class="secondary" :disabled="locked" @click="edit()">Nova equipe</button>
 </div>
 <div v-show="filtersOpen" id="personnel-filters" class="company-filters">
  <label class="personnel-label">Especialidade<select v-model="specialty"><option value="">Todas</option><option v-for="(label,key) in specs" :key="key" :value="key">{{label}}</option></select></label>
  <label class="personnel-label">Ordenar candidatos<select v-model="candidateSort"><option value="salary">Menor salário</option><option value="bonus">Menor bônus</option><option value="level">Maior nível</option><option value="leadership">Maior liderança</option></select></label>
  <button v-if="specialty||search.trim()" type="button" class="secondary action-block" @click="search='';specialty=''">Limpar busca e filtros</button>
 </div>
 <section v-if="!onlyCandidates" class="personnel-directory" aria-labelledby="personnel-roster">
  <h2 id="personnel-roster">Efetivo</h2>
  <PendingOrderNotice :orders="(data.pendingOrders??[]).filter((order:any)=>order.kind==='squad_create')" :disabled="locked" @remove="run('/orders/'+$event+'/cancel',{})" />
  <p v-if="!rosterGroups.length" class="directory-empty">{{search.trim()||specialty?'Nenhum operador corresponde aos filtros.':'Nenhum operador contratado.'}}</p>
  <section v-for="group in rosterGroups" :key="group.key" class="roster-group" :aria-labelledby="'roster-group-'+group.key">
   <div v-if="!group.squad" class="roster-group-heading roster-group-static">
    <h3 :id="'roster-group-'+group.key" class="roster-group-name">{{group.name}}</h3>
    <span class="roster-group-status">{{group.total}} {{group.total===1?'operador':'operadores'}}</span>
   </div>
   <template v-for="s in group.squad?[group.squad]:[]" :key="s.id">
    <details class="card-details squad-controls" data-action-card :id="'personnel-s-'+s.id">
     <summary class="roster-group-heading">
      <span :id="'roster-group-'+group.key" class="roster-group-name">{{group.name}}</span>
      <span class="roster-group-status">
       <span>{{group.total}} {{group.total===1?'operador':'operadores'}}</span>
       <StateBadge :status="s.ready?'ready':'unready'" :label="s.ready?'Pronta':'Pendente'" />
      </span>
     </summary>
     <div class="squad-controls-body">
      <p>{{squadView(s).available}} de {{squadView(s).total}} disponíveis</p>
      <p>Líder · {{operatorName(s.leaderId)}}<br>Substituto · {{operatorName(s.deputyId)}}<br>Líder apto · {{operatorName(s.effectiveLeaderId)}}<br>Familiaridade · {{s.familiarity}} / 100</p>
      <ul v-if="squadView(s).issues.length"><li v-for="issue in squadView(s).issues" :key="issue">{{issue}}</li></ul>
      <div class="personnel-actions">
       <button type="button" class="primary" :disabled="locked" @click="edit(s)">Editar formação</button>
       <button type="button" class="secondary" :disabled="locked||!s.ready||!!scheduled(s.id).length" @click="run('/squads/'+s.id+'/training',{})">Treinar juntos<template v-if="data.facilityRules"> · {{formatCampaignDuration(data.facilityRules.activityTurns)}}</template></button>
       <button v-if="undoTrainingMember(s)" type="button" class="secondary" :disabled="locked" @click="run('/operators/'+undoTrainingMember(s)+'/activities/cancel',{})">Desfazer treino conjunto</button>
       <button type="button" class="secondary" :disabled="locked" @click="run('/squads/'+s.id,{},'DELETE')">Desfazer equipe</button>
      </div>
      <PendingOrderNotice :orders="scheduled(s.id)" :disabled="locked" @remove="run('/orders/'+$event+'/cancel',{})" />
     </div>
    </details>
   </template>
   <div class="personnel-grid compact-roster">
    <article v-for="o in group.operators" :key="o.id" data-action-card :id="'personnel-o-'+o.id" class="panel operator-card">
     <OperatorCardIdentity :person="o" :specialty="specs[o.specialization]" show-xp />
     <div class="roster-state">
      <StateBadge :status="o.availability" :label="o.employment?states[o.availability]||'Indisponível':'Vínculo encerrado'" />
      <span v-if="scheduled(o.id).length">Ordem agendada</span>
     </div>
     <div class="roster-facts">
      <dl class="roster-vitals">
       <div><dt>Saúde</dt><dd>{{o.health}}/100</dd></div>
       <div><dt>Fadiga</dt><dd>{{o.fatigue}}/100</dd></div>
      </dl>
      <div class="operator-highlights"><span v-for="attribute in strongest(o)" :key="attribute.label">{{attribute.label}} <strong>{{attribute.value}}</strong></span></div>
     </div>
     <p v-if="o.arrearsCents" class="debit">Salário em atraso · {{money(o.arrearsCents)}}</p>
     <p v-if="operatorStatus(o)" class="roster-timing">{{operatorStatus(o)}}</p>
     <div class="roster-actions action-row">
      <template v-for="action in [rosterActions.get(o.id)]" :key="action??'none'">
       <button v-if="action" type="button" class="primary" :disabled="locked" @click="details(o,action)">{{actionLabels[action]}}</button>
      </template>
      <button type="button" class="secondary" @click="details(o)">Ficha</button>
     </div>

     <FocusDialog v-if="selected?.id===o.id" :title="actionLabels[operatorView]" :busy="busy" :error="error" @close="selected=null">
      <section class="operator-sheet">
       <h3>{{o.name}}</h3>
       <template v-if="operatorView==='profile'">
        <p>{{specs[o.specialization]}} · Nível {{o.level}} · XP {{o.xp}}<template v-if="o.callsign"> · {{o.callsign}}</template></p>
        <PendingOrderNotice :orders="scheduled(o.id)" :disabled="locked" @remove="run('/orders/'+$event+'/cancel',{})" />
        <p v-if="o.employment">{{money(o.employment.salary_cents)}} / semana · próximo salário {{dateAt(o.employment.next_pay_turn)}}<br>Vínculo até {{dateAt(o.employment.end_turn)}}</p>
        <p v-if="o.reservation&&o.reservation.kind!=='mission'">{{activityLabels[o.reservation.kind]}} · conclusão prevista para {{dateAt(o.reservation.end_turn)}}</p>
        <div class="action-row">
         <button v-for="option in operatorOptions" :key="option" type="button" class="secondary" :disabled="locked" @click="details(o,option)">{{actionLabels[option]}}</button>
        </div>
        <details class="card-details">
         <summary>Atributos e condição</summary>
         <dl class="personnel-attributes"><div v-for="(label,key) in labels" :key="key"><dt>{{label}}</dt><dd>{{o.attributes[key]}}</dd></div></dl>
         <p v-if="o.traits?.length">Traços · {{o.traits.map((t:string)=>traits[t]||t).join(', ')}}</p>
         <p>Saúde {{o.health}} · Fadiga {{o.fatigue}} · Moral {{o.morale}} · Lealdade {{o.loyalty}}</p>
        </details>
        <details class="card-details">
         <summary>Histórico</summary>
         <p v-if="!history.length">Nenhum registro.</p>
         <div v-for="(event,i) in history" :key="i" class="brief-line"><span>{{dateAt(event.turn,true)}}</span><strong>{{event.title}}</strong></div>
        </details>
       </template>

       <template v-else>
        <template v-if="operatorView==='renew'">
         <p v-if="o.employment">Vínculo atual até {{dateAt(o.employment.end_turn)}}.</p>
         <p v-else>Vínculo encerrado.</p>
         <p v-if="o.arrearsCents" class="debit">Quite {{money(o.arrearsCents)}} em salários antes de renovar.</p>
         <p v-else-if="!o.employment&&data.employed>=data.capacity">Limite de vínculos atingido.</p>
         <label class="personnel-label">Duração
          <select v-model.number="weeks" :disabled="locked"><option :value="4">4 semanas</option><option :value="8">8 semanas</option><option :value="12">12 semanas</option></select>
         </label>
         <p>Novo prazo · {{dateAt((o.employment?.end_turn??data.currentTurn)+weeks*28)}} · sem bônus.</p>
        </template>
        <template v-else-if="operatorView==='rest'||operatorView==='recovery'">
         <p v-if="operatorView==='rest'">Fadiga {{o.fatigue}}/100 · duração {{formatCampaignDuration(o.restTurns)}} · sem custo.</p>
         <p v-else>Saúde {{o.health}}/100 · duração {{formatCampaignDuration(recoveryDuration(o))}} · {{data.facilityRules?.treatmentCostCents?money(data.facilityRules.treatmentCostCents):'sem custo'}}.</p>
         <p v-if="operatorView==='recovery'&&o.health<25&&data.facilityRules">Tratamento mínimo de {{formatCampaignDuration(data.facilityRules.seriousRecoveryTurns)}}.</p>
         <p v-if="o.reservation||scheduled(o.id).length">Há uma atividade, missão ou ordem em aberto para este operador.</p>
         <p v-else-if="o.employment.end_turn<data.currentTurn+(operatorView==='rest'?o.restTurns:recoveryDuration(o))">Renove o vínculo antes de iniciar esta atividade.</p>
         <p v-else>Conclusão estimada em {{dateAt(data.currentTurn+(operatorView==='rest'?o.restTurns:recoveryDuration(o)))}}.</p>
        </template>
        <template v-else-if="operatorView==='training'&&data.facilityRules">
         <label class="personnel-label">Atributo
          <select :value="trainingAttributes[o.id]||'combat'" @change="trainingAttributes[o.id]=($event.target as HTMLSelectElement).value" :disabled="locked">
           <option v-for="(label,key) in labels" :key="key" :value="key">{{label}}</option>
          </select>
         </label>
         <p>{{money(data.facilityRules.trainingCostCents)}} · {{formatCampaignDuration(data.facilityRules.activityTurns)}} · {{data.trainingCapacity}} vagas na sede.</p>
         <p v-if="o.trainingEstimates&&!o.reservation">
          Atributo {{o.trainingEstimates[trainingAttributes[o.id]||'combat'].attributeBefore}} → {{o.trainingEstimates[trainingAttributes[o.id]||'combat'].attributeAfter}}
          · Progresso {{o.trainingEstimates[trainingAttributes[o.id]||'combat'].progressBefore}}% → {{o.trainingEstimates[trainingAttributes[o.id]||'combat'].progressAfter}}%.
         </p>
        </template>
        <template v-else-if="operatorView==='cancel'&&o.reservation">
         <p>{{activityLabels[o.reservation.kind]}} · conclusão prevista para {{dateAt(o.reservation.end_turn)}}.</p>
         <p v-if="!canUndo(o)&&(o.minimumTreatmentEndTurn??0)>data.currentTurn">Tratamento mínimo até {{dateAt(o.minimumTreatmentEndTurn)}}.</p>
         <p v-else-if="!canUndo(o)">A interrupção preserva os ganhos obtidos, sem reembolso.</p>
        </template>
        <div class="action-row">
         <button v-if="operatorView==='renew'" type="button" class="primary" :disabled="locked||!!o.arrearsCents||(!o.employment&&data.employed>=data.capacity)" @click="run('/operators/'+o.id+'/renew-contract',{weeks})">Confirmar renovação</button>
         <button v-else-if="operatorView==='rest'||operatorView==='recovery'" type="button" class="primary" :disabled="locked||!!o.reservation||!!scheduled(o.id).length||o.employment.end_turn<data.currentTurn+(operatorView==='rest'?o.restTurns:recoveryDuration(o))" @click="run('/operators/'+o.id+'/activities',{type:operatorView})">{{operatorView==='rest'?'Confirmar descanso':'Confirmar tratamento'}}</button>
         <button v-else-if="operatorView==='training'&&data.facilityRules" type="button" class="primary" :disabled="locked||!!o.reservation||!!scheduled(o.id).length" @click="run('/operators/'+o.id+'/activities',{type:'training',attribute:trainingAttributes[o.id]||'combat'})">Iniciar treino</button>
         <button v-else-if="operatorView==='cancel'&&o.reservation" type="button" class="primary" :disabled="locked||!!scheduled(o.id).length||(!canUndo(o)&&(o.minimumTreatmentEndTurn??0)>data.currentTurn)" @click="run('/operators/'+o.id+'/activities/cancel',{})">{{canUndo(o)?(isJointTraining(o)?'Desfazer treino conjunto':'Desfazer atividade'):'Interromper atividade'}}</button>
         <button type="button" class="secondary" :disabled="busy" @click="details(o)">Voltar à ficha</button>
        </div>
       </template>
      </section>
     </FocusDialog>
    </article>
   </div>
  </section>
 </section>
 <section class="personnel-directory" aria-labelledby="personnel-candidates">
  <div class="recruitment-meta directory-heading">
   <h2 id="personnel-candidates">Candidatos · {{candidates.length}}</h2>
   <small v-if="data.nextMarketTurn!=null">Ofertas até {{dateAt(data.nextMarketTurn)}}</small>
   <button v-if="comparison.length" type="button" class="secondary action-block" @click="comparisonOpen=true">Comparar ({{comparison.length}})</button>
  </div>
  <FocusDialog v-if="comparisonOpen&&comparison.length" title="Comparar operadores" @close="comparisonOpen=false"><section class="panel candidate-comparison" aria-label="Comparação de operadores"><div class="panel-heading"><h3>Comparar operadores</h3><button class="secondary" @click="comparisonIds=[];comparisonOpen=false">Limpar</button></div><p v-if="comparison.length===1">Selecione mais um candidato para comparar lado a lado.</p><div class="comparison-row comparison-heading"><span>Perfil</span><strong v-for="c in comparison" :key="c.id">{{c.name}}<small>{{specs[c.specialization]}} · nível {{c.level}}</small></strong></div><div class="comparison-row"><span>Salário / semana</span><strong v-for="c in comparison" :key="c.id">{{money(c.salaryCents)}}</strong></div><div class="comparison-row"><span>Bônus inicial</span><strong v-for="c in comparison" :key="c.id">{{money(c.signingBonusCents)}}</strong></div><div v-for="(label,key) in labels" :key="key" class="comparison-row"><span>{{label}}</span><strong v-for="c in comparison" :key="c.id">{{c.attributes[key]}}</strong></div></section></FocusDialog>
  <p v-if="data.candidates.length&&!candidates.length" class="empty">Nenhum candidato encontrado. <button type="button" class="secondary action-block" @click="search='';specialty=''">Limpar filtros</button></p>
  <p v-if="!data.candidates.length" class="empty">O mercado renova no próximo fechamento semanal.</p>
  <div class="personnel-grid compact-candidates">
   <article v-for="c in candidates" :key="c.id" data-action-card :id="'personnel-c-'+c.id" class="panel operator-card">
    <OperatorCardIdentity :person="c" :specialty="specs[c.specialization]" />
    <div class="candidate-facts">
     <span><small>Salário semanal</small><strong>{{money(c.salaryCents)}}</strong></span>
     <div class="operator-highlights"><span v-for="attribute in strongest(c)" :key="attribute.label">{{attribute.label}} <strong>{{attribute.value}}</strong></span></div>
     <span><small>Bônus inicial</small><strong>{{money(c.signingBonusCents)}}</strong></span>
     <span v-if="fitWeights.length"><small>Adequação à missão</small><strong>{{missionFitScore(fitWeights,c.attributes)}}/100</strong></span>
    </div>
    <div class="candidate-actions action-row">
     <button type="button" class="primary" :disabled="locked||!!c.scheduledOrderId||game.cashCents<c.signingBonusCents||data.employed>=data.capacity" @click="confirmation={candidate:c,weeks}" :aria-expanded="confirmation?.candidate.id===c.id">{{c.scheduledOrderId?'Contratação agendada':'Revisar contratação'}}</button>
     <button type="button" class="secondary compare-toggle" :disabled="comparison.length>=2&&!comparisonIds.includes(c.id)" :aria-pressed="comparisonIds.includes(c.id)" :aria-label="(comparisonIds.includes(c.id)?'Remover da comparação: ':'Comparar ')+c.name" @click="compareCandidate(c.id)">{{comparisonIds.includes(c.id)?'Selecionado':'Comparar'}}</button>
    </div>
    <p v-if="!c.scheduledOrderId&&(data.employed>=data.capacity||game.cashCents<c.signingBonusCents)" class="form-hint">{{data.employed>=data.capacity?'Limite de vínculos atingido.':'Caixa insuficiente para o bônus.'}}</p>
    <details class="card-details candidate-details">
     <summary>Atributos e perfil</summary>
     <dl class="personnel-attributes"><div v-for="(label,key) in labels" :key="key"><dt>{{label}}</dt><dd>{{c.attributes[key]}}</dd></div></dl>
     <p v-if="c.traits?.length">Traços: {{c.traits.map((t:string)=>traits[t]||t).join(', ')}}</p>
     <p v-if="fitWeights.length">A adequação usa os atributos da missão e serve para comparar perfis. O resultado também depende da equipe e das condições da operação.</p>
    </details>
    <PendingOrderNotice :orders="hireOrders(c.id)" :disabled="locked" @remove="run('/orders/'+$event+'/cancel',{})" />
    <FocusDialog v-if="confirmation?.candidate.id===c.id&&!c.scheduledOrderId" title="Revisar contratação" :busy="busy" :error="error" @close="confirmation=null"><section class="inline-action hire-confirm"><label class="personnel-label">Duração do vínculo<select v-model.number="confirmation.weeks" :disabled="locked"><option :value="4">4 semanas</option><option :value="8">8 semanas</option><option :value="12">12 semanas</option></select></label><h3>Contratar {{confirmation.candidate.name}}?</h3><p>O bônus de {{money(confirmation.candidate.signingBonusCents)}} será cobrado ao confirmar o avanço. Salário: {{money(confirmation.candidate.salaryCents)}} por semana durante {{confirmation.weeks}} semanas. Compromisso total: {{money(confirmation.candidate.signingBonusCents+confirmation.candidate.salaryCents*confirmation.weeks)}}.</p><p>Saldo previsto após confirmação: {{money(game.cashCents-confirmation.candidate.signingBonusCents)}}.</p><div class="personnel-actions"><button class="primary" :disabled="locked" @click="run('/recruitment/hire',{candidateId:confirmation.candidate.id,weeks:confirmation.weeks})">Agendar contratação</button><button class="secondary" :disabled="locked" @click="confirmation=null">Cancelar</button></div></section></FocusDialog><small v-if="game.cashCents<c.signingBonusCents">Caixa insuficiente para assinatura.</small><small v-else-if="data.employed>=data.capacity">Capacidade administrativa atingida.</small>
   </article>
  </div>
 </section>
  <FocusDialog v-if="editing" :title="editorId?'Editar formação':'Criar equipe'" :busy="busy" :error="error" @close="editing=false"><form data-action-card id="personnel-squad-editor" class="squad-form" @submit.prevent="save">
   <div class="squad-name-field" :class="{'with-suggestion':data.squadNameSuggestions?.length}">
    <label for="squad-name">Nome</label>
    <input id="squad-name" v-model="squadName" required minlength="2" maxlength="60" :disabled="locked" list="squad-name-options">
    <datalist id="squad-name-options"><option v-for="suggestion in data.squadNameSuggestions||[]" :key="suggestion" :value="suggestion" /></datalist>
    <button v-if="data.squadNameSuggestions?.length" type="button" class="secondary" :disabled="locked" @click="suggestSquadName">Sugerir nome</button>
   </div>
   <fieldset :disabled="locked"><legend>Membros · {{members.length}} / 6</legend><label v-for="o in available" :key="o.id" class="member-check"><input v-model="members" type="checkbox" :value="o.id" :disabled="!members.includes(o.id)&&(members.length>=6||assignedTeams.has(o.id))">{{o.name}} · {{assignedTeams.has(o.id)?'Já consta em '+assignedTeams.get(o.id):(data.operators.some((actual:any)=>actual.id===o.id)?states[o.availability]:'Contratação planejada')}}</label><p v-if="!available.length">Contrate operadores para formar uma equipe.</p></fieldset>
   <label class="personnel-label">Líder titular<select v-model="leader" :disabled="locked"><option value="">Não designado</option><option v-for="id in members" :key="id" :value="id">{{leadershipLabel(id)}}</option></select></label>
   <details class="advanced-options"><summary>Diretrizes avançadas</summary><label class="personnel-label">Especialização (opcional)<select v-model="squadSpec" :disabled="locked"><option v-for="(label,key) in specs" :key="key" :value="key">{{label}}</option></select></label><label class="personnel-label">Substituto (opcional)<select v-model="deputy" :disabled="locked"><option value="">Não designado</option><option v-for="id in members.filter(id=>id!==leader)" :key="id" :value="id">{{leadershipLabel(id)}}</option></select></label><label class="personnel-label">Postura<select v-model="posture" :disabled="locked"><option value="cautious">Cautelosa</option><option value="balanced">Equilibrada</option><option value="aggressive">Agressiva</option></select></label><label class="personnel-label">Prioridade<select v-model="priority" :disabled="locked"><option value="objective">Objetivo</option><option value="team_safety">Segurança da equipe</option><option value="deadline">Prazo</option></select></label><label class="personnel-label">Tolerância a risco<select v-model="risk" :disabled="locked"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label class="personnel-label">Política de retirada<select v-model="withdrawal" :disabled="locked"><option value="conservative">Conservadora</option><option value="normal">Normal</option><option value="persistent">Persistente</option></select></label></details>
   <p v-if="members.length<2||!members.includes(leader)" class="form-hint">Para ficar pronta, a equipe precisa de pelo menos dois membros e um líder.</p>
   <p v-else-if="members.some(id=>!data.operators.some((operator:any)=>operator.id===id))" class="form-hint">A equipe será confirmada junto com as contratações no próximo avanço.</p>
  </form>
  <template #footer>
   <div class="squad-editor-actions action-row">
    <button type="button" class="secondary" :disabled="locked" @click="editing=false">Cancelar</button>
    <button type="submit" form="personnel-squad-editor" class="primary" :disabled="locked">{{members.length>=2&&members.includes(leader)?'Salvar equipe':'Salvar rascunho'}}</button>
   </div>
  </template>
 </FocusDialog>
</div>
</template>
<style scoped>
.recruitment-toolbar,.recruitment-meta,.candidate-actions{display:flex;align-items:center;gap:var(--space-2)}
.recruitment-toolbar input{min-width:0;flex:1;min-height:46px;padding:8px 12px;border:1px solid var(--command-line);border-radius:10px;background:var(--command-surface);color:inherit}
.recruitment-toolbar .secondary,.candidate-actions .secondary{padding-inline:10px}
.personnel-toolbar{margin-bottom:var(--space-2)}
.personnel-tools{display:flex;gap:var(--space-2);flex-wrap:wrap}
.candidate-only[aria-pressed="true"]{background:var(--command-raised);border-color:var(--command-accent);color:var(--command-accent)}
.personnel-directory{display:grid;gap:var(--space-3);margin-top:var(--space-4)}
.personnel-directory>h2{margin-bottom:0}
.personnel-directory>.recruitment-meta{margin:0}
.directory-heading{flex-wrap:wrap}
.directory-heading h2{color:#edf2f3}
.directory-empty{color:#b6c9d1}
.squad-controls{margin:0 0 var(--space-2)}
.squad-controls-body{display:grid;gap:var(--space-2);padding-top:var(--space-1)}
.squad-controls-body .personnel-actions{margin:0}
.squad-controls-body ul{margin:0;padding-inline-start:var(--space-4)}
.recruitment-meta{justify-content:space-between;margin:var(--space-1) 0 var(--space-2);color:var(--command-info)}
.recruitment-meta .secondary{margin-left:auto}
.candidate-facts{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:center;gap:var(--space-1) var(--space-2)}
.candidate-facts>span{min-width:0}
.candidate-facts>span small{display:block;font-size:var(--text-caption);color:#b6c9d1}
.candidate-facts>span strong{font-size:var(--text-body)}
.operator-card .operator-highlights{margin:0;gap:var(--space-1)}
.operator-card .operator-highlights>span{padding:6px 8px}
.candidate-actions{align-items:stretch;flex-wrap:wrap}
.candidate-actions .primary{padding-inline:10px}
@media(min-width:641px){.candidate-actions .primary{flex:1}}
.candidate-actions button{font-size:var(--text-caption)}
.compact-candidates .operator-card{gap:var(--space-2)}
.compact-candidates .candidate-details{margin:0}
@media(max-width:600px){.compact-candidates .operator-card{padding:var(--space-3)}}
.compact-roster .operator-card{gap:var(--space-2)}
.roster-timing{font-size:var(--text-caption)}
.roster-facts,.roster-state,.roster-vitals{display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-2)}
.roster-state>span:not(.state-badge){font-size:var(--text-caption);color:var(--command-info)}
.roster-vitals{gap:var(--space-3);margin:0}
.roster-vitals>div{display:flex;gap:5px;align-items:baseline}
.roster-vitals dt{font-size:var(--text-caption);color:#b6c9d1}
.roster-vitals dd{margin:0;font-weight:600}
.operator-sheet{display:grid;gap:var(--space-3)}
.operator-sheet .personnel-label,.operator-sheet .card-details{margin:0}
.roster-group + .roster-group{margin-top:var(--space-3)}
.roster-group-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)}
.roster-group-name{min-width:0;color:#edf2f3;font-size:var(--text-section);font-weight:700;line-height:1.2;overflow-wrap:anywhere}
.roster-group-static{min-height:44px;margin-bottom:var(--space-2);padding-inline:var(--space-2)}
.roster-group-status{display:flex;align-items:center;gap:var(--space-2);flex-shrink:0;white-space:nowrap;font-size:var(--text-caption);color:#b6c9d1}
.roster-group-status .state-badge{padding:3px 7px}
.squad-form{gap:var(--space-3)}
.squad-name-field{display:grid;grid-template-columns:minmax(0,1fr);align-items:end;gap:var(--space-1) var(--space-2)}
.squad-name-field.with-suggestion{grid-template-columns:minmax(0,1fr) auto}
.squad-name-field label{grid-column:1/-1}
.squad-name-field input{margin:0}
.squad-name-field .secondary{min-height:48px;padding-inline:10px;font-size:var(--text-caption)}
.squad-form fieldset{min-width:0;margin:0;padding:var(--space-1) var(--space-3)}
.squad-form .member-check{padding-block:var(--space-1)}
.squad-form>.personnel-label,.squad-form>.advanced-options,.squad-form>.form-hint{margin:0}
.squad-form .advanced-options .personnel-label{margin:var(--space-2) 0}
.squad-editor-actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.compact-roster .operator-card{padding:var(--space-3)}}
</style>
