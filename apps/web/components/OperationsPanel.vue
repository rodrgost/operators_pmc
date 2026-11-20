<script setup lang="ts">
const {feedbackTarget,captureAction}=useActionFeedback()
const props=defineProps<{game:any;mode:string;regionId?:string;cardTarget?:{id:string}|null}>(),emit=defineEmits(['changed','processing','clear-region','open-world','navigate','card-opened'])
const navigationNews=useNavigationNews()
const data=ref<any>({contracts:[],missions:[],decisions:[]}),people=ref<any>({operators:[],squads:[]}),busy=ref(false),error=ref(''),notice=ref(''),filter=ref(''),selectedContract=ref<any>(null),selectedMission=ref<any>(null),reports=ref<any[]>([]),preview=ref<any>(null),withdrawal=ref<any>(null)
const panelElement=ref<HTMLElement|null>(null)
const operationSection=ref('missions'),planError=ref('')
const preparationStep=ref('team'),launchContract=ref(''),plannerElement=ref<HTMLElement|null>(null)
const missionContext=useState<any>('mission-preparation',()=>null)
const readiness=computed(()=>missionReadiness(selectedContract.value,people.value,planBody(),data.value.logistics?.inventory??[]))
const preparationSteps=[['team','Equipe'],['kits','Kits'],['plan','Plano'],['launch','Mobilização']]
function leavePreparation(destination:string,section:string){
 if(selectedContract.value)missionContext.value={gameId:props.game.id,contractId:selectedContract.value.id,title:selectedContract.value.title,type:selectedContract.value.type,requiredEquipment:selectedContract.value.requiredEquipment}
 emit('navigate',destination,section)
}
watch(()=>[selectedContract.value?.id,preparationStep.value],async()=>{await nextTick();plannerElement.value?.scrollIntoView({block:'start',behavior:'instant'})})
function closePreparation(){selectedContract.value=null;preview.value=null;missionContext.value=null}
function stepReady(step:string){return step==='team'?readiness.value.teamIssues.length===0:step==='kits'?readiness.value.missingEquipment.length===0:step==='plan'?!!preview.value:false}

const visibleMissions=computed(()=>data.value.missions.filter((m:any)=>operationSection.value==='history'?!['active','awaiting_decision','returning'].includes(m.status):['active','awaiting_decision','returning'].includes(m.status)))
const statusFilter=ref('actionable'),search=ref('')
const intelContract=ref<any>(null),departure=ref<any>(null)
const equipmentIds=ref<string[]>([])
const equipmentNames:any={combat:'Combate',recon:'Reconhecimento',medical:'Médico',technical:'Técnico',communication:'Comunicação',logistics:'Logístico'}
const squadId=ref(''),members=ref<string[]>([]),reinforcements=ref<string[]>([]),leader=ref(''),deputy=ref(''),posture=ref('balanced'),priority=ref('team_safety'),risk=ref('medium'),policy=ref('normal')
const pendingStore=useState<Record<string,any>>('operation-commands',()=>({}))
const pending=computed({get:()=>pendingStore.value[props.game.id]??null,set:(value:any)=>{pendingStore.value={...pendingStore.value,[props.game.id]:value}}})
const locked=computed(()=>busy.value||!!pending.value),base=()=>'/api/v1/games/'+props.game.id
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100)
const statusNames:any={rival_active:'Em execução por rival',rival_completed:'Concluído por rival',rival_failed:'Rival fracassou',available:'Disponível',accepted:'Aceito',active:'Em execução',awaiting_decision:'Aguardando decisão',returning:'Retornando',completed:'Concluído',failed:'Fracassado',expired:'Expirado',cancelled:'Cancelado',withdrawn:'Retirada concluída'}
const typeNames:any={security:'Segurança',escort:'Escolta',reconnaissance:'Reconhecimento',extraction:'Extração',recovery:'Recuperação',rescue:'Resgate'}
const outcomeNames:any={success:'Sucesso',partial:'Parcial',delay:'Atraso',failure:'Falha',complication:'Complicação',completed:'Concluída',failed:'Fracassada',withdrawn:'Retirada',decision:'Decisão solicitada'}
const closingReport=computed(()=>reports.value.find(report=>report.paymentCents!==undefined))
const progressReports=computed(()=>reports.value.filter(report=>report!==closingReport.value))
function reportHeading(report:any){
 return report.title.replace(/ · (sucesso|resultado parcial|atraso|falha|complicação)$/i,'')
}

const contracts=computed(()=>data.value.contracts.filter((c:any)=>(!filter.value||c.type===filter.value)&&(!props.regionId||c.regionId===props.regionId)&&(statusFilter.value==='all'||statusFilter.value==='actionable'?statusFilter.value==='all'||['available','accepted'].includes(c.status):c.status===statusFilter.value)&&(!search.value||[c.title,c.regionName,c.countryName,c.clientName].join(' ').toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR')))).sort((a:any,b:any)=>contractRank(a)-contractRank(b)||(a.mobilizationDueTurn??a.expiresTurn??Infinity)-(b.mobilizationDueTurn??b.expiresTurn??Infinity)))
function contractRank(c:any){return c.status==='accepted'?0:(data.value.pendingOrders??[]).some((o:any)=>o.target===c.id&&o.kind==='accept')?1:c.status==='available'?2:3}
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
   ' no turno '+mission.stageDueTurn+(deadline!=null&&mission.stageDueTurn>=deadline?' · coincide com o prazo ou ocorre depois':'')
 }
 const end=reservation.end_turn
 return end==null?label:label+' · atividade prevista até o turno '+end+
  (deadline!=null&&end>=deadline?' · coincide com o prazo ou termina depois':'')
}
const scheduled=(target:string,kind?:string)=>(data.value.pendingOrders??[]).filter((o:any)=>o.target===target&&(!kind||o.kind===kind))
const name=(id:string)=>people.value.operators.find((o:any)=>o.id===id)?.name||id
const leadershipLabel=(id:string)=>{const op=people.value.operators.find((o:any)=>o.id===id);return `${name(id)} · Liderança ${op?.attributes?.leadership??'—'}`}
async function refresh(){try{const [ops,staff]=await Promise.all([$fetch<any>(base()+'/operations'),$fetch<any>(base()+'/personnel')]);data.value=ops;people.value=(staff as any).plannedPersonnel??staff;
 if(selectedContract.value){const updated=ops.contracts.find((c:any)=>c.id===selectedContract.value.id);if(updated&&['available','accepted'].includes(updated.status)){selectedContract.value=updated;if(!squadId.value&&people.value.squads.length){squadId.value=people.value.squads[0].id;chooseSquad()}}else closePreparation()}
 navigationNews.markRead(props.game.id,props.mode==='contracts'?'contracts':'operations.'+operationSection.value);return true}catch(e:any){error.value=e.data?.message||'Não foi possível carregar as operações.';return false}}
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
 if(history.status==='fulfilled')reports.value=history.value
 if(detail.status==='rejected'||history.status==='rejected')error.value='Não foi possível carregar todos os relatórios. Tente abrir novamente.'
 reportsLoading.value=false
}

watch(()=>[props.cardTarget,data.value,operationSection.value],()=>{
 const target=props.cardTarget
 if(!target)return
 const card=document.getElementById(target.id)
 if(!panelElement.value?.contains(card)||!card)return
 card.focus({preventScroll:true})
 card.scrollIntoView({block:'center',behavior:'instant'})
 emit('card-opened',target)
},{flush:'post'})

watch(operationSection,()=>{selectedMission.value=null;withdrawal.value=null})
watch(()=>[props.game.id,props.game.stateVersion],async()=>{if(preview.value?.stateVersion!==props.game.stateVersion)preview.value=null;selectedMission.value=null;await refresh()})
onMounted(async()=>{emit('processing',!!pending.value);await refresh()})

watch([operationSection,()=>props.mode],()=>{if(data.value?.stateVersion!==undefined)navigationNews.markRead(props.game.id,props.mode==='contracts'?'contracts':'operations.'+operationSection.value)})
</script>
<template>
<div ref="panelElement" class="operations-panel" :aria-busy="busy" @click.capture="captureAction($event)">
 <ActionFeedback :target="feedbackTarget" :error="error" :notice="notice" />
 <section v-if="pending&&!busy" class="panel"><p>Comando aguardando confirmação. A repetição não duplica efeitos.</p><button class="primary" @click="run(pending.path,pending.body)">Repetir comando</button></section>
 <section v-if="launchContract&&mode==='contracts'&&(scheduled(launchContract,'start').length||data.missions.some((m:any)=>m.contractId===launchContract))" class="panel mission-handoff"><h2>{{scheduled(launchContract,'start').length?'Início agendado':'Acompanhe sua missão'}}</h2><p>{{scheduled(launchContract,'start').length?'O início agendado será confirmado no próximo avanço. Confira as ordens e os custos antes de passar o turno.':'O início foi confirmado. Consulte o andamento e os relatórios em Operações.'}}</p><button class="primary" :disabled="locked" @click="emit('navigate','operations','missions')">Acompanhar operações →</button></section>
 <section v-if="mode==='operations'&&(data.pendingOrders??[]).some((o:any)=>o.kind==='start')" class="panel mission-handoff"><h2>Mobilização aguardando confirmação</h2><p>Avance o tempo para confirmar o início. A equipe e os kits ainda não estão reservados.</p><button class="secondary" :disabled="locked" @click="emit('navigate','contracts')">Revisar contratos →</button></section>
 <div class="personnel-summary"><span>{{data.missions.filter((m:any)=>['active','awaiting_decision','returning'].includes(m.status)).length}} / {{data.capacity||1}} operações simultâneas</span><span>{{data.decisions.length}} decisões pendentes</span></div>
 <SectionNav :game-id="game.id" scope="operations" v-if="mode==='operations'" v-model="operationSection" label="Seções de operações" :disabled="locked" :items="[['missions','Em andamento'],['decisions','Decisões ('+data.decisions.length+')'],['history','Histórico']]" />
 <p v-if="mode==='contracts'&&data.decisions.length" class="batch-result">{{data.decisions.length}} decisão(ões) pendente(s). Consulte Operações → Decisões.</p>
 <template v-if="mode==='operations'&&operationSection==='decisions'"><p v-if="!data.decisions.length" class="empty">Nenhuma decisão pendente.</p><section v-for="d in data.decisions" :key="d.id" data-action-card tabindex="-1" :id="'operations-d-'+d.id" class="panel decision-card"><span class="eyebrow">DECISÃO DO COMANDANTE</span><h2>{{d.title}}</h2><p>{{d.description}} Prazo: turno {{d.expiresTurn}}. Sem resposta: {{d.options.find((option:any)=>option.id===d.fallbackAction)?.label}}. O tempo pode avançar e aplicar essa política.</p><PendingOrderNotice :orders="scheduled(d.id)" :disabled="locked" @remove="run('/orders/'+$event+'/cancel')" /><div v-for="o in d.options" :key="o.id" class="decision-option"><p><strong>{{o.label}}</strong><br>{{o.consequence}}</p><button class="secondary" :disabled="locked||!!scheduled(d.id).length" @click="run('/decisions/'+d.id+'/resolve',{choice:o.id})">{{o.label}}</button></div></section>
 </template><template v-if="mode==='contracts'">
  <div v-if="!selectedContract" class="section-intro"><h2>Contratos e demandas emergentes</h2><p>Estimativas do contratante podem estar incorretas. Aceitar é imediato e inicia um prazo próprio de mobilização, sem reservar operadores ou movimentar o caixa.</p><p>{{data.logisticsNote}}</p></div>
  <section v-if="selectedContract" ref="plannerElement" class="panel mission-planner"><button class="secondary" :disabled="locked" @click="closePreparation">← Voltar aos contratos</button><span class="eyebrow planner-location">{{selectedContract.regionName}} · {{selectedContract.countryName}}</span><h2>{{selectedContract.title}}</h2><p>{{selectedContract.status==='accepted'?'Mobilizar antes do turno '+selectedContract.mobilizationDueTurn:'Contrato ainda não aceito. Você pode preparar a formação antes de assumir o prazo.'}}</p>
   <details class="card-details"><summary>Briefing e requisitos do contrato</summary><p v-if="selectedContract.briefing">{{selectedContract.briefing}}</p><p><OrganizationEmblem :id="selectedContract.clientId" />Contratante: {{selectedContract.clientName}} · remuneração máxima {{money(selectedContract.rewardCents)}}.</p><p>Risco estimado {{selectedContract.estimatedRisk.min}}–{{selectedContract.estimatedRisk.max}} · dificuldade {{selectedContract.estimatedDifficulty.min}}–{{selectedContract.estimatedDifficulty.max}}. Confiança {{selectedContract.confidence}}%.</p><p>Mínimo: {{selectedContract.minimumOperators}} operadores · kits {{selectedContract.requiredEquipment.map((id:string)=>equipmentNames[id]).join(', ')||'sem categoria obrigatória'}}.</p></details><nav class="preparation-nav" aria-label="Etapas da missão"><button v-for="(step,index) in preparationSteps" :key="step[0]" :class="{active:preparationStep===step[0]}" :aria-current="preparationStep===step[0]?'step':undefined" :disabled="locked" @click="preparationStep=step[0]"><span>{{stepReady(step[0])?'✓':index+1}}</span>{{step[1]}}</button></nav><form @submit.prevent="review" @change="preview=null;planError=''">
   <section v-show="preparationStep==='team'" class="preparation-stage"><h3>Quem vai para a missão?</h3><MissionFit :contract="selectedContract" :operators="people.operators" :inventory="data.logistics?.inventory" /><p v-if="selectedContract.status==='accepted'">Mobilize antes do turno {{selectedContract.mobilizationDueTurn}}.</p><p v-else>Aceite antes do turno {{selectedContract.expiresTurn}}. O prazo de mobilização começa após o aceite.</p><p>Mínimo do contrato: {{selectedContract.minimumOperators}} operadores. As reservas só ocorrem ao confirmar o início.</p><div class="preparation-links"><button type="button" class="secondary" :disabled="locked" @click="leavePreparation('operators','squads')">Gerenciar equipes →</button><button type="button" class="secondary" :disabled="locked" @click="leavePreparation('operators','recruitment')">Recrutar operadores →</button></div><label class="personnel-label">Equipe permanente<select v-model="squadId" :disabled="locked" required @change="chooseSquad"><option value="">Selecione</option><option v-for="s in people.squads" :key="s.id" :value="s.id">{{s.name}}</option></select></label>
   <fieldset :disabled="locked"><legend>Permanentes enviados (2 a 6)</legend><label v-for="o in permanentOptions" :key="o.id" class="member-check"><input v-model="members" type="checkbox" :value="o.id" :disabled="o.availability!=='available'">{{o.name}} · {{planningAvailability(o)}}</label></fieldset>
   <fieldset :disabled="locked"><legend>Reforços temporários (até 2)</legend><label v-for="o in people.operators.filter((o:any)=>!members.includes(o.id)&&o.employment)" :key="o.id" class="member-check"><input v-model="reinforcements" type="checkbox" :value="o.id" :disabled="o.availability!=='available'||(!reinforcements.includes(o.id)&&reinforcements.length>=2)">{{o.name}} · {{planningAvailability(o)}}</label><p>Vínculos com equipes permanentes serão preservados.</p></fieldset>
   <label class="personnel-label">Líder presente<select v-model="leader" :disabled="locked"><option value="">Selecionar líder</option><option v-for="id in [...members,...reinforcements]" :key="id" :value="id">{{leadershipLabel(id)}}</option></select></label>
   <label class="personnel-label">Substituto<select v-model="deputy" :disabled="locked"><option value="">Sem substituto</option><option v-for="id in [...members,...reinforcements].filter(id=>id!==leader)" :key="id" :value="id">{{leadershipLabel(id)}}</option></select></label>
<ul v-if="readiness.teamIssues.length" class="preparation-issues"><li v-for="issue in readiness.teamIssues" :key="issue">{{issue}}</li></ul><div class="personnel-actions"><button type="button" class="secondary" :disabled="locked||!squadId" @click="chooseSquad">Usar formação atual da equipe</button><button type="button" class="primary" :disabled="locked||!stepReady('team')" @click="preparationStep='kits'">Continuar para kits →</button></div></section>
   <section v-show="preparationStep==='kits'" class="preparation-stage"><h3>Equipamentos da missão</h3><div class="preparation-links"><button type="button" class="secondary" :disabled="locked" @click="leavePreparation('infrastructure','catalog')">Comprar kits →</button><button type="button" class="secondary" :disabled="locked" @click="leavePreparation('infrastructure','inventory')">Estoque e serviços →</button></div><fieldset v-if="data.logistics" :disabled="locked"><legend>Kits da missão</legend><p>Obrigatórios: {{selectedContract.requiredEquipment.map((id:string)=>equipmentNames[id]).join(', ')||'nenhum'}}. A prévia não reserva estoque.</p><label v-for="k in data.logistics.inventory.filter((k:any)=>k.ready)" :key="k.id" class="member-check"><input v-model="equipmentIds" type="checkbox" :value="k.id">{{k.name}} · condição {{k.condition}} · suprimentos {{k.supplies}} · carga {{k.weight}}</label><p v-if="!data.logistics.inventory.some((k:any)=>k.ready)">Nenhum kit apto. Compre e prepare em Sede e logística.</p></fieldset>
<p v-if="readiness.missingEquipment.length" class="preparation-issues">Faltam kits aptos selecionados: {{readiness.missingEquipment.map((id:string)=>equipmentNames[id]||id).join(', ')}}.</p><p v-else class="preparation-ok">✓ Categorias obrigatórias selecionadas. A carga será conferida na validação.</p><button type="button" class="primary" :disabled="locked||!stepReady('kits')" @click="preparationStep='plan'">Continuar para o plano →</button></section>
   <section v-show="preparationStep==='plan'" class="preparation-stage"><h3>Revise o plano</h3><p>{{[...members,...reinforcements].length}} operadores · {{equipmentIds.length}} {{equipmentIds.length===1?'kit':'kits'}} · líder {{name(leader)||'não definido'}}.</p><details class="advanced-options"><summary>Diretrizes da missão</summary><p>A formação usa as diretrizes da equipe. Abra para revisar ou ajustar antes do envio.</p><div class="planning-directives"><label class="personnel-label">Postura<select v-model="posture" :disabled="locked"><option value="cautious">Cautelosa</option><option value="balanced">Equilibrada</option><option value="aggressive">Agressiva</option></select></label><label class="personnel-label">Prioridade<select v-model="priority" :disabled="locked"><option value="objective">Objetivo</option><option value="team_safety">Segurança da equipe</option><option value="deadline">Prazo</option></select></label><label class="personnel-label">Tolerância a risco<select v-model="risk" :disabled="locked"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label class="personnel-label">Política de retirada<select v-model="policy" :disabled="locked"><option value="conservative">Conservadora</option><option value="normal">Normal</option><option value="persistent">Persistente</option></select></label></div></details>
   <div class="personnel-actions"><p v-if="planError" class="error plan-validation" role="alert">{{planError}}</p><p v-if="selectedContract.status==='available'">Aceitar inicia o prazo de mobilização e não cobra valores. Confira sua preparação antes de aceitar.</p><button v-if="selectedContract.status==='available'" class="primary" type="button" :disabled="locked" @click="run('/contracts/'+selectedContract.id+'/accept')">Aceitar contrato e validar plano</button><button v-else class="primary" :disabled="locked">Validar formação e custos</button><button class="secondary" type="button" :disabled="locked" @click="closePreparation">Fechar planejamento</button></div></section>
  </form><section v-if="preparationStep==='launch'" class="preparation-stage"><h3>Confirmação de mobilização</h3><p v-if="!preview">Valide a formação e os custos antes de agendar o início. Alterações na campanha exigem nova validação.</p><button v-if="!preview" class="secondary" :disabled="locked" @click="preparationStep='plan'">Voltar à revisão do plano →</button><div v-if="preview" class="plan-review"><h3>Revisão de início</h3><p v-if="preview.intelligenceAdvice">{{preview.intelligenceAdvice}}</p><p>{{preview.operatorIds.map(name).join(', ')}}</p><p>Mobilização: {{money(preview.mobilizationCents)}}<br>Adiantamento: {{money(preview.advanceCents)}}<br>Saldo previsto: {{money(preview.cashAfterCents)}}<br>Reserva máxima inicial: {{preview.maxTurns}} turnos.<br>Carga dos kits: {{preview.load}} / {{preview.loadCapacity}}.</p><p>Falha ou retirada devolve o adiantamento e mantém a despesa de mobilização. Condições e reputação podem mudar. Kits selecionados ficam indisponíveis até o retorno; desgaste e consumo não geram débito adicional.</p><button class="primary" :disabled="locked" @click="run('/contracts/'+selectedContract.id+'/start',{...preview.body,expectedVersion:preview.stateVersion})">Agendar início da missão</button></div></section></section>
  <template v-if="!selectedContract">
  <p v-if="regionId">País: {{data.contracts.find((c:any)=>c.regionId===regionId)?.regionName||'país selecionado'}} <button class="secondary" @click="emit('clear-region')">Ver todos os países</button></p>

  <div class="contract-filters"><label class="personnel-label">Buscar contrato ou país<input v-model="search" type="search" placeholder="Nome, local ou contratante"></label><label class="personnel-label">Filtrar situação<select v-model="statusFilter"><option value="actionable">Disponíveis e aceitos</option><option value="all">Todas as situações</option><option value="available">Disponíveis</option><option value="accepted">Aceitos</option><option value="active">Missões da companhia</option><option value="rival_active">Em execução por rival</option></select></label><label class="personnel-label">Filtrar tipo<select v-model="filter"><option value="">Todos os tipos</option><option v-for="(label,key) in typeNames" :key="key" :value="key">{{label}}</option></select></label></div><p class="form-hint">{{contracts.length}} {{contracts.length===1?'contrato':'contratos'}} · Aceitos primeiro; depois, próximos prazos.</p>

  <section v-if="!contracts.length" class="empty action-empty"><h3>Nenhum contrato encontrado</h3><template v-if="search||filter||regionId||statusFilter!=='actionable'"><p>Tente ampliar os filtros para consultar outras ofertas.</p><button class="secondary" :disabled="locked" @click="search='';filter='';statusFilter='actionable';emit('clear-region')">Limpar filtros →</button></template><template v-else><p>Novas ofertas chegam no turno {{game.currentTurn+(28-game.currentTurn%28)}}. Enquanto isso, prepare os operadores, a equipe e os kits.</p><button class="secondary" :disabled="locked" @click="emit('navigate','overview')">Preparar companhia →</button></template></section>
  <div class="personnel-grid compact-contracts"><article v-for="c in contracts" :key="c.id" data-action-card :id="'operations-c-'+c.id" class="panel operator-card"><div class="card-status-line"><span class="eyebrow">{{typeNames[c.type]}}</span><StateBadge :status="scheduled(c.id).length?'planned':c.status" :label="scheduled(c.id).length?'Ação agendada':statusNames[c.status]||c.status" /></div><h3>{{c.title}}</h3><p class="contract-location">{{c.countryName}}<br>{{c.status==='accepted'?'Mobilizar antes do turno':'Aceitar antes do turno'}} {{c.mobilizationDueTurn??c.expiresTurn}}</p><div class="contract-key-facts"><span><small>Remuneração máxima</small><strong>{{money(c.rewardCents)}}</strong></span><span><small>Equipe mínima</small><strong>{{c.minimumOperators}} operadores</strong></span></div><p class="contract-estimates">Risco estimado {{c.estimatedRisk.min}}–{{c.estimatedRisk.max}} · Dificuldade {{c.estimatedDifficulty.min}}–{{c.estimatedDifficulty.max}}<small>Estimativas · {{c.confidence}}% de confiança</small></p><p v-if="c.requiredEquipment.length" class="contract-equipment">Kits: {{c.requiredEquipment.map((id:string)=>equipmentNames[id]).join(', ')}}</p><details class="card-details contract-briefing"><summary>Briefing, contratante e pagamento</summary><p v-if="c.briefing">{{c.briefing}}</p><p v-if="c.context">{{c.context}}</p><p><OrganizationEmblem :id="c.clientId" />{{c.source==='commercial'?'Oferta comercial':'Demanda emergente'}} · {{c.clientName}}</p><p>Fonte: {{c.intelSource}} · confiança {{c.confidence}}%<br>Adiantamento: {{money(c.advanceCents)}}</p></details><div class="personnel-actions"><button class="secondary" @click="intelContract=c">Inteligência e análises</button><button v-if="c.originEventId" class="secondary" @click="emit('open-world',{regionId:c.regionId,eventId:c.originEventId})">Consultar notícia de origem</button><button v-if="c.status==='available'" class="primary" :disabled="locked||!!scheduled(c.id).length" @click="plan(c)">{{scheduled(c.id,'accept').length?'Aceite agendado':'Preparar missão'}}</button><template v-if="(c.status==='accepted'||scheduled(c.id,'accept').length)&&!scheduled(c.id,'start').length&&!scheduled(c.id,'cancel').length"><button class="primary" :disabled="locked" @click="plan(c)">Planejar missão</button><button v-if="c.status==='accepted'" class="secondary" :disabled="locked" @click="run('/contracts/'+c.id+'/cancel')">Cancelar aceite · sem custo</button></template></div>  <PendingOrderNotice :orders="scheduled(c.id)" :disabled="locked" @remove="run('/orders/'+$event+'/cancel')" /><FocusDialog v-if="intelContract?.id===c.id" title="Inteligência e análises" :busy="busy" :error="error" @close="intelContract=null"><section class="inline-action"><button class="secondary" @click="intelContract=null">Fechar inteligência</button><h2>{{intelContract.title}}</h2><IntelligencePanel :key="game.id+':'+intelContract.id" :game="game" target-type="contract" :target-id="intelContract.id" @changed="emit('changed')" @processing="emit('processing',$event)" /></section></FocusDialog></article></div>
 </template>
 </template>
 <template v-else-if="operationSection!=='decisions'">
  <div class="section-intro"><p>Missões avançam por etapas quando você avança o tempo. Formação e diretrizes enviadas permanecem preservadas.</p></div>


  <section v-if="!visibleMissions.length&&(operationSection==='history'||!(data.pendingOrders??[]).some((o:any)=>o.kind==='start'))" class="empty action-empty"><h3>{{operationSection==='history'?'Sua história ainda vai começar':'Prepare sua próxima operação'}}</h3><p>{{operationSection==='history'?'As missões encerradas aparecerão aqui com seus resultados.':'Escolha um contrato e prepare a equipe antes de iniciar a mobilização.'}}</p><button class="primary" :disabled="locked" @click="emit('navigate','contracts')">Encontrar contrato →</button></section><div class="personnel-grid"><article v-for="m in visibleMissions" :key="m.id" data-action-card tabindex="-1" :id="'operations-m-'+m.id" class="panel operator-card"><StateBadge :status="m.status" :label="statusNames[m.status]||m.status" /><h3>{{m.contractTitle||data.contracts.find((c:any)=>c.id===m.contractId)?.title||'Missão registrada'}}</h3><progress class="mission-progress" :value="m.completedStages" :max="m.totalStages" :aria-label="'Etapas concluídas de '+(m.contractTitle||'missão')" /><p>{{m.completedStages}} / {{m.totalStages}} etapas concluídas<br>Etapa: {{m.stageName}}<br>Início turno {{m.startedTurn}}<span v-if="m.endedTurn!==null"> · término turno {{m.endedTurn}}</span></p><ul><li v-for="a in m.crew" :key="a.operatorId">{{a.name}} · {{a.assignmentType==='reinforcement'?'reforço':'permanente'}}<span v-if="a.operatorId===m.leaderId"> · líder</span></li></ul><div class="personnel-actions"><button class="secondary" @click="details(m)">Abrir relatórios</button><button v-if="['active','awaiting_decision'].includes(m.status)" class="secondary" :disabled="locked||!!scheduled(m.id).length" @click="withdrawal=m">Solicitar retirada</button></div>  <PendingOrderNotice :orders="scheduled(m.id)" :disabled="locked" @remove="run('/orders/'+$event+'/cancel')" /><FocusDialog v-if="withdrawal?.id===m.id" title="Solicitar retirada" :busy="busy" :error="error" @close="withdrawal=null"><section class="inline-action decision-card"><h3>Solicitar retirada?</h3><p>Retorno em um turno. Devolução de {{money(withdrawal.advanceCents)}} de adiantamento, custo de mobilização mantido e redução de reputação.</p><div class="personnel-actions"><button class="primary" :disabled="locked" @click="run('/missions/'+withdrawal.id+'/withdraw')">Ordenar retirada agora</button><button class="secondary" :disabled="locked" @click="withdrawal=null">Manter missão</button></div></section></FocusDialog>  <FocusDialog v-if="selectedMission?.id===m.id" title="Relatórios da missão" :busy="busy" :error="error" @close="selectedMission=null"><section class="inline-action mission-reports">
 <p v-if="reportsLoading" role="status">Carregando relatórios…</p>
 <p v-else-if="!reports.length">Nenhum relatório disponível.</p>

 <section v-if="closingReport" class="mission-closing">
  <h3>{{closingReport.title}}</h3>
  <p class="report-meta">Turno {{closingReport.turn}} · reputação {{closingReport.reputationDelta>0?'+':''}}{{closingReport.reputationDelta}}</p>
  <p v-if="closingReport.evacuationChoice">{{closingReport.evacuationChoice.label}} · turno {{closingReport.evacuationChoice.turn}}<span v-if="closingReport.evacuationChoice.automatic"> · decisão automática</span></p>
  <p><strong>Total recebido {{money(closingReport.totalPaidCents)}}</strong></p>
  <details class="report-detail">
   <summary>Acerto e situação da equipe</summary>
   <div class="report-detail-body">
    <p v-if="closingReport.advanceCents!==undefined">Adiantamento {{money(closingReport.advanceCents)}}</p>
    <p>{{closingReport.paymentCents<0?'Devolução':'Acerto final'}} {{money(Math.abs(closingReport.paymentCents))}}</p>
    <p v-for="operator in closingReport.crewAtReturn||[]" :key="operator.operatorId">{{operator.name}} · {{availabilityLabels[operator.availability]}} · saúde {{operator.health}} · fadiga {{operator.fatigue}}</p>
   </div>
  </details>
  <button v-if="closingReport.crewAtReturn?.length" class="secondary" @click="selectedMission=null;emit('clear-region');emit('navigate','contracts')">Ver próximos contratos</button>
 </section>

 <h3 v-if="progressReports.length" class="report-section-title">Etapas e ocorrências</h3>
 <details v-for="report in progressReports" :key="report.id" class="report-detail">
  <summary>
   <strong>{{reportHeading(report)}}</strong>
   <span class="report-meta">T{{report.turn}} · {{outcomeNames[report.outcome]||report.outcome}}</span>
  </summary>
  <div class="report-detail-body">
   <p>{{report.description?.replace(/ Consulte as condições atuais da formação\.$/,'')}}</p>
   <div v-if="report.conditions?.length">
    <h4>Equipe</h4>
    <p v-for="operator in report.conditions" :key="operator.operatorId">{{operator.name}} · saúde {{operator.health}} · fadiga {{operator.fatigue}} · moral {{operator.morale}}</p>
   </div>
   <div v-if="report.equipment?.length">
    <h4>Equipamentos</h4>
    <p v-for="kit in report.equipment" :key="kit.id">{{kit.name}} · condição {{kit.condition}} · suprimentos {{kit.supplies}}</p>
   </div>
   <p v-if="report.intelligence">Inteligência nível {{report.intelligence.level}}<span v-if="report.intelligence.stale"> · desatualizada</span><span v-if="report.intelligence.conflicting"> · fontes conflitantes</span></p>
  </div>
 </details>
 <details v-if="departure" class="report-detail report-departure">
  <summary>Inteligência inicial <span class="report-meta">T{{departure.collectedTurn}}</span></summary>
  <div class="report-detail-body">
   <p v-for="topic in departure.contract.topics" :key="topic.topic">{{topic.topic==='risk'?'Risco':'Dificuldade'}} · {{topic.estimate?topic.estimate.min+'–'+topic.estimate.max:'desconhecido'}} · confiança {{topic.confidence}}% · válida até T{{topic.validUntilTurn}}</p>
  </div>
 </details>
</section></FocusDialog></article></div>
 </template>
</div>
</template>

<style scoped>
.mission-closing { display:grid; gap:.55rem; margin-bottom:1.25rem; }
.mission-closing > :is(h3,p) { margin:0; }
.mission-closing > button { justify-self:start; }
.report-section-title { margin:0 0 .35rem; }
.report-detail { border-bottom:1px solid var(--command-line,#304047); }
.report-detail > summary { cursor:pointer; padding:.7rem 0; overflow-wrap:anywhere; }
.report-detail > summary > strong { margin-right:.45rem; }
.report-meta { font-size:.875em; opacity:.85; }
.report-detail-body { padding:0 0 .75rem 1rem; }
.report-detail-body :is(h4,p) { margin:.4rem 0; }
.report-departure { margin-top:.8rem; }
</style>
