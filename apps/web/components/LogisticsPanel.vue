<script setup lang="ts">
const {feedbackTarget,captureAction}=useActionFeedback()
const props=defineProps<{game:any;initialSection?:string;kitNavigation?:{category:string;catalogId?:string}|null}>(),emit=defineEmits(['changed','processing'])
const dateAt=(turn:number|null|undefined,includeYear=false)=>formatCampaignTurn(props.game,turn,includeYear)
const data=ref<any>(null),busy=ref(false),error=ref(''),notice=ref(''),review=ref<any>(null),mode=ref(['headquarters','catalog','inventory'].includes(props.initialSection||'')?props.initialSection!:'headquarters'),category=ref(''),quantity=ref(1)
const commands=useState<Record<string,any>>('logistics-commands',()=>({})),pending=computed({get:()=>commands.value[props.game.id]??null,set:(v:any)=>commands.value={...commands.value,[props.game.id]:v}}),locked=computed(()=>busy.value||!!pending.value)
const base=()=>'/api/v1/games/'+props.game.id,money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
const states:any={in_delivery:'Em entrega',available:'No depósito',reserved:'Reservado',in_use:'Em missão',maintenance:'Em preparação',destroyed:'Destruído'},capacities:any={training:'vagas de treinamento',infirmary:'vagas de tratamento',depot:'unidades de armazenagem',operations:'operações simultâneas',administration:'operadores com vínculo'}
const qualityChoice=ref<Record<string,string>>({})
const stockCategory=ref('')
const catalogGroups=computed(()=>kitCatalogGroups(data.value?.catalog??[],category.value))
const visibleInventory=computed(()=>(data.value?.inventory??[]).filter((kit:any)=>!stockCategory.value||kit.category===stockCategory.value))
watch(()=>props.kitNavigation,(target,previous)=>{
 if(!target&&!previous)return
 category.value=target?.category??''
 stockCategory.value=category.value
 if(target?.catalogId)selectQuality(target.category,target.catalogId)
},{immediate:true})
function activeKit(group:any){return group.variants.find((c:any)=>c.id===qualityChoice.value[group.category])??group.variants[0]}
function selectQuality(category:string,id:string){qualityChoice.value={...qualityChoice.value,[category]:id};review.value=null}
function purchaseIssue(c:any){return kitPurchaseIssue(c,quantity.value,data.value,props.game.cashCents)}
function upgradeProgress(m:any){return Math.max(0,Math.min(m.upgradeTurns,m.upgradeTurns-(m.dueTurn-data.value.currentTurn)))}
async function refresh(){try{data.value=await $fetch(base()+'/logistics');return true}catch(e:any){error.value=e.data?.message||'Não foi possível carregar a sede.';return false}}
const scheduled=(target:string)=>(data.value?.pendingOrders??[]).filter((o:any)=>o.target===target&&o.kind!=='purchase')
const purchases=(catalogId:string)=>(data.value?.pendingOrders??[]).filter((o:any)=>o.kind==='purchase'&&o.command.catalogId===catalogId)
const preparationUsage=computed(()=>{
  const inProgress=(data.value?.inventory??[]).filter((kit:any)=>kit.status==='maintenance')
  const queued=(data.value?.pendingOrders??[]).filter((order:any)=>order.scope==='logistics'&&['maintenance','resupply','refurbish'].includes(order.kind))
  const completionTurns=[...inProgress,...queued]
    .map((item:{dueTurn?:number|null})=>item.dueTurn)
    .filter((turn):turn is number=>typeof turn==='number')
  const activeSlots=inProgress.reduce((slots:number,kit:any)=>slots+(kit.task==='refurbish'?2:1),0)
  const queuedSlots=queued.reduce((slots:number,order:any)=>slots+(order.kind==='refurbish'?2:1),0)
  return {
    inProgress:activeSlots,
    queued:queuedSlots,
    occupied:activeSlots+queuedSlots,
    nextCompletion:completionTurns.length?Math.min(...completionTurns):null,
  }
})
const freePreparationSlots=computed(()=>(data.value?.preparationCapacity??0)-preparationUsage.value.occupied)
const preparationFull=computed(()=>freePreparationSlots.value<=0)
function cancelQueued(id:string){review.value={path:'/orders/'+id+'/cancel',body:{}};return run()}
function prepare(path:string,body:any,label:string,cost:number,consequence:string){review.value={path,body,label,cost,consequence};error.value=''}
async function run(){if(busy.value||(!review.value&&!pending.value))return;const command=pending.value||{path:review.value.path,body:{...review.value.body,requestId:crypto.randomUUID(),expectedVersion:data.value.stateVersion}};pending.value=command;busy.value=true;emit('processing',true);error.value='';notice.value='';let done=false;try{const response=await $fetch<any>(base()+command.path,{method:'POST',body:command.body});if(!await refresh())return;pending.value=null;review.value=null;notice.value=response.cancelledOrderId?'Ordem removida. A ação não será confirmada.':'';done=true}catch(e:any){if(e.status>=400&&e.status<500){pending.value=null;review.value=null;await refresh()}error.value=e.data?.message||'Falha de conexão. Repita para recuperar o mesmo comando.'}finally{busy.value=false;emit('processing',!!pending.value)}if(done)emit('changed')}
watch(()=>[props.game.id,props.game.stateVersion],async()=>{review.value=null;await refresh()})
onMounted(async()=>{emit('processing',!!pending.value);await refresh()})

</script>
<template><div class="logistics-panel" :aria-busy="busy" @click.capture="captureAction($event)"><ActionFeedback :target="feedbackTarget" :section="mode" :turn="game.currentTurn" v-model:error="error" v-model:notice="notice" />
 <section v-if="pending&&!busy" class="panel"><p>Comando aguardando confirmação. Repetir não duplica compras ou débitos.</p><button class="primary action-block" @click="run">Repetir comando</button></section>
 <template v-if="data">
 <div v-if="mode==='headquarters'" class="stats finance-stats logistics-summary"><section class="stat"><span>MANUTENÇÃO SEMANAL</span><strong>{{money(data.headquarters.weeklyMaintenanceCents)}}</strong><small>Fechamento semanal, após salários</small></section><section class="stat"><span>ARMAZENAGEM</span><strong>{{data.load}} / {{data.loadCapacity}}</strong><small>Inclui kits em entrega, serviço e missão</small></section></div>
 <SectionNav :game-id="game.id" scope="infrastructure" v-model="mode" label="Seções de sede e logística" :disabled="locked" :items="[['headquarters','Instalações'],['catalog','Comprar kits'],['inventory','Estoque e serviços']]" />
 <div v-if="data.headquarters.arrearsCents" class="error">Manutenção em atraso: {{money(data.headquarters.arrearsCents)}}. Compras, serviços, melhorias, novas missões e treinos suspensos. A quitação ocorre ao avançar com caixa suficiente após os salários.</div>

 <template v-if="mode==='headquarters'"><div class="section-intro"><h2>{{data.headquarters.name}}</h2><p>Melhorias sequenciais mantêm a capacidade atual até a conclusão. Sede ativada em {{dateAt(data.headquarters.activatedTurn,true)}}.</p></div><div class="personnel-grid"><article v-for="m in data.modules" :key="m.type" data-action-card :id="'logistics-m-'+m.type" class="panel"><span class="eyebrow">NÍVEL {{m.level}} / 5</span><h3>{{m.name}}</h3><p>{{m.capacity}} {{m.capacity===1?({training:'vaga de treinamento',infirmary:'vaga de tratamento',depot:'unidade de armazenagem',operations:'operação simultânea',administration:'operador com vínculo'} as Record<string,string>)[m.type]:capacities[m.type]}}<br>{{money(m.weeklyCostCents)}} / semana</p>
 <p v-if="m.type==='depot'"><strong>{{preparationUsage.occupied}} / {{data.preparationCapacity}}</strong> vagas de serviço ocupadas<br>Reparos e reposições compartilham essas vagas. Serviços agendados entram na contagem.</p>
 <section v-if="m.targetLevel" class="facility-progress"><label>Melhoria em andamento <strong>{{formatCampaignDuration(Math.max(0,m.dueTurn-data.currentTurn))}} restantes</strong><progress :value="upgradeProgress(m)" :max="m.upgradeTurns" :aria-label="'Melhoria de '+m.name" /></label></section><p v-if="m.level<5" class="facility-benefit">{{m.type==='depot'?'Armazenagem':'Capacidade'}}: <strong>{{m.capacity}} → {{m.nextCapacity}}</strong><br>
 <template v-if="m.type==='depot'">Vagas de serviço: <strong>{{data.preparationCapacity}} → {{data.nextPreparationCapacity}}</strong><br></template>
 Manutenção no próximo nível: {{money(m.nextWeeklyCostCents)}} / semana</p><p v-if="m.targetLevel">Melhoria para nível {{m.targetLevel}} em andamento · conclusão prevista para {{dateAt(m.dueTurn)}}. Capacidade atual preservada.</p><p v-else-if="m.level<5">Próximo nível: {{money(m.upgradeCostCents)}} · {{formatCampaignDuration(m.upgradeTurns)}}</p><button v-if="m.level<5&&!m.targetLevel&&!scheduled(m.type).length" class="secondary action-block" :disabled="locked||!!data.headquarters.arrearsCents||game.cashCents<m.upgradeCostCents" @click="prepare('/headquarters/modules/'+m.type+'/upgrade',{},'Melhorar '+m.name,m.upgradeCostCents,'Conclusão prevista para '+dateAt(data.currentTurn+m.upgradeTurns)+'. Capacidade '+m.nextCapacity+(m.type==='depot'?', com '+data.nextPreparationCapacity+' vagas de serviço':'')+'. Manutenção do módulo passa a '+money(m.nextWeeklyCostCents)+'/semana.')">Revisar melhoria</button><span v-else-if="m.level===5" class="tag">Nível máximo</span> <PendingOrderNotice :orders="scheduled(m.type)" :disabled="locked" @remove="cancelQueued" /><FocusDialog v-if="review?.path==='/headquarters/modules/'+m.type+'/upgrade'" title="Revisar melhoria" :busy="busy" :error="error" @close="review=null"><section class="inline-action decision-card"><span class="eyebrow">REVISÃO DO COMANDO</span><h2>{{review.label}}</h2><p>Cobrança ao confirmar o avanço {{money(review.cost)}}<br>{{review.consequence}}</p><div class="personnel-actions"><button class="primary" :disabled="locked||game.cashCents<review.cost" @click="run">Agendar · {{money(review.cost)}}</button><button class="secondary" :disabled="locked" @click="review=null">Voltar</button></div></section></FocusDialog></article></div></template>
 <template v-else-if="mode==='catalog'">
  <div class="kit-toolbar">
   <label class="personnel-label">Categoria<GameLabelSelect v-model="category" kind="kit" all="Todas" /></label>
   <label class="personnel-label kit-quantity">Quantidade<input v-model.number="quantity" type="number" min="1" max="10"></label>
  </div>
  <p class="kit-capacity">Armazenagem · {{data.load}} / {{data.loadCapacity}}</p>
 <div class="personnel-grid grouped-kits"><article v-for="group in catalogGroups" :key="group.category" class="panel"><h3><GameLabel kind="kit" :code="group.category" :label="'Kit '+kitNames[group.category]" /></h3><div class="kit-quality" role="group" :aria-label="'Qualidade do kit '+kitNames[group.category]"><button v-for="variant in group.variants" :key="variant.id" class="secondary" :aria-pressed="activeKit(group).id===variant.id" :disabled="locked" @click="selectQuality(group.category,variant.id)"><strong>{{['I','II','III'][variant.quality-1]}}</strong><small>{{money(variant.priceCents)}}</small><small v-if="purchases(variant.id).length">{{purchases(variant.id).length}} agendada(s)</small></button></div><template v-for="c in [activeKit(group)]" :key="c.id"><div data-action-card :id="'logistics-c-'+c.id"><p>{{money(c.priceCents)}} por unidade<br>Carga {{c.weight}} · entrega em {{formatCampaignDuration(c.deliveryTurns)}}</p><button class="primary action-block" :disabled="locked||!!purchaseIssue(c)" @click="prepare('/equipment/purchases',{catalogId:c.id,quantity},'Comprar '+quantity+' kit(s) '+c.name,c.priceCents*quantity,'Entrega prevista para '+dateAt(data.currentTurn+c.deliveryTurns)+'. Carga adicional '+c.weight*quantity+'.')">{{purchases(c.id).length?'Agendar outra compra':'Revisar compra'}}</button><PendingOrderNotice :orders="purchases(c.id)" label-kind="kit" :label-code="c.category" :disabled="locked" @remove="cancelQueued" /> <FocusDialog v-if="review?.body.catalogId===c.id" title="Revisar compra" :busy="busy" :error="error" @close="review=null"><section class="inline-action decision-card"><span class="eyebrow">REVISÃO DO COMANDO</span><h2><GameLabel kind="kit" :code="c.category" :label="review.label" /></h2><p>Cobrança ao confirmar o avanço {{money(review.cost)}}<br>{{review.consequence}}</p><div class="personnel-actions"><button class="primary" :disabled="locked||game.cashCents<review.cost" @click="run">Agendar · {{money(review.cost)}}</button><button class="secondary" :disabled="locked" @click="review=null">Voltar</button></div></section></FocusDialog><p v-if="purchaseIssue(c)" class="purchase-issue">{{purchaseIssue(c)}}</p></div></template></article></div>
 </template><template v-else>
  <div class="kit-toolbar">
   <label class="personnel-label">Categoria<GameLabelSelect v-model="stockCategory" kind="kit" all="Todas" /></label>
  </div>
  <p class="kit-capacity">Serviços · {{preparationUsage.occupied}} / {{data.preparationCapacity}} vagas ocupadas<template v-if="preparationFull&&preparationUsage.nextCompletion!==null"> · próxima liberação {{dateAt(preparationUsage.nextCompletion)}}</template></p>
  <details class="card-details depot-details">
   <summary>Capacidade e condições dos kits</summary>
   <p>{{preparationUsage.inProgress}} em serviço · {{preparationUsage.queued}} agendados. Reparar e repor juntos ocupa duas vagas.</p>
   <p>Mínimos para envio · condição {{data.minimumCondition}}, suprimentos {{data.minimumSupplies}}.</p>
  </details>
  <div v-if="!visibleInventory.length" class="empty action-empty">
   <p>{{stockCategory?'Nenhum kit dessa categoria no estoque.':'Estoque vazio.'}}</p>
   <button type="button" class="secondary" @click="category=stockCategory;mode='catalog'">Comprar kits</button>
  </div>
  <div class="personnel-grid">
<article v-for="k in visibleInventory" :key="k.id" data-action-card :id="'logistics-k-'+k.id" class="panel"><StateBadge :status="k.ready?'ready':k.status" :label="k.ready?'Apto para envio':states[k.status]||k.status" /><h3><GameLabel kind="kit" :code="k.category" :label="'Kit '+k.name" /></h3><p>Condição {{k.condition}} / 100<br>Suprimentos {{k.supplies}} / 100<br>Carga {{k.weight}}<br><span v-if="k.dueTurn!=null">Disponibilidade prevista para {{dateAt(k.dueTurn)}}</span><span v-else-if="k.missionId">Alocado a missão</span><span v-else>{{k.ready?'Apto para envio':'Requer preparação antes do envio'}}</span></p><PendingOrderNotice :orders="scheduled(k.id)" label-kind="kit" :label-code="k.category" :disabled="locked" @remove="cancelQueued" /><div v-if="k.status==='available'&&!scheduled(k.id).length" class="personnel-actions"><button v-if="k.maintenanceCostCents" class="secondary" :disabled="locked||preparationFull||!!data.headquarters.arrearsCents" @click="prepare('/equipment/'+k.id+'/maintenance',{},'Reparar kit '+k.name,k.maintenanceCostCents,'Condição volta a 100 em 1 dia. Suprimentos preservados.')">Reparar · {{money(k.maintenanceCostCents)}}</button><button v-if="k.resupplyCostCents" class="secondary" :disabled="locked||preparationFull||!!data.headquarters.arrearsCents" @click="prepare('/equipment/'+k.id+'/resupply',{},'Repor kit '+k.name,k.resupplyCostCents,'Suprimentos voltam a 100 em 1 dia. Condição preservada.')">Repor · {{money(k.resupplyCostCents)}}</button>
 <button v-if="k.refurbishCostCents" class="secondary combined-kit-service" :disabled="locked||freePreparationSlots<2||!!data.headquarters.arrearsCents" @click="prepare('/equipment/'+k.id+'/refurbish',{},'Reparar e repor kit '+k.name,k.refurbishCostCents,'Condição e suprimentos chegam a 100 em 1 dia. Ocupa duas vagas de preparação.')">Reparar e repor · {{money(k.refurbishCostCents)}}</button></div> <FocusDialog v-if="review?.path.startsWith('/equipment/'+k.id+'/')" title="Revisar serviço do kit" :busy="busy" :error="error" @close="review=null"><section class="inline-action decision-card"><span class="eyebrow">REVISÃO DO COMANDO</span><h2><GameLabel kind="kit" :code="k.category" :label="review.label" /></h2><p>Cobrança ao confirmar o avanço {{money(review.cost)}}<br>{{review.consequence}}</p><div class="personnel-actions"><button class="primary" :disabled="locked||preparationFull||game.cashCents<review.cost" @click="run">Agendar · {{money(review.cost)}}</button><button class="secondary" :disabled="locked" @click="review=null">Voltar</button></div></section></FocusDialog></article></div></template>
 </template><p v-else>Carregando infraestrutura…</p></div></template>

<style scoped>
.kit-toolbar{display:flex;gap:var(--space-2);align-items:end}
.kit-toolbar .personnel-label{min-width:0;flex:1;margin-bottom:var(--space-2)}
.kit-toolbar .kit-quantity{flex:0 0 96px}
.kit-toolbar .kit-quantity input{margin-top:0}
.kit-capacity{margin-bottom:var(--space-2);font-size:var(--text-caption)}
.depot-details{margin:0 0 var(--space-2)}
.grouped-kits [data-action-card]>.primary{margin-top:var(--space-2)}
@media(min-width:641px){.combined-kit-service{flex:0 0 100%;width:100%}}
</style>
