<script setup lang="ts">
const {feedbackTarget,captureAction}=useActionFeedback()
const props=defineProps<{game:any;initialSection?:string;kitNavigation?:{category:string;catalogId?:string}|null}>(),emit=defineEmits(['changed','processing'])
const dateAt=(turn:number|null|undefined,includeYear=false)=>formatCampaignTurn(props.game,turn,includeYear)
const data=ref<any>(null),busy=ref(false),error=ref(''),notice=ref(''),review=ref<any>(null),mode=ref(['headquarters','catalog','inventory'].includes(props.initialSection||'')?props.initialSection!:'headquarters'),category=ref(''),quantity=ref(1)
const commands=useState<Record<string,any>>('logistics-commands',()=>({})),pending=computed({get:()=>commands.value[props.game.id]??null,set:(v:any)=>commands.value={...commands.value,[props.game.id]:v}}),locked=computed(()=>busy.value||!!pending.value)
const base=()=>'/api/v1/games/'+props.game.id,money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'}).format(n/100)
const states:any={in_delivery:'Em entrega',available:'No depósito',reserved:'Reservado',in_use:'Em missão',maintenance:'Em preparação',destroyed:'Destruído'}
const facilities={
 administration:{icon:'company',capacityLabel:'Operadores com vínculo'},
 operations:{icon:'command',capacityLabel:'Operações simultâneas'},
 depot:{icon:'kit-logistics',capacityLabel:'Armazenagem'},
 training:{icon:'kit-combat',capacityLabel:'Vagas de treinamento'},
 intelligence:{icon:'command',capacityLabel:'Contatos por semana'},
 infirmary:{icon:'kit-medical',capacityLabel:'Vagas de tratamento'},
}
const depotActions=[
 {section:'inventory',label:'Estoque e serviços'},
 {section:'catalog',label:'Comprar kits'},
]
const depotActionColumns=depotActions.map(({label})=>`minmax(0, ${label.length}fr)`).join(' ')
type FacilityType=keyof typeof facilities
interface Facility {
 type:FacilityType
 name:string
 level:number
 capacity:number
 weeklyCostCents:number
 targetLevel:number|null
 dueTurn:number|null
 nextCapacity:number|null
 nextWeeklyCostCents:number|null
 upgradeCostCents:number|null
 upgradeTurns:number|null
}
const facilityTypes=Object.keys(facilities) as FacilityType[]
const selectedFacility=ref<FacilityType|null>(null)
const facilityMap=computed(()=>facilityTypes.flatMap(type=>{
 const facility=(data.value?.modules as Facility[]|undefined)?.find(module=>module.type===type)
 return facility?[facility]:[]
}))
const facilityDetail=computed(()=>facilityMap.value.find(module=>module.type===selectedFacility.value))
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
function remainingUpgradeTurns(facility:Facility){
 return facility.dueTurn===null?0:Math.max(0,facility.dueTurn-data.value.currentTurn)
}
function upgradeProgress(facility:Facility){
 return Math.max(0,(facility.upgradeTurns??0)-remainingUpgradeTurns(facility))
}
function closeFacility(){selectedFacility.value=null;review.value=null}
function scheduleUpgrade(type:FacilityType){
 review.value={path:'/headquarters/modules/'+type+'/upgrade',body:{}}
 return run()
}
async function refresh(){try{data.value=await $fetch(base()+'/logistics');return true}catch(e:any){error.value=e.data?.message||'Não foi possível carregar a sede.';return false}}
const scheduled=(target:string)=>(data.value?.pendingOrders??[]).filter((o:any)=>o.target===target&&o.kind!=='purchase')
const facilityOrders=(type:FacilityType)=>scheduled(type).filter((order:any)=>order.kind==='upgrade')
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
watch(()=>props.game.id,closeFacility)
onMounted(async()=>{emit('processing',!!pending.value);await refresh()})

watch(mode,closeFacility)
</script>
<template><div class="logistics-panel" :aria-busy="busy" @click.capture="captureAction($event)"><ActionFeedback :target="feedbackTarget" :section="mode" :turn="game.currentTurn" v-model:error="error" v-model:notice="notice" />
 <section v-if="pending&&!busy" class="panel"><p>Comando aguardando confirmação. Repetir não duplica compras ou débitos.</p><button class="primary action-block" @click="run">Repetir comando</button></section>
 <template v-if="data">
 <SectionNav :game-id="game.id" scope="infrastructure" v-model="mode" label="Seções de sede e logística" :disabled="locked" :items="[['headquarters','Instalações'],['catalog','Comprar kits'],['inventory','Estoque e serviços']]" />
 <div v-if="data.headquarters.arrearsCents" class="error">Manutenção em atraso: {{money(data.headquarters.arrearsCents)}}. Compras, serviços, melhorias, novas missões e treinos suspensos. A quitação ocorre ao avançar com caixa suficiente após os salários.</div>

 <template v-if="mode==='headquarters'">
  <dl class="headquarters-maintenance">
   <dt>Manutenção semanal</dt><dd>{{money(data.headquarters.weeklyMaintenanceCents)}}</dd>
  </dl>
  <div class="facility-map" role="group" aria-label="Planta da sede">
   <button
    v-for="facility in facilityMap" :id="'logistics-m-'+facility.type" :key="facility.type"
    type="button" class="facility-room" :class="{'facility-room-operations':facility.type==='operations'}"
    :style="{gridArea:facility.type}" data-action-card
    aria-haspopup="dialog" @click="selectedFacility=facility.type"
   >
    <span class="facility-room-top">
     <GameIcon :name="facilities[facility.type].icon" />
     <span>Nível {{facility.level}} / 5</span>
     <span class="facility-room-arrow" aria-hidden="true">↗</span>
    </span>
    <strong class="facility-room-name">{{facility.name}}</strong>
    <span class="facility-room-metric">
     <span>{{facilities[facility.type].capacityLabel}}</span>
     <strong>{{facility.type==='depot'?`${data.load} / ${data.loadCapacity}`:facility.type==='intelligence'?`${data.intelligenceContacts.remaining} / ${data.intelligenceContacts.total}`:facility.capacity}}</strong>
    </span>
    <span v-if="facility.type==='depot'" class="facility-room-metric">
     <span>Vagas de serviço ocupadas</span><strong>{{preparationUsage.occupied}} / {{data.preparationCapacity}}</strong>
    </span>
    <span v-if="facility.targetLevel" class="facility-room-status">
     <GameIcon name="clock" /> Em melhoria · falta {{formatCampaignDuration(remainingUpgradeTurns(facility))}}
    </span>
    <span v-else-if="facilityOrders(facility.type).length" class="facility-room-status">
     <GameIcon name="clock" /> Melhoria agendada
    </span>
   </button>
  </div>

  <FocusDialog v-if="facilityDetail" :title="facilityDetail.name" :busy="busy" :error="error" @close="closeFacility">
   <div class="facility-details">
    <p v-if="notice" role="status">{{notice}}</p>
    <dl class="facility-facts">
     <div><dt>Nível atual</dt><dd>{{facilityDetail.level}} / 5</dd></div>
     <div v-if="facilityDetail.type==='intelligence'"><dt>Renovação dos contatos</dt><dd>{{dateAt(data.intelligenceContacts.renewalTurn)}}</dd></div>
     <div>
      <dt>{{facilityDetail.type==='depot'?'Armazenagem comprometida':facilities[facilityDetail.type].capacityLabel}}</dt>
      <dd>{{facilityDetail.type==='depot'?`${data.load} / ${data.loadCapacity}`:facilityDetail.type==='intelligence'?`${data.intelligenceContacts.remaining} / ${data.intelligenceContacts.total}`:facilityDetail.capacity}}</dd>
     </div>
     <div v-if="facilityDetail.type==='depot'">
      <dt>Vagas de serviço ocupadas</dt><dd>{{preparationUsage.occupied}} / {{data.preparationCapacity}}</dd>
     </div>
     <div><dt>Manutenção semanal</dt><dd>{{money(facilityDetail.weeklyCostCents)}}</dd></div>
    </dl>
    <template v-if="facilityDetail.type==='depot'">
     <p>A carga inclui kits em entrega, em serviço e em missão. As vagas de serviço incluem reparos e reposições agendados ou em andamento.</p>
     <p v-if="preparationFull&&preparationUsage.nextCompletion!==null">Próxima liberação prevista para {{dateAt(preparationUsage.nextCompletion)}}.</p>
     <div class="facility-actions" :style="{gridTemplateColumns:depotActionColumns}">
      <button
       v-for="action in depotActions" :key="action.section"
       type="button" class="secondary" :disabled="locked" @click="mode=action.section"
      >{{action.label}}</button>
     </div>
    </template>

    <section v-if="facilityDetail.targetLevel||facilityDetail.upgradeCostCents!==null" class="facility-upgrade">
     <h3>{{facilityDetail.targetLevel?'Melhoria em andamento':'Melhoria para o nível '+(facilityDetail.level+1)}}</h3>
     <section v-if="facilityDetail.targetLevel" class="facility-progress">
      <p>Conclusão do nível {{facilityDetail.targetLevel}} prevista para {{dateAt(facilityDetail.dueTurn)}}.</p>
      <label>
       Tempo restante <strong>{{formatCampaignDuration(remainingUpgradeTurns(facilityDetail))}}</strong>
       <progress :value="upgradeProgress(facilityDetail)" :max="facilityDetail.upgradeTurns??1" />
      </label>
     </section>
     <dl class="facility-facts">
      <div v-if="!facilityDetail.targetLevel&&facilityDetail.upgradeCostCents!==null">
       <dt>Custo ao confirmar o avanço</dt><dd>{{money(facilityDetail.upgradeCostCents)}}</dd>
      </div>
      <div v-if="!facilityDetail.targetLevel&&facilityDetail.upgradeTurns!==null">
       <dt>Prazo</dt><dd>{{formatCampaignDuration(facilityDetail.upgradeTurns)}}</dd>
      </div>
      <div><dt>{{facilities[facilityDetail.type].capacityLabel}}</dt><dd>{{facilityDetail.capacity}} → {{facilityDetail.nextCapacity}}</dd></div>
      <div v-if="facilityDetail.type==='depot'">
       <dt>Vagas de serviço</dt><dd>{{data.preparationCapacity}} → {{data.nextPreparationCapacity}}</dd>
      </div>
      <div v-if="facilityDetail.nextWeeklyCostCents!==null">
       <dt>Manutenção semanal após a melhoria</dt><dd>{{money(facilityDetail.nextWeeklyCostCents)}}</dd>
      </div>
     </dl>
     <button
      v-if="!facilityDetail.targetLevel&&!facilityOrders(facilityDetail.type).length&&facilityDetail.upgradeCostCents!==null"
      type="button" class="primary"
      :disabled="locked||!!data.headquarters.arrearsCents||game.cashCents<facilityDetail.upgradeCostCents"
      @click="scheduleUpgrade(facilityDetail.type)"
     >Agendar melhoria</button>
     <PendingOrderNotice :orders="facilityOrders(facilityDetail.type)" :disabled="locked" @remove="cancelQueued" />
    </section>
    <p v-else>Nível máximo atingido.</p>
    <button v-if="pending&&!busy" type="button" class="primary" @click="run">Repetir comando</button>
   </div>
  </FocusDialog>
 </template>
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
.headquarters-maintenance{
 display:flex;
 align-items:baseline;
 flex-wrap:wrap;
 gap:var(--space-1) var(--space-3);
 width:fit-content;
 margin:0 0 var(--space-4);
 padding:var(--space-2) var(--space-3);
 border:1px solid var(--command-line);
 border-radius:8px;
 background:var(--command-surface);
 font-size:var(--text-caption);
 color:#adbdc4;
}
.headquarters-maintenance dd{margin:0;color:#edf2f3;font-weight:650;font-variant-numeric:tabular-nums}
.facility-map {
 display:grid;
 grid-template-columns:repeat(3,minmax(0,1fr));
 grid-template-areas:
  "administration operations depot"
  "training operations infirmary";
 gap:var(--space-4);
 padding:var(--space-4);
 border:1px solid var(--command-line);
 border-radius:16px;
 background-color:#0d181d;
 background-image:
  linear-gradient(90deg,#263c45 0 1px,transparent 1px),
  linear-gradient(#263c45 0 1px,transparent 1px);
 background-size:24px 24px;
}
.facility-room {
 display:flex;
 flex-direction:column;
 align-items:stretch;
 gap:var(--space-2);
 min-width:0;
 padding:var(--space-3);
 border:1px solid #47616b;
 border-radius:8px;
 background:#15262d;
 color:#e6edf0;
 text-align:left;
 line-height:1.35;
}
.facility-room-operations{
 justify-content:center;
 border-color:#6e856b;
 background:#1a2b25;
}
.facility-room:hover{border-color:var(--command-accent);background:#263b36}
.facility-room-top {
 display:flex;
 align-items:center;
 gap:var(--space-2);
 color:#c4d2d8;
 font-size:var(--text-caption);
}
.facility-room-top .game-icon{color:var(--command-accent)}
.facility-room-arrow{margin-inline-start:auto;color:var(--command-accent);font-size:1rem}
.facility-room-name{font-size:var(--text-subtitle);overflow-wrap:anywhere}
.facility-room-metric{
 display:flex;
 justify-content:space-between;
 gap:var(--space-2);
 color:#bccbd2;
 font-size:var(--text-caption);
 font-weight:400;
}
.facility-room-metric strong{color:#edf2f3;white-space:nowrap;font-variant-numeric:tabular-nums}
.facility-room-status{
 display:flex;
 align-items:center;
 gap:var(--space-1);
 color:var(--command-warning);
 font-size:var(--text-caption);
}
.facility-room-status .game-icon{width:15px;height:15px}
.facility-details,.facility-upgrade{display:grid;gap:var(--space-3)}
.facility-details p,.facility-upgrade h3{margin:0}
.facility-upgrade{border-top:1px solid var(--command-line);padding-top:var(--space-3)}
.facility-facts {
 display:grid;
 grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr));
 gap:var(--space-2);
 margin:0;
}
.facility-facts div{padding:var(--space-2) var(--space-3);background:var(--command-raised);border-radius:8px}
.facility-facts dt{font-size:var(--text-caption);color:#bccbd2}
.facility-facts dd{margin:var(--space-1) 0 0;font-weight:650;font-variant-numeric:tabular-nums}
.facility-actions{display:grid;gap:var(--space-2)}
.facility-actions>button{min-width:0;overflow-wrap:anywhere}
.facility-details>button,.facility-upgrade>button{width:100%}
.facility-upgrade :deep(.scheduled-order){display:grid;grid-template-columns:minmax(0,1fr)}
@media(max-width:840px){
 .facility-map{
  grid-template-columns:repeat(2,minmax(0,1fr));
  grid-template-areas:"administration operations" "depot depot" "training infirmary";
  gap:var(--space-2);
  padding:var(--space-2);
 }
}
@media(max-width:400px){
 .facility-room-metric{flex-wrap:wrap}
}
.kit-toolbar{display:flex;gap:var(--space-2);align-items:end}
.kit-toolbar .personnel-label{min-width:0;flex:1;margin-bottom:var(--space-2)}
.kit-toolbar .kit-quantity{flex:0 0 96px}
.kit-toolbar .kit-quantity input{margin-top:0}
.kit-capacity{margin-bottom:var(--space-2);font-size:var(--text-caption)}
.depot-details{margin:0 0 var(--space-2)}
.grouped-kits [data-action-card]>.primary{margin-top:var(--space-2)}
@media(min-width:641px){.combined-kit-service{flex:0 0 100%;width:100%}}
</style>
