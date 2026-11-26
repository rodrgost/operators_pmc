<script setup lang="ts">
import {isImportantMissionEvent} from '../../../packages/domain/index'
import type {AgendaItem} from '../utils/agendaItem'
import {campaignDateTime,campaignDuration} from '../../../packages/rules/campaign-time'
const browserStorage=useRuntimeConfig().public.storageMode==='browser'
const games=ref<any[]>([]),game=ref<any>(null),events=ref<any[]>([]),world=ref<any[]>([]),ledger=ref<any[]>([])
const tab=ref('overview'),busy=ref(false),error=ref(''),name=ref('Vanguard Security'),seed=ref(''),batch=ref(1),stop=ref(true),result=ref<any>(null),selectedCountry=ref(''),showCreate=ref(false)
useHead(()=>({title:game.value?game.value.name+' · OPERATORS — PMC Command':'OPERATORS — PMC Command'}))
const financeSection=ref('summary'),targetSection=ref('')
const sectionRoutes=useState<Record<string,string>>('campaign-sections',()=>({}))
const activeScope=useState('campaign-active-scope',()=> 'overview')
const visited=ref<string[]>([])
const missionContext=useState<any>('mission-preparation',()=>null)
const kitNavigation=ref<{category:string;catalogId?:string}|null>(null)
const personnelDestination=ref<{section:string}|null>(null)
const area=computed(()=>['contracts','operations'].includes(tab.value)?'missions':['operators','infrastructure','finance'].includes(tab.value)?'company':tab.value)
const areaItems=[['overview','◈','Comando'],['missions','▤','Missões'],['company','♙','Companhia'],['world','◎','Mundo']]
const areaTabs=computed(()=>area.value==='missions'?[['contracts','Contratos'],['operations','Operações']]:area.value==='company'?[['operators','Operadores'],['infrastructure','Sede e logística'],['finance','Finanças']]:[])
const lastArea=ref<Record<string,string>>({})
function navigate(destination:string,section='',kit?:{category:string;catalogId?:string}){
 agendaContractId.value=''
 agendaFocus?.()
 const next=destination==='missions'?(lastArea.value.missions||'contracts'):destination==='company'?(lastArea.value.company||'operators'):destination
 if(next==='infrastructure')kitNavigation.value=kit??null
 if(next==='operators'){
  section=section||'roster'
  personnelDestination.value={section}
 }
 targetSection.value=section
 if(next==='finance'&&section)financeSection.value=section
 if(section)sectionRoutes.value={...sectionRoutes.value,[next]:section}
 tab.value=next
}
watch(tab,()=>{activeScope.value=tab.value;lastArea.value[area.value]=tab.value;if(!visited.value.includes(tab.value))visited.value.push(tab.value)},{flush:'sync',immediate:true})

const authState=ref('loading'),setupReady=ref(false)
const canCreate=computed(()=>authState.value==='signedIn'&&setupReady.value&&registrationCountries.value.some(c=>c.id===registrationCountryId.value)&&difficultyOptions.value.some(d=>d.id===difficulty.value))
const navigationNews=useNavigationNews()
function newsForArea(key:string){
 if(!game.value)return ''
 const tabs=key==='missions'?['contracts','operations']:key==='company'?['operators','infrastructure','finance']:[key]
 return tabs.some(value=>navigationNews.status(game.value.id,value)==='new')?'new':''
}

const deletingCompany=ref<any>(null),deleteName=ref('')
const registrationCountryId=ref('valdoria'),registrationCountries=ref<any[]>([])
const difficulty=ref('normal'),difficultyOptions=ref<any[]>([])
const selectedDifficulty=computed(()=>difficultyOptions.value.find(p=>p.id===difficulty.value))
const nav=[['overview','◈','Comando'],['world','◎','Mundo'],['operators','♙','Operadores'],['contracts','▤','Contratos'],['operations','⌁','Operações'],['finance','▥','Finanças'],['infrastructure','⌂','Sede e logística']]
const currency=(value:number,precise=false)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',minimumFractionDigits:precise?2:0,maximumFractionDigits:precise?2:0}).format(value/100)
function formatGameDate(value:string){return campaignDateTime(new Date(value),true)}
const dateAt=(turn:number)=>formatCampaignTurn(game.value,turn)
const ledgerNewest=computed(()=>[...ledger.value].sort((a:any,b:any)=>b.turn-a.turn))
const command=ref<any>(null),loadingCampaign=ref(true),scrollContainer=ref<HTMLElement|null>(null),cancelRequest=ref<any>(null)
const country=computed(()=>world.value.find(c=>c.id===selectedCountry.value)||world.value[0])
const contractRegion=ref('')
const contractCountryName=computed(()=>world.value.find(c=>c.id===contractRegion.value||c.regions?.some((region:any)=>region.id===contractRegion.value))?.name)
const worldContext=useState<Record<string,string>>('world-region',()=>({}))
const worldFocus=useState<Record<string,string>>('world-event',()=>({}))
function openWorld(target:{regionId:string;eventId:string}){worldContext.value={...worldContext.value,[game.value.id]:target.regionId};worldFocus.value={...worldFocus.value,[game.value.id]:target.eventId};tab.value='world'}
const pendingAdvance=ref<any>(null)
const pendingCreation=ref<any>(null)
const personnelSummary=ref<any>({}),personnelWorking=ref(false),operationsSummary=ref<any>({missions:[],decisions:[]})
const operationTarget=ref<{id:string;report?:boolean}|null>(null)
const agendaOpen=ref(false),agendaContractId=ref(''),agendaRegion=ref<{id:string}|null>(null)
let agendaFocus:(()=>void)|undefined
const activeOperations=computed(()=>(operationsSummary.value.missions??[]).filter((mission:any)=>['active','awaiting_decision','returning'].includes(mission.status)))
const recentOperations=computed(()=>(operationsSummary.value.missions??[]).filter((mission:any)=>isRecentMissionEnd(mission.endedTurn,game.value?.currentTurn)))
const operationsToShow=computed(()=>[...activeOperations.value,...recentOperations.value])
const operationEndLabels:Record<string,string>={completed:'Concluído',failed:'Fracassado',withdrawn:'Retirada concluída'}
const operationDecisions=computed(()=>[...operationsSummary.value.decisions].sort((a:any,b:any)=>a.expiresTurn-b.expiresTurn))
const companyAlerts=computed(()=>(command.value?.alerts??[]).filter((alert:any)=>alert.id!=='decisions'))
const commandDeadlines=computed<AgendaItem[]>(()=> (command.value?.agenda??[]).filter((item:AgendaItem)=>item.requiresAction))
const availableContracts=computed(()=>(operationsSummary.value.contracts??[]).filter((contract:any)=>contract.status==='available').length)
const interruptedDecision=computed(()=>result.value?.reason==='critical_decision'
 ? operationDecisions.value.find((decision:any)=>decision.createdTurn===result.value.currentTurn)
 : undefined)
function openOperationCard(section:string,id:string,report=false){
 operationTarget.value={id,report}
 navigate('operations',section)
}
function openInterruptedDecision(){
 if(interruptedDecision.value)openOperationCard('decisions','operations-d-'+interruptedDecision.value.id)
}
function focusAgendaCard(id:string){
 let observer:MutationObserver|undefined
 let frame=0
 const timeout=window.setTimeout(stop,3000)
 function stop(){
  observer?.disconnect()
  window.cancelAnimationFrame(frame)
  window.clearTimeout(timeout)
  agendaFocus=undefined
 }
 function check(){
  const card=document.getElementById(id)
  if(!card?.getClientRects().length)return
  if(!card.hasAttribute('tabindex'))card.tabIndex=-1
  card.focus({preventScroll:true})
  scrollCampaignElement(card,'center')
  stop()
 }
 agendaFocus=stop
 observer=new MutationObserver(()=>{window.cancelAnimationFrame(frame);frame=window.requestAnimationFrame(check)})
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']})
 frame=window.requestAnimationFrame(check)
}
function openAgendaItem(item:AgendaItem){
 const target=item.targetId
 if(item.tab==='operations'){
  if(item.id.startsWith('decision-'))return openOperationCard('decisions','operations-d-'+item.id)
  if(item.id.startsWith('mission-'))return openOperationCard('missions','operations-m-'+(target??item.id.slice('mission-'.length)))
 }
 if(item.tab==='contracts'&&(target||item.id.startsWith('mobilization-'))){
  navigate('contracts')
  agendaContractId.value=target??item.id.slice('mobilization-'.length)
  return focusAgendaCard('operations-c-'+agendaContractId.value)
 }
 if(item.tab==='operators'){
  navigate('operators','roster')
  const operator=target??(item.id.startsWith('activity-')?item.id.slice('activity-'.length):'')
  if(operator)focusAgendaCard('personnel-o-'+operator)
  return
 }
 if(item.tab==='infrastructure'){
  const module=item.id.startsWith('module-')
  navigate('infrastructure',module?'headquarters':'inventory',{category:''})
  return focusAgendaCard(module?'logistics-m-'+(target??item.id.slice('module-'.length)):'logistics-k-'+(target??item.id))
 }
 if(item.tab==='world'&&target){
  navigate('world','regions')
  agendaRegion.value={id:target}
  return focusAgendaCard('intelligence-region-'+target)
 }
 if(item.tab==='finance')return navigate('finance','summary')
 navigate(item.tab)
}

const entryName=(type:string)=>(({intelligence_analysis:'Análise de inteligência',equipment_purchase:'Compra de kits',equipment_maintenance:'Reparo de kit',equipment_resupply:'Reposição de suprimentos',equipment_refurbish:'Reparo e reposição de kit',headquarters_upgrade:'Melhoria da sede',headquarters_maintenance:'Manutenção da sede',operator_training:'Treinamento',operator_treatment:'Tratamento',initial_capital:'Capital inicial',signing_bonus:'Bônus de assinatura',salary_payment:'Pagamento salarial',mission_mobilization:'Mobilização',mission_advance:'Adiantamento de missão',mission_completion:'Acerto de missão',advance_refund:'Devolução de adiantamento'} as Record<string,string>)[type]||'Movimentação financeira')
async function api(path:string,options:any={}){return await $fetch<any>('/api/v1'+path,options)}
async function load(){
 setupReady.value=false;loadingCampaign.value=true;authState.value='loading';
 try{
  const session=await api('/session');
  if(!session.authenticated){authState.value='signedOut';games.value=[];error.value='';return}
  authState.value='signedIn';
  const [list,profiles,countries]=await Promise.all([api('/games'),api('/difficulties'),api('/registration-countries')]);
  if(!profiles.length||!countries.length)throw new Error('Configuração incompleta');
  games.value=list;difficultyOptions.value=profiles;registrationCountries.value=countries;setupReady.value=true;
 }catch(e:any){
  if(e.status===401||e.statusCode===401){authState.value='signedOut';games.value=[];error.value='';return}
  authState.value='error';throw e;
 }finally{loadingCampaign.value=false}
}
async function select(id:string){const entering=!game.value;busy.value=true;error.value='';try{await api('/games/'+id+'/logistics');await api('/games/'+id+'/intelligence');const selected=await api('/games/'+id);const [nextEvents,nextWorld,nextLedger,nextPersonnel,nextOperations,nextCommand]=await Promise.all([api(`/games/${id}/timeline`),api(`/games/${id}/world/countries`),api(`/games/${id}/finances/ledger`),api(`/games/${id}/finances/summary`),api(`/games/${id}/operations`),api(`/games/${id}/command-center`)]);game.value=selected;events.value=nextEvents;world.value=nextWorld;ledger.value=nextLedger;personnelSummary.value=nextPersonnel;operationsSummary.value=nextOperations;command.value=nextCommand;navigationNews.sync(id,nextCommand.navigationNews??{},nextCommand.latestAdvance?.startTurn??selected.currentTurn);localStorage.setItem('operators-game',id);result.value=command.value?.latestAdvance??null;pendingAdvance.value=result.value?.status==='processing'?result.value.command:null;if(entering&&scrollContainer.value)scrollContainer.value.scrollTop=0;return true}catch(e:any){error.value=e.data?.message||'Não foi possível abrir a partida.';return false}finally{busy.value=false}}
function requestDelete(company:any){deletingCompany.value=company;deleteName.value='';error.value=''}
async function removeCompany(){
 if(busy.value||!deletingCompany.value||deleteName.value!==deletingCompany.value.name)return;
 busy.value=true;error.value='';
 try{await api('/games/'+deletingCompany.value.id,{method:'DELETE',body:{confirmationName:deleteName.value,expectedVersion:deletingCompany.value.stateVersion}});deletingCompany.value=null;await load()}
 catch(e:any){if(e.status===404){deletingCompany.value=null;await load()}else error.value=e.data?.message||'Não foi possível excluir. Atualize a lista para verificar e tente novamente.'}
 finally{busy.value=false}
}
async function create(){
 if(busy.value||personnelWorking.value||(!canCreate.value&&!pendingCreation.value))return;
 busy.value=true;error.value='';
 try{
  if(!canCreate.value){await load();if(!canCreate.value)return}
  const command=pendingCreation.value||{requestId:crypto.randomUUID(),name:name.value,seed:seed.value.trim()||crypto.randomUUID(),difficulty:difficulty.value,registrationCountryId:registrationCountryId.value};
  pendingCreation.value=command;
  const created=await api('/games',{method:'POST',body:command});
  await load();
  if(!await select(created.id))return;
  pendingCreation.value=null;showCreate.value=false;
 }catch(e:any){
  if(e.status>=400&&e.status<500)pendingCreation.value=null;
  error.value=e.data?.message||'Falha de conexão. Tente novamente para recuperar a mesma criação.';
 }finally{busy.value=false}
}
async function advance(){if(!game.value||busy.value||personnelWorking.value)return;busy.value=true;error.value='';try{const command=pendingAdvance.value||{requestId:crypto.randomUUID(),expectedVersion:game.value.stateVersion,turns:Number(batch.value),stopOnImportant:stop.value};pendingAdvance.value=command;const r=await api(`/games/${game.value.id}/advance`,{method:'POST',body:command});const id=game.value.id;result.value=r;if(!await select(id))return;result.value=r;pendingAdvance.value=null}catch(e:any){error.value=e.data?.message||'Falha de conexão. Tente novamente para consultar a mesma requisição.';if(e.status>=400&&e.status<500){pendingAdvance.value=null;await select(game.value.id);error.value=e.data?.message||'Revise as ordens antes de avançar.'}}finally{busy.value=false}}
async function cancelOrder(orderId:string){
 if(busy.value||personnelWorking.value)return;busy.value=true;error.value='';
 const request=cancelRequest.value||{orderId,body:{requestId:crypto.randomUUID(),expectedVersion:game.value.stateVersion}};cancelRequest.value=request;
 try{await api(`/games/${game.value.id}/orders/${request.orderId}/cancel`,{method:'POST',body:request.body});cancelRequest.value=null;await select(game.value.id)}catch(e:any){if(e.status>=400&&e.status<500){cancelRequest.value=null;await select(game.value.id)}error.value=e.data?.message||'Falha ao remover a ordem. Repita para recuperar a mesma solicitação.'}finally{busy.value=false}
}
async function resume(){busy.value=true;error.value='';try{const r=await api(`/games/${game.value.id}/advances/${result.value.requestId}/resume`,{method:'POST',body:{expectedVersion:game.value.stateVersion}});result.value=r;if(!await select(game.value.id))return;result.value=r}catch(e:any){error.value=e.data?.message||'Não foi possível retomar.'}finally{busy.value=false}}
async function home(){if(busy.value||personnelWorking.value)return;busy.value=true;error.value='';try{await load();game.value=null;agendaFocus?.();agendaOpen.value=false;personnelDestination.value=null;agendaContractId.value='';agendaRegion.value=null;operationTarget.value=null;missionContext.value=null;visited.value=[];sectionRoutes.value={};tab.value='overview';showCreate.value=false;contractRegion.value='';if(typeof window!=='undefined'){await nextTick();window.scrollTo({top:0,left:0,behavior:'instant'})}}catch{error.value='Não foi possível carregar as companhias. Tente novamente.'}finally{busy.value=false}}
onMounted(async()=>{const restoreRoute=useCampaignRoutes({game,tab,sections:sectionRoutes,financeSection,scrollContainer,select,home,isLocked:()=>busy.value||personnelWorking.value});try{await load();await restoreRoute()}catch{error.value='Não foi possível conectar. Atualize a página para tentar novamente.'}finally{loadingCampaign.value=false}})
</script>
<template>
<div v-if="!game" class="campaign-home">
 <header class="home-header"><a class="home-logo" href="/" @click.prevent="home">OPERATORS<span>PMC COMMAND</span></a><span class="home-private"><i class="live-dot"></i> {{authState==='signedIn'?'CAMPANHAS PESSOAIS':'PMC COMMAND'}}</span></header>
 <main class="home-content"><InstallApp /><section class="home-intro"><div><div class="eyebrow">SEU CENTRO DE OPERAÇÕES</div><h1>{{authState==='signedOut'?'Seu comando começa aqui.':'Escolha sua companhia.'}}</h1><p>{{authState==='signedOut'?'Recrute operadores, organize equipes e comande missões em Asterra. Entre para criar sua companhia e salvar seu progresso.':'Retome uma campanha em andamento ou estabeleça um novo comando em Asterra.'}}</p></div><button v-if="setupReady&&games.length" class="primary" :disabled="busy||!!pendingCreation" @click="showCreate=!showCreate">{{showCreate?'Fechar criação':'Criar companhia'}}</button></section>
 <p v-if="browserStorage" class="panel">Suas campanhas ficam salvas somente neste navegador e aparelho, sem precisar de conta. Limpar os dados do site ou usar navegação anônima pode apagar seu progresso. Não há sincronização entre aparelhos.</p>
 <div v-if="error" class="error" role="alert">{{error}} <button v-if="!pendingCreation" class="secondary action-block" :disabled="busy" @click="home">Tentar novamente</button></div>
 <section v-if="authState==='signedOut'" class="panel sign-in-panel"><h2>Entre para jogar</h2><p>Use sua conta ChatGPT. Cada jogador acessa somente suas próprias companhias.</p><a class="primary sign-in-link action-block" href="/signin-with-chatgpt?return_to=%2F" target="_top">Entrar com ChatGPT →</a></section>
 <section v-if="loadingCampaign" class="panel" role="status">Carregando companhias…</section>
 <section v-else-if="setupReady&&(showCreate||!games.length||pendingCreation)" class="panel create home-create"><div><span class="eyebrow">NOVO COMANDO</span><h2>Estabeleça sua companhia.</h2><p>Escolha o nome que representará seu comando. Cada companhia tem sua própria campanha e progresso.</p></div><form @submit.prevent="create"><label>Nome da companhia<input v-model="name" :disabled="busy||!!pendingCreation" required minlength="2" maxlength="60" placeholder="Nome da sua companhia"></label><label>País de registro<select v-model="registrationCountryId" :disabled="busy||!!pendingCreation" required><option v-for="c in registrationCountries" :key="c.id" :value="c.id">{{c.name}}</option></select><small>Escolha permanente. As relações com outros países podem afetar suas ofertas.</small></label><label>Semente da campanha (opcional)<input v-model="seed" :disabled="busy||!!pendingCreation" maxlength="100" placeholder="Automática a cada nova companhia"><small>Deixe em branco para variar operadores e missões. A mesma semente reproduz as condições iniciais da campanha.</small></label><fieldset class="difficulty-fieldset" :disabled="busy||!!pendingCreation"><legend>Dificuldade da campanha</legend><div class="difficulty-options"><label v-for="profile in difficultyOptions" :key="profile.id" :class="['difficulty-choice',{selected:difficulty===profile.id}]"><input v-model="difficulty" type="radio" name="difficulty" :value="profile.id"><span><strong>{{profile.label}}</strong><small>{{profile.description}}</small></span></label></div><p class="difficulty-permanent">A dificuldade não poderá ser alterada nesta campanha.</p><details v-if="selectedDifficulty" class="difficulty-details"><summary>Ver modificadores · {{selectedDifficulty.label}}</summary><dl><div><dt>Eventos negativos</dt><dd>×{{selectedDifficulty.negativeEvents}}</dd></div><div><dt>Oportunidades favoráveis</dt><dd>×{{selectedDifficulty.positiveEvents}}</dd></div><div><dt>Complicações em missão</dt><dd>×{{selectedDifficulty.missionComplications}}</dd></div><div><dt>Frequência dos rivais</dt><dd>×{{selectedDifficulty.rivalInterest}}</dd></div><div><dt>Remuneração de novos contratos</dt><dd>×{{selectedDifficulty.contractReward}}</dd></div></dl><p>Aplicados sobre as regras-base, respeitando o contexto. Preços, salários, atributos e prazos são iguais nos três níveis.</p></details></fieldset><button class="primary" :disabled="busy||!canCreate">{{busy?'Criando companhia…':pendingCreation?'Repetir criação':'Criar companhia →'}}</button></form></section>
 <section v-if="setupReady&&!loadingCampaign&&games.length" class="company-list-section"><div class="home-section-heading"><h2>Campanhas em andamento</h2><span>{{games.length}} {{games.length===1?'companhia':'companhias'}}</span></div><div class="company-grid"><article v-for="g in games" :key="g.id" class="company-card"><div class="company-card-top"><span class="eyebrow">COMPANHIA INDEPENDENTE</span><span class="tag">{{g.status==='financial_crisis'?'Atenção financeira':'Em andamento'}}</span></div><h3>{{g.name}}</h3><p>País de registro: {{g.registrationCountryName||'País não informado'}}</p><p class="company-difficulty">{{g.difficultyLabel||'Normal'}} · permanente</p><p class="company-progress">{{formatGameDate(g.date)}}</p><div class="company-metrics"><div><span>CAIXA</span><strong>{{currency(g.cashCents)}}</strong></div><div><span>REPUTAÇÃO</span><strong>{{g.reputation}}<small> / 100</small></strong></div></div><div class="company-card-actions action-row"><button class="secondary" :disabled="busy||!!pendingCreation" @click="tab='overview';select(g.id)">{{busy?'Abrindo companhia…':'Entrar na companhia →'}}</button><button class="company-delete" :aria-label="'Excluir companhia '+g.name" :disabled="busy||!!pendingCreation" @click="requestDelete(g)">Excluir companhia</button></div></article></div></section>
 <section v-if="deletingCompany" class="delete-company-backdrop"><form class="panel delete-company-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-company-title" @submit.prevent="removeCompany"><h2 id="delete-company-title">Excluir companhia?</h2><p>Você excluirá <strong>{{deletingCompany.name}}</strong> e todo o progresso, operadores, missões e histórico desta campanha. Esta ação é imediata e não pode ser desfeita.</p><label>Digite o nome da companhia para confirmar<input v-model="deleteName" :disabled="busy" autocomplete="off" autofocus></label><p v-if="error" class="error" role="alert">{{error}}</p><div class="heading-actions action-row"><button type="button" class="secondary" :disabled="busy" @click="deletingCompany=null">Cancelar</button><button type="submit" class="danger" :disabled="busy||deleteName!==deletingCompany.name">{{busy?'Excluindo…':'Excluir definitivamente'}}</button></div></form></section>
 </main>
</div>
<div v-else class="shell planned-shell">
 <header class="account-bar">
  <div class="account-identity">
   <details class="company-details">
    <summary :title="game.name">{{game.name}} <span aria-hidden="true">⌄</span></summary>
    <div class="company-details-content">
     <h2>Detalhes da companhia</h2>
     <dl>
      <div><dt>Registro</dt><dd>{{game.registrationCountryName||'País não informado'}}</dd></div>
      <div><dt>Dificuldade</dt><dd>{{game.difficultyLabel||'Normal'}} · permanente</dd></div>
      <div><dt>Situação</dt><dd>{{game.status==='financial_crisis'?'Atenção financeira':'Companhia ativa'}}</dd></div>
      <div><dt>Mundo</dt><dd>Asterra</dd></div>
      <div><dt>Data da campanha</dt><dd>{{formatGameDate(game.date)}}</dd></div>
     </dl>
     <button class="secondary" :disabled="busy||personnelWorking" @click="home">← Trocar companhia</button>
    </div>
   </details>
   <small>Semana {{campaignWeek(game.currentTurn)}} · {{dateAt(game.currentTurn)}}</small>
  </div>
  <button class="account-balance balance-link" :disabled="busy||personnelWorking" :aria-label="'Abrir finanças. Saldo de '+currency(game.cashCents,true)" @click="navigate('finance','summary')">
   <strong>{{currency(game.cashCents,true)}}</strong>
  </button>
  <button v-if="missionContext?.gameId===game.id&&tab!=='contracts'" type="button" class="secondary preparation-return-link" :disabled="busy||personnelWorking" @click="navigate('contracts')">
   <strong>← Voltar à preparação</strong>
   <span><GameLabel kind="mission" :code="missionContext.type" :label="missionContext.title" /></span>
  </button>
 </header>
 <aside class="command-navigation"><button class="company-return" :disabled="busy||personnelWorking" @click="home" aria-label="Voltar às companhias">← Companhias</button><div class="workspace-label">CENTRO DE COMANDO</div><nav aria-label="Navegação principal"><button v-for="item in areaItems" :key="item[0]" :class="{active:area===item[0]}" :aria-current="area===item[0]?'page':undefined" :disabled="busy||personnelWorking" @click="navigate(item[0])"><span aria-hidden="true"><GameIcon :name="item[0]==='overview'?'command':item[0]" /></span>{{item[2]}}<NavigationBadge :status="newsForArea(item[0])" /></button></nav></aside>
 <main ref="scrollContainer" class="campaign-scroll" tabindex="0" aria-label="Área da campanha">
 <div class="content"><nav v-if="areaTabs.length" class="title-nav" aria-label="Áreas da seção"><div v-for="item in areaTabs" :key="item[0]" class="title-nav-item" :role="tab===item[0]?'heading':undefined" :aria-level="tab===item[0]?1:undefined"><button type="button" :class="{active:tab===item[0]}" :aria-current="tab===item[0]?'page':undefined" :disabled="busy||personnelWorking" @click="navigate(item[0])">{{item[1]}}<NavigationBadge v-if="game" :status="navigationNews.status(game.id,item[0])" /></button></div></nav><div v-if="!areaTabs.length" class="title-nav"><h1 class="title-nav-item"><span class="title-nav-label active">{{nav.find(n=>n[0]===tab)?.[2]}}</span></h1></div>
 <template v-if="game">
 <p v-if="game.status==='financial_crisis'" class="company-crisis" role="status">Atenção financeira · Revise o caixa e os compromissos em Finanças.</p>
 <FirstMissionGuide v-if="['operations','operators','infrastructure'].includes(tab)&&missionContext?.gameId!==game.id" :command="command" :employed="personnelSummary.employed||0" compact :disabled="busy||personnelWorking" @navigate="navigate" />
 <div v-if="tab==='overview'" class="command-overview">
  <section v-if="commandDeadlines.length||command?.pendingOrders?.length||companyAlerts.length" class="panel command-attention">
   <h2>Pendências</h2>
   <button v-for="item in commandDeadlines.slice(0,3)" :key="item.id" type="button" class="agenda-item" :disabled="busy||personnelWorking" @click="openAgendaItem(item)">
    <span><GameLabel v-bind="item.labelIcon" :label="item.title" /></span><strong>Até {{dateAt(item.dueTurn)}}</strong>
   </button>
   <button v-if="commandDeadlines.length>3||command?.pendingOrders?.length" type="button" class="agenda-item" @click="agendaOpen=true">
    <span>{{command?.pendingOrders?.length?command.pendingOrders.length+' '+(command.pendingOrders.length===1?'ordem para confirmar':'ordens para confirmar'):'Ver todas as pendências'}}</span><strong>Abrir agenda →</strong>
   </button>
   <details v-if="companyAlerts.length" :open="companyAlerts.some((alert:any)=>alert.severity==='critical')" class="command-details">
    <summary>{{companyAlerts.length}} {{companyAlerts.length===1?'alerta da companhia':'alertas da companhia'}}</summary>
    <article v-for="a in companyAlerts" :key="a.id" class="command-alert" :class="a.severity">
     <div><h3>{{a.title}}</h3><p>{{a.description}}</p></div>
     <button class="secondary action-block" :disabled="busy||personnelWorking" @click="a.id==='planning'?agendaOpen=true:navigate(a.tab)">Revisar</button>
    </article>
   </details>
  </section>
  <FirstMissionGuide :command="command" :employed="personnelSummary.employed||0" concise :disabled="busy||personnelWorking" @navigate="navigate" />
  <section v-if="operationsToShow.length" class="panel command-alerts" aria-labelledby="operations-overview-title">
   <h2 id="operations-overview-title">Operações</h2>
  <article v-for="mission in operationsToShow" :key="mission.id" class="command-alert">
   <div>
    <h3><GameLabel kind="mission" :code="mission.contractType" :label="mission.contractTitle || 'Operação'" /><CardNews :game-id="game.id" :news-key="'operations.'+(mission.endedTurn==null?'missions:':'history:')+mission.id" :label="mission.contractTitle||'Operação'" /></h3>
    <StateBadge v-if="mission.endedTurn!=null" :status="mission.status" :label="operationEndLabels[mission.status]??'Encerrado'" />
    <p v-else>{{mission.status==='awaiting_decision'?'Aguardando decisão':mission.status==='returning'?'Equipe retornando':'Em execução · '+mission.stageName}}</p>
    <MissionTurnBrief :mission="mission" :game="game" :current-turn="game.currentTurn" compact />
   </div>
   <button class="secondary action-block" :disabled="busy||personnelWorking" @click="openOperationCard(mission.endedTurn==null?'missions':'history','operations-m-'+mission.id,mission.endedTurn!=null)">{{mission.endedTurn==null?'Acompanhar':'Ver resultado'}}</button>
  </article>
 </section>
  <button v-if="!operationsToShow.length" class="secondary command-contracts action-block" :disabled="busy||personnelWorking" @click="contractRegion='';navigate('contracts')">Ver contratos · {{availableContracts}} disponíveis</button>
  <details v-if="result||command?.latestAdvance" class="panel command-details">
   <summary>Último avanço · {{campaignDuration(result?.processedTurns??0)}}<template v-if="result?.status==='failed'"> · interrompido por falha</template></summary>
   <p v-if="result">Até {{dateAt(result.currentTurn)}} · {{campaignDuration(result.processedTurns)}} de {{campaignDuration(result.requestedTurns)}}.</p>
   <template v-if="command?.latestAdvance">
    <p>Receitas {{currency(command.latestAdvance.receiptsCents,true)}} · despesas {{currency(command.latestAdvance.expensesCents,true)}}</p>
    <ul><li v-for="e in command.latestAdvance.events" :key="e.type+e.title">{{e.title}} <strong>× {{e.count}}</strong></li></ul>
   </template>
  </details>
  <details class="panel command-details">
   <summary>Registro de comando</summary>
   <p v-if="!events.length">Nenhum evento registrado.</p>
   <div v-for="event in events.slice(0,8)" :key="event.turn+'-'+event.sequence" class="event">
   <span class="event-marker" :class="{important:isImportantMissionEvent(event)}"></span>
    <div><div class="event-title">{{event.type==='turn_completed'?'Período concluído':event.title}}<small>{{dateAt(event.turn)}}</small></div><p>{{formatCampaignEvent(game,event)}}</p></div>
   </div>
  </details>
  <details class="panel command-details">
   <summary>Situação da companhia</summary>
   <div class="brief-line"><span>Reputação</span><strong>{{game.reputation}} / 100</strong></div>
   <div class="brief-line"><span>Operadores com vínculo</span><strong>{{personnelSummary.employed||0}} / {{personnelSummary.capacity||12}}</strong></div>
   <div class="brief-line"><span>Tempo de campanha</span><strong>{{campaignDuration(game.currentTurn)}}</strong></div>
   <div class="brief-line"><span>Custo semanal</span><strong>{{currency(command?.finance?.weeklyTotalCents||0)}}</strong></div>
   <nav class="command-shortcuts action-row" aria-label="Atalhos da companhia">
    <button class="secondary" :disabled="busy||personnelWorking" @click="navigate('operators','recruitment')">Recrutar operadores</button>
    <button class="secondary" :disabled="busy||personnelWorking" @click="navigate('operators','squads')">Gerenciar equipes</button>
    <button class="secondary" :disabled="busy||personnelWorking" @click="navigate('infrastructure','catalog')">Comprar kits</button>
   </nav>
  </details>
 </div>
 <WorldPanel v-if="visited.includes('world')" v-show="tab==='world'" :game="game" :agenda-region="agendaRegion" @open-contracts="contractRegion=$event;navigate('contracts')" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <LogisticsPanel v-if="visited.includes('infrastructure')" v-show="tab==='infrastructure'" :game="game" :initial-section="targetSection" :kit-navigation="kitNavigation" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <PersonnelPanel v-if="visited.includes('operators')" v-show="tab==='operators'" :game="game" :destination="personnelDestination" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <OperationsPanel v-for="panelMode in ['contracts','operations'].filter(t=>visited.includes(t))" :key="panelMode" v-show="tab===panelMode" :game="game" :mode="panelMode" :active="tab===panelMode" :region-id="contractRegion" :region-name="contractCountryName" :ledger="ledger" :agenda-contract-id="agendaContractId" @clear-agenda-contract="agendaContractId=''" :card-target="panelMode==='operations'?operationTarget:null" @card-opened="operationTarget===$event&&(operationTarget=null)" @navigate="navigate" @clear-region="contractRegion=''" @open-world="openWorld($event)" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <template v-if="tab==='finance'">
  <SectionNav :game-id="game.id" scope="finance" v-model="financeSection" label="Seções de finanças" :items="[['summary','Resumo'],['ledger','Livro-razão']]" />
  <section v-if="financeSection==='ledger'" id="finance-ledger" class="panel finance-ledger" aria-labelledby="ledger-title">
   <div class="panel-heading"><h2 id="ledger-title">Movimentações confirmadas</h2></div>
   <p v-if="!ledgerNewest.length" class="empty">Nenhuma movimentação confirmada.</p>
   <table v-else role="table">
    <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Data e hora</th><th role="columnheader" scope="col">Lançamento</th><th role="columnheader" scope="col">Valor</th></tr></thead>
    <tbody role="rowgroup">
     <tr v-for="entry in ledgerNewest" :key="entry.sourceId+':'+entry.entryType" role="row">
      <td role="cell" class="ledger-date"><span class="ledger-value">{{formatGameDate(entry.date)}}</span></td>
      <td role="cell" class="ledger-description"><span class="ledger-value">{{entry.description||entryName(entry.entryType)}}<small v-if="entry.detail" class="ledger-detail">{{entry.detail}}</small></span></td>
      <td role="cell" class="ledger-amount" :class="entry.amountCents<0?'debit':'credit'">{{currency(entry.amountCents,true)}}</td>
     </tr>
    </tbody>
   </table>
  </section>
  <CompanyFinanceSummary v-else :game="game" :command="command" />
 </template>

 </template>
 </div>
 </main>
 <TurnDock v-model:agenda-open="agendaOpen" :game="game" :command="command" :busy="busy" :locked="personnelWorking" :turns="batch" :stop="stop" :pending="!!pendingAdvance" :result="result" :has-interrupted-decision="!!interruptedDecision" :error="error" @open-decision="openInterruptedDecision" @update:turns="batch=$event" @update:stop="stop=$event" @advance="advance" @resume="resume" @cancel="cancelOrder" @open-item="openAgendaItem" />
</div>
</template>

<style scoped>
.command-overview{display:grid;gap:var(--space-3)}
.command-overview .panel{margin:0;padding:var(--space-3) var(--space-4)}
.command-attention h2,.command-overview .command-alerts h2{margin-bottom:var(--space-2)}
.command-attention>.agenda-item{min-height:50px}
.command-details>summary{min-height:44px;display:list-item;padding:10px 0;cursor:pointer;font-weight:600}
.command-overview>.command-details:not([open]){padding-block:0}
.command-contracts{justify-self:start}
.finance-ledger .panel-heading{margin:0;padding-bottom:var(--space-2)}
.finance-ledger .ledger-amount{font-variant-numeric:tabular-nums}
@media(max-width:699px){
 .finance-ledger{padding:var(--space-3)}
 .finance-ledger table,.finance-ledger tbody{display:block}
 .finance-ledger thead{position:absolute;display:block;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 .finance-ledger tbody tr{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"description amount" "date amount";gap:2px 10px;padding:var(--space-2) 0}
 .finance-ledger td{display:block;padding:0;text-align:left;overflow-wrap:anywhere}
 .finance-ledger td::before{content:none}
 .finance-ledger .ledger-description{grid-area:description}
 .finance-ledger .ledger-date{grid-area:date;color:#b6c9d1;font-size:var(--text-caption)}
 .finance-ledger .ledger-amount{grid-area:amount;text-align:right;font-weight:600}
}
.preparation-return-link{grid-column:1/-1;display:flex;align-items:center;gap:var(--space-2);min-width:0;min-height:44px;text-align:left;padding:6px 10px;font-size:var(--text-caption)}
.preparation-return-link strong{white-space:nowrap}
.preparation-return-link>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--command-info)}
</style>
