<script setup lang="ts">
const browserStorage=useRuntimeConfig().public.storageMode==='browser'
const games=ref<any[]>([]),game=ref<any>(null),events=ref<any[]>([]),world=ref<any[]>([]),ledger=ref<any[]>([])
const tab=ref('overview'),busy=ref(false),error=ref(''),name=ref('Vanguard Security'),seed=ref('asterra-01'),batch=ref(1),stop=ref(true),result=ref<any>(null),selectedCountry=ref(''),showCreate=ref(false)
useHead(()=>({title:game.value?game.value.name+' · OPERATORS — PMC Command':'OPERATORS — PMC Command'}))
const financeSection=ref('summary'),targetSection=ref('')
const sectionRoutes=useState<Record<string,string>>('campaign-sections',()=>({}))
const activeScope=useState('campaign-active-scope',()=> 'overview')
const visited=ref<string[]>([])
const missionContext=useState<any>('mission-preparation',()=>null)
const area=computed(()=>['contracts','operations'].includes(tab.value)?'missions':['operators','infrastructure','finance'].includes(tab.value)?'company':tab.value)
const areaItems=[['overview','◈','Comando'],['missions','▤','Missões'],['company','♙','Companhia'],['world','◎','Mundo']]
const areaTabs=computed(()=>area.value==='missions'?[['contracts','Contratos'],['operations','Operações']]:area.value==='company'?[['operators','Operadores'],['infrastructure','Sede e logística'],['finance','Finanças']]:[])
const lastArea=ref<Record<string,string>>({})
function navigate(destination:string,section=''){
 const next=destination==='missions'?(lastArea.value.missions||'contracts'):destination==='company'?(lastArea.value.company||'operators'):destination
 targetSection.value=section
 if(section)sectionRoutes.value={...sectionRoutes.value,[next]:section}
 tab.value=next
}
function areaStatus(destination:string){const scopes=destination==='missions'?['contracts','operations']:destination==='company'?['operators','infrastructure','finance']:[destination];const statuses=scopes.map(scope=>navigationNews.status(game.value.id,scope));return statuses.includes('attention')?'attention':statuses.find(Boolean)||''}
watch(tab,()=>{activeScope.value=tab.value;lastArea.value[area.value]=tab.value;if(!visited.value.includes(tab.value))visited.value.push(tab.value)},{flush:'sync',immediate:true})

const authState=ref('loading'),setupReady=ref(false)
const canCreate=computed(()=>authState.value==='signedIn'&&setupReady.value&&registrationCountries.value.some(c=>c.id===registrationCountryId.value)&&difficultyOptions.value.some(d=>d.id===difficulty.value))
const navigationNews=useNavigationNews()

const deletingCompany=ref<any>(null),deleteName=ref('')
const registrationCountryId=ref('valdoria'),registrationCountries=ref<any[]>([])
const difficulty=ref('normal'),difficultyOptions=ref<any[]>([])
const selectedDifficulty=computed(()=>difficultyOptions.value.find(p=>p.id===difficulty.value))
const nav=[['overview','◈','Comando'],['world','◎','Mundo'],['operators','♙','Operadores'],['contracts','▤','Contratos'],['operations','⌁','Operações'],['finance','▥','Finanças'],['infrastructure','⌂','Sede e logística']]
const currency=(value:number,precise=false)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',minimumFractionDigits:precise?2:0,maximumFractionDigits:precise?2:0}).format(value/100)
function formatGameDate(value:string){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Data indisponível'}
const date=computed(()=>game.value?formatGameDate(game.value.date):'')
const ledgerNewest=computed(()=>[...ledger.value].sort((a:any,b:any)=>b.turn-a.turn))
const command=ref<any>(null),loadingCampaign=ref(true),dockHeight=ref(160),cancelRequest=ref<any>(null)
watch([tab,financeSection,()=>command.value],()=>{if(game.value&&command.value){if(tab.value==='overview'||tab.value==='contracts')navigationNews.markRead(game.value.id,tab.value);if(tab.value==='finance'){navigationNews.markRead(game.value.id,'finance.summary');navigationNews.markRead(game.value.id,'finance.ledger')}}},{flush:'post'})
const country=computed(()=>world.value.find(c=>c.id===selectedCountry.value)||world.value[0])
const contractRegion=ref('')
const worldContext=useState<Record<string,string>>('world-region',()=>({}))
const worldFocus=useState<Record<string,string>>('world-event',()=>({}))
function openWorld(target:{regionId:string;eventId:string}){worldContext.value={...worldContext.value,[game.value.id]:target.regionId};worldFocus.value={...worldFocus.value,[game.value.id]:target.eventId};tab.value='world'}
const pendingAdvance=ref<any>(null)
const pendingCreation=ref<any>(null)
const personnelSummary=ref<any>({}),personnelWorking=ref(false),operationsSummary=ref<any>({missions:[],decisions:[]})
const operationTarget=ref<{id:string}|null>(null)
const activeOperations=computed(()=>operationsSummary.value.missions.filter((mission:any)=>['active','awaiting_decision','returning'].includes(mission.status)))
const operationDecisions=computed(()=>[...operationsSummary.value.decisions].sort((a:any,b:any)=>a.expiresTurn-b.expiresTurn))
const companyAlerts=computed(()=>(command.value?.alerts??[]).filter((alert:any)=>alert.id!=='decisions'))
const availableContracts=computed(()=>(operationsSummary.value.contracts??[]).filter((contract:any)=>contract.status==='available').length)
const interruptedDecision=computed(()=>result.value?.reason==='critical_decision'
 ? operationDecisions.value.find((decision:any)=>decision.createdTurn===result.value.currentTurn)
 : undefined)
function openOperationCard(section:string,id:string){
 operationTarget.value={id}
 navigate('operations',section)
}
function openInterruptedDecision(){
 if(interruptedDecision.value)openOperationCard('decisions','operations-d-'+interruptedDecision.value.id)
}

const entryName=(type:string)=>(({intelligence_analysis:'Análise de inteligência',equipment_purchase:'Compra de kits',equipment_maintenance:'Reparo de kit',equipment_resupply:'Reposição de suprimentos',headquarters_upgrade:'Melhoria da sede',headquarters_maintenance:'Manutenção da sede',operator_training:'Treinamento',operator_treatment:'Tratamento',initial_capital:'Capital inicial',signing_bonus:'Bônus de assinatura',salary_payment:'Pagamento salarial',mission_mobilization:'Mobilização',mission_advance:'Adiantamento de missão',mission_completion:'Acerto de missão',advance_refund:'Devolução de adiantamento'} as Record<string,string>)[type]||'Movimentação financeira')
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
async function select(id:string){const entering=!game.value;busy.value=true;error.value='';try{await api('/games/'+id+'/logistics');await api('/games/'+id+'/intelligence');const selected=await api('/games/'+id);const [nextEvents,nextWorld,nextLedger,nextPersonnel,nextOperations,nextCommand]=await Promise.all([api(`/games/${id}/timeline`),api(`/games/${id}/world/countries`),api(`/games/${id}/finances/ledger`),api(`/games/${id}/finances/summary`),api(`/games/${id}/operations`),api(`/games/${id}/command-center`)]);game.value=selected;events.value=nextEvents;world.value=nextWorld;ledger.value=nextLedger;personnelSummary.value=nextPersonnel;operationsSummary.value=nextOperations;command.value=nextCommand;navigationNews.sync(id,nextCommand.navigationNews??{},nextCommand.alerts);localStorage.setItem('operators-game',id);result.value=command.value?.latestAdvance??null;pendingAdvance.value=result.value?.status==='processing'?result.value.command:null;if(entering&&typeof window!=='undefined'){await nextTick();window.scrollTo({top:0,left:0,behavior:'instant'})}return true}catch(e:any){error.value=e.data?.message||'Não foi possível abrir a partida.';return false}finally{busy.value=false}}
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
  const command=pendingCreation.value||{requestId:crypto.randomUUID(),name:name.value,seed:seed.value,difficulty:difficulty.value,registrationCountryId:registrationCountryId.value};
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
async function home(){if(busy.value||personnelWorking.value)return;busy.value=true;error.value='';try{await load();game.value=null;operationTarget.value=null;missionContext.value=null;visited.value=[];sectionRoutes.value={};tab.value='overview';showCreate.value=false;contractRegion.value='';if(typeof window!=='undefined'){await nextTick();window.scrollTo({top:0,left:0,behavior:'instant'})}}catch{error.value='Não foi possível carregar as companhias. Tente novamente.'}finally{busy.value=false}}
onMounted(async()=>{const restoreRoute=useCampaignRoutes({game,tab,sections:sectionRoutes,financeSection,select,home,isLocked:()=>busy.value||personnelWorking.value});try{await load();await restoreRoute()}catch{error.value='Não foi possível conectar. Atualize a página para tentar novamente.'}finally{loadingCampaign.value=false}})
</script>
<template>
<div v-if="!game" class="campaign-home">
 <header class="home-header"><a class="home-logo" href="/">OPERATORS<span>PMC COMMAND</span></a><span class="home-private"><i class="live-dot"></i> {{authState==='signedIn'?'CAMPANHAS PESSOAIS':'PMC COMMAND'}}</span></header>
 <main class="home-content"><InstallApp /><section class="home-intro"><div><div class="eyebrow">SEU CENTRO DE OPERAÇÕES</div><h1>{{authState==='signedOut'?'Seu comando começa aqui.':'Escolha sua companhia.'}}</h1><p>{{authState==='signedOut'?'Recrute operadores, organize equipes e comande missões em Asterra. Entre para criar sua companhia e salvar seu progresso.':'Retome uma campanha em andamento ou estabeleça um novo comando em Asterra.'}}</p></div><button v-if="setupReady&&games.length" class="primary" :disabled="busy||!!pendingCreation" @click="showCreate=!showCreate">{{showCreate?'Fechar criação':'Criar companhia'}}</button></section>
 <p v-if="browserStorage" class="panel">Suas campanhas ficam salvas somente neste navegador e aparelho, sem precisar de conta. Limpar os dados do site ou usar navegação anônima pode apagar seu progresso. Não há sincronização entre aparelhos.</p>
 <div v-if="error" class="error" role="alert">{{error}} <button v-if="!pendingCreation" class="secondary" :disabled="busy" @click="home">Tentar novamente</button></div>
 <section v-if="authState==='signedOut'" class="panel sign-in-panel"><h2>Entre para jogar</h2><p>Use sua conta ChatGPT. Cada jogador acessa somente suas próprias companhias.</p><a class="primary sign-in-link" href="/signin-with-chatgpt?return_to=%2F" target="_top">Entrar com ChatGPT →</a></section>
 <section v-if="loadingCampaign" class="panel" role="status">Carregando companhias…</section>
 <section v-else-if="setupReady&&(showCreate||!games.length||pendingCreation)" class="panel create home-create"><div><span class="eyebrow">NOVO COMANDO</span><h2>Estabeleça sua companhia.</h2><p>Escolha o nome que representará seu comando. Cada companhia tem sua própria campanha e progresso.</p></div><form @submit.prevent="create"><label>Nome da companhia<input v-model="name" :disabled="busy||!!pendingCreation" required minlength="2" maxlength="60" placeholder="Nome da sua companhia"></label><label>País de registro<select v-model="registrationCountryId" :disabled="busy||!!pendingCreation" required><option v-for="c in registrationCountries" :key="c.id" :value="c.id">{{c.name}}</option></select><small>Escolha permanente. Sem efeitos nas regras do MVP.</small></label><label>Semente da campanha<input v-model="seed" :disabled="busy||!!pendingCreation" required maxlength="100"></label><fieldset class="difficulty-fieldset" :disabled="busy||!!pendingCreation"><legend>Dificuldade da campanha</legend><div class="difficulty-options"><label v-for="profile in difficultyOptions" :key="profile.id" :class="['difficulty-choice',{selected:difficulty===profile.id}]"><input v-model="difficulty" type="radio" name="difficulty" :value="profile.id"><span><strong>{{profile.label}}</strong><small>{{profile.description}}</small></span></label></div><p class="difficulty-permanent">A dificuldade não poderá ser alterada nesta campanha.</p><details v-if="selectedDifficulty" class="difficulty-details"><summary>Ver modificadores · {{selectedDifficulty.label}}</summary><dl><div><dt>Eventos negativos</dt><dd>×{{selectedDifficulty.negativeEvents}}</dd></div><div><dt>Oportunidades favoráveis</dt><dd>×{{selectedDifficulty.positiveEvents}}</dd></div><div><dt>Complicações em missão</dt><dd>×{{selectedDifficulty.missionComplications}}</dd></div><div><dt>Frequência dos rivais</dt><dd>×{{selectedDifficulty.rivalInterest}}</dd></div><div><dt>Remuneração de novos contratos</dt><dd>×{{selectedDifficulty.contractReward}}</dd></div></dl><p>Aplicados sobre as regras-base, respeitando o contexto. Preços, salários, atributos e prazos são iguais nos três níveis.</p></details></fieldset><button class="primary" :disabled="busy||!canCreate">{{busy?'Criando companhia…':pendingCreation?'Repetir criação':'Criar companhia →'}}</button></form></section>
 <section v-if="setupReady&&!loadingCampaign&&games.length" class="company-list-section"><div class="home-section-heading"><h2>Campanhas em andamento</h2><span>{{games.length}} {{games.length===1?'companhia':'companhias'}}</span></div><div class="company-grid"><article v-for="g in games" :key="g.id" class="company-card"><div class="company-card-top"><span class="eyebrow">COMPANHIA INDEPENDENTE</span><span class="tag">{{g.status==='financial_crisis'?'Atenção financeira':'Em andamento'}}</span></div><h3>{{g.name}}</h3><p>País de registro: {{g.registrationCountryName||'País não informado'}}</p><p class="company-difficulty">{{g.difficultyLabel||'Normal'}} · permanente</p><p class="company-progress">Turno {{g.currentTurn}} · Semana {{Math.floor(g.currentTurn/28)+1}}</p><div class="company-metrics"><div><span>CAIXA</span><strong>{{currency(g.cashCents)}}</strong></div><div><span>REPUTAÇÃO</span><strong>{{g.reputation}}<small> / 100</small></strong></div></div><button class="secondary" :disabled="busy||!!pendingCreation" @click="tab='overview';select(g.id)">{{busy?'Abrindo companhia…':'Entrar na companhia →'}}</button><button class="company-delete" :aria-label="'Excluir companhia '+g.name" :disabled="busy||!!pendingCreation" @click="requestDelete(g)">Excluir companhia</button></article></div></section>
 <section v-if="deletingCompany" class="delete-company-backdrop"><form class="panel delete-company-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-company-title" @submit.prevent="removeCompany"><h2 id="delete-company-title">Excluir companhia?</h2><p>Você excluirá <strong>{{deletingCompany.name}}</strong> e todo o progresso, operadores, missões e histórico desta campanha. Esta ação é imediata e não pode ser desfeita.</p><label>Digite o nome da companhia para confirmar<input v-model="deleteName" :disabled="busy" autocomplete="off" autofocus></label><p v-if="error" class="error" role="alert">{{error}}</p><div class="heading-actions"><button type="button" class="secondary" :disabled="busy" @click="deletingCompany=null">Cancelar</button><button type="submit" class="danger" :disabled="busy||deleteName!==deletingCompany.name">{{busy?'Excluindo…':'Excluir definitivamente'}}</button></div></form></section>
 </main>
</div>
<div v-else class="shell planned-shell" :style="{ '--turn-dock-height':dockHeight+'px' }">
 <main><header class="account-bar"><div class="account-identity"><details class="company-details"><summary :title="game.name">{{game.name}} <span aria-hidden="true">⌄</span></summary><div class="company-details-content"><h2>Detalhes da companhia</h2><dl><div><dt>Registro</dt><dd>{{game.registrationCountryName||'País não informado'}}</dd></div><div><dt>Dificuldade</dt><dd>{{game.difficultyLabel||'Normal'}} · permanente</dd></div><div><dt>Situação</dt><dd>{{game.status==='financial_crisis'?'Atenção financeira':'Companhia ativa'}}</dd></div><div><dt>Mundo</dt><dd>Asterra</dd></div></dl><button class="secondary" :disabled="busy||personnelWorking" @click="home">← Trocar companhia</button></div></details><small>Turno {{game.currentTurn}} · {{date}}</small></div><button class="account-balance balance-link" :disabled="busy||personnelWorking" aria-label="Abrir finanças" @click="navigate('finance')"><span>SALDO DA CONTA</span><strong>{{currency(game.cashCents,true)}}</strong></button><div v-if="command?.pendingOrders?.length" class="planned-balance"><span>Despesas planejadas <b>{{currency(command.plannedExpensesCents,true)}}</b></span><span v-if="command.plannedIncomeCents">Receitas líquidas previstas <b>{{currency(command.plannedIncomeCents,true)}}</b></span><span>Após confirmar <b>{{currency(command.projectedCashCents,true)}}</b></span></div></header>
 <aside class="command-navigation"><button class="company-return" :disabled="busy||personnelWorking" @click="home" aria-label="Voltar às companhias">← Companhias</button><div class="workspace-label">CENTRO DE COMANDO</div><nav aria-label="Navegação principal"><button v-for="item in areaItems" :key="item[0]" :class="{active:area===item[0]}" :aria-current="area===item[0]?'page':undefined" :disabled="busy||personnelWorking" @click="navigate(item[0])"><span aria-hidden="true"><GameIcon :name="item[0]==='overview'?'command':item[0]" /></span>{{item[2]}}<NavigationBadge :status="areaStatus(item[0])" /></button></nav></aside>
 <div class="content"><nav v-if="areaTabs.length" class="area-tabs" aria-label="Áreas da seção"><button v-for="item in areaTabs" :key="item[0]" :class="{active:tab===item[0]}" :aria-current="tab===item[0]?'page':undefined" :disabled="busy||personnelWorking" @click="navigate(item[0])">{{item[1]}}<NavigationBadge :status="navigationNews.status(game.id,item[0])" /></button></nav><div class="page-heading"><h1>{{nav.find(n=>n[0]===tab)?.[2]}}</h1></div>
 <div v-if="error" role="alert" class="error">{{error}}</div><p v-if="personnelWorking&&!busy" class="batch-result" role="status">Uma ordem está sendo salva na fila. Conclua ou repita a solicitação nesta tela antes de navegar ou avançar.</p>
 <template v-if="game">
 <p v-if="game.status==='financial_crisis'" class="company-crisis" role="status">Atenção financeira · Revise o caixa e os compromissos em Finanças.</p>
 <section v-if="missionContext?.gameId===game.id&&tab!=='contracts'" class="preparation-return"><div><strong>Preparação de missão</strong><p>{{missionContext.title}}</p></div><button class="secondary" :disabled="busy||personnelWorking" @click="navigate('contracts')">Voltar à preparação →</button></section>
 <FirstMissionGuide v-if="tab==='overview'||missionContext?.gameId!==game.id" :command="command" :employed="personnelSummary.employed||0" :compact="tab!=='overview'" :disabled="busy||personnelWorking" @navigate="navigate" />
 <template v-if="tab==='overview'">
 <section class="panel command-alerts" aria-labelledby="operations-overview-title">
  <h2 id="operations-overview-title">Operações</h2>
  <article v-for="decision in operationDecisions" :key="decision.id" class="command-alert">
   <div><h3>{{operationsSummary.missions.find((mission:any)=>mission.id===decision.missionId)?.contractTitle || 'Operação'}}</h3><p>Decisão pendente · prazo no turno {{decision.expiresTurn}}</p></div>
   <button class="secondary" :disabled="busy||personnelWorking" @click="openOperationCard('decisions','operations-d-'+decision.id)">Ver decisão</button>
  </article>
  <article v-for="mission in activeOperations" :key="mission.id" class="command-alert">
   <div><h3>{{mission.contractTitle || 'Operação'}}</h3><p>{{mission.status==='awaiting_decision'?'Aguardando decisão':mission.status==='returning'?'Equipe retornando':mission.stageName}}</p></div>
   <button class="secondary" :disabled="busy||personnelWorking" @click="openOperationCard('missions','operations-m-'+mission.id)">Acompanhar</button>
  </article>
  <p v-if="!activeOperations.length">Nenhuma operação em andamento.</p>
  <button class="secondary" :disabled="busy||personnelWorking" @click="contractRegion='';navigate('contracts')">Ver contratos ({{availableContracts}} disponíveis)</button>
 </section>
 <section v-if="companyAlerts.length" class="panel command-alerts"><div class="panel-heading"><h2>Atenção do comandante</h2><span class="tag">{{companyAlerts.length}} PENDÊNCIAS</span></div><article v-for="a in companyAlerts" :key="a.id" class="command-alert" :class="a.severity"><div><h3>{{a.title}}</h3><p>{{a.description}}</p></div><button class="secondary" :disabled="busy||personnelWorking" @click="navigate(a.tab)">Resolver →</button></article></section>
 <nav class="command-shortcuts" aria-label="Atalhos da companhia"><button class="secondary" :disabled="busy||personnelWorking" @click="navigate('operators','recruitment')">Contratar operadores →</button><button class="secondary" :disabled="busy||personnelWorking" @click="navigate('operators','squads')">Gerenciar equipes →</button><button class="secondary" :disabled="busy||personnelWorking" @click="navigate('infrastructure','catalog')">Comprar kits →</button><button class="secondary" :disabled="busy||personnelWorking" @click="navigate('contracts')">Ver contratos →</button></nav>
 <div class="stats overview-stats"><section class="stat"><span>CAIXA DISPONÍVEL</span><strong>{{currency(game.cashCents)}}</strong><small>{{personnelSummary.employed||0}} vínculos ativos</small></section><section class="stat"><span>REPUTAÇÃO GLOBAL</span><strong>{{game.reputation}}<em>/ 100</em></strong><small>Resultados e relações da campanha</small></section><section class="stat"><span>TURNO ATUAL</span><strong>{{String(game.currentTurn).padStart(3,'0')}}</strong><small>Semana {{Math.floor(game.currentTurn/28)+1}} · {{game.currentTurn*6}} horas decorridas</small></section><section class="stat"><span>QUADRO DE OPERADORES</span><strong>{{personnelSummary.employed||0}}<em> / {{personnelSummary.capacity||12}}</em></strong><small>Operadores com vínculo ativo</small></section></div>

 <div v-if="result" class="batch-result" role="status"><strong>{{result.reason==='critical_decision'?'Decisão do comandante necessária':result.status==='completed'?'Avanço concluído':result.status==='failed'?'Lote interrompido por falha':result.status==='processing'?'Avanço aguardando conclusão':'Evento importante'}}</strong> · {{result.processedTurns}} de {{result.requestedTurns}} turnos confirmados. Turno atual: {{result.currentTurn}}. <span v-if="command?.latestAdvance?.requestId===result.requestId">Movimentação no avanço: {{currency(command.latestAdvance.cashMovementCents,true)}} · {{command.latestAdvance.eventCount}} ocorrências.</span><button v-if="result.status==='failed'" @click="resume" :disabled="busy">Retomar restantes</button></div>
 <section v-if="command?.latestAdvance" class="panel batch-details"><details><summary>Resumo do último avanço · turno {{command.latestAdvance.startTurn}} → turno {{command.latestAdvance.endTurn}}</summary><p>Receitas {{currency(command.latestAdvance.receiptsCents,true)}} · despesas {{currency(command.latestAdvance.expensesCents,true)}}. Inclui ordens confirmadas no primeiro turno e movimentações automáticas dos turnos processados.</p><ul><li v-for="e in command.latestAdvance.events" :key="e.type+e.title">{{e.title}} <strong>× {{e.count}}</strong></li></ul><p v-if="!command.latestAdvance.events.length">Nenhuma ocorrência adicional nos turnos confirmados.</p></details></section>
 <div class="command-grid"><section v-if="command?.agenda?.length" class="panel"><h2>Próximos prazos</h2><button v-for="a in command.agenda.slice(0,8)" :key="a.id" class="agenda-item" :disabled="busy||personnelWorking" @click="navigate(a.tab)"><span>{{a.title}}</span><strong>turno {{a.dueTurn}}</strong></button><p>Prazos avançam somente sob seu comando. Decisões vencidas aplicam a política automática.</p></section></div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><h2>Registro de comando</h2><span class="tag">HISTÓRICO</span></div><div v-if="!events.length" class="empty"><div class="empty-icon">⌁</div><h3>Aguardando seu primeiro comando</h3><p>Avance o tempo para registrar os primeiros eventos da campanha.</p></div><div v-for="event in events.slice(0,8)" :key="`${event.turn}-${event.sequence}`" class="event"><span class="event-marker" :class="{important:event.important}"></span><div><div class="event-title">{{event.title}}<small>turno {{String(event.turn).padStart(3,'0')}}</small></div><p>{{event.description}}</p></div></div></section><div class="right-stack"><section class="panel briefing"><div class="eyebrow">SITUAÇÃO ATUAL</div><h2>Compromissos da companhia</h2><div class="brief-line"><span>Persistência</span><strong>{{browserStorage?"Neste navegador":"Salvamento online"}}</strong></div><div class="brief-line"><span>Avanço</span><strong>1 a 28 turnos</strong></div><div class="brief-line"><span>Custo semanal atual</span><strong>{{currency(command?.finance?.weeklyTotalCents||0)}}</strong></div><p v-if="command?.finance?.runwayWeeks!==null">Caixa cobre cerca de {{command?.finance?.runwayWeeks??0}} semanas das despesas atuais, descontadas dívidas. Estimativa sem novas receitas ou gastos pontuais.</p></section></div></div>
 </template>
 <WorldPanel v-if="visited.includes('world')" v-show="tab==='world'" :game="game" @open-contracts="contractRegion=$event;navigate('contracts')" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <LogisticsPanel v-if="visited.includes('infrastructure')" v-show="tab==='infrastructure'" :game="game" :initial-section="targetSection" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <PersonnelPanel v-if="visited.includes('operators')" v-show="tab==='operators'" :game="game" :initial-section="targetSection" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <OperationsPanel v-for="panelMode in ['contracts','operations'].filter(t=>visited.includes(t))" :key="panelMode" v-show="tab===panelMode" :game="game" :mode="panelMode" :region-id="contractRegion" :card-target="panelMode==='operations'?operationTarget:null" @card-opened="operationTarget===$event&&(operationTarget=null)" @navigate="navigate" @clear-region="contractRegion=''" @open-world="openWorld($event)" @changed="select(game.id)" @processing="personnelWorking=$event" />
 <template v-if="tab==='finance'"><CompanyFinanceSummary :game="game" :command="command" /><section id="finance-ledger" class="panel"><div class="panel-heading"><h2>Livro-razão</h2><span class="tag">CONFIRMADO</span></div><p class="form-hint">Turnos mais recentes primeiro. Datas e horários do jogo. Ordens agendadas entram aqui após a confirmação.</p><p v-if="!ledgerNewest.length" class="empty">Nenhuma movimentação confirmada.</p><table v-else><thead><tr><th>TURNO</th><th>LANÇAMENTO</th><th>VALOR</th></tr></thead><tbody><tr v-for="entry in ledgerNewest" :key="entry.sourceId+':'+entry.entryType"><td data-label="Turno"><span class="ledger-value">Turno {{entry.turn}}<small class="ledger-detail">{{formatGameDate(entry.date)}}</small></span></td><td data-label="Lançamento"><span class="ledger-value">{{entry.description||entryName(entry.entryType)}}<small v-if="entry.detail" class="ledger-detail">{{entry.detail}}</small></span></td><td data-label="Valor" :class="entry.amountCents<0?'debit':'credit'">{{currency(entry.amountCents,true)}}</td></tr></tbody></table></section></template>

 </template>
 </div>
 </main>
 <TurnDock :game="game" :command="command" :busy="busy" :locked="personnelWorking" :turns="batch" :stop="stop" :pending="!!pendingAdvance" :result="result" :has-interrupted-decision="!!interruptedDecision" :error="error" @open-decision="openInterruptedDecision" @update:turns="batch=$event" @update:stop="stop=$event" @height="dockHeight=$event" @advance="advance" @resume="resume" @cancel="cancelOrder" @navigate="navigate($event)" />
</div>
</template>
