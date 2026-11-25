<script setup lang="ts">
const props=defineProps<{game:any;active?:boolean;agendaRegion?:{id:string}|null}>(),emit=defineEmits(['open-contracts','changed','processing'])
const dateAt=(turn:number|null|undefined,includeYear=false)=>formatCampaignTurn(props.game,turn,includeYear)
const navigationNews=useNavigationNews()
const data=ref<any>(null),error=ref(''),loading=ref(false),details=ref<Record<string,any>>({}),older=ref<Record<string,any[]>>({}),offset=ref<Record<string,number>>({})
const context=useState<Record<string,string>>('world-region',()=>({})),selected=computed({get:()=>context.value[props.game.id]||'karsen',set:(v:string)=>context.value={...context.value,[props.game.id]:v}})
const section=ref('regions'),locationOpen=ref(false),intelligenceRegion=ref('')
watch(()=>props.agendaRegion,target=>{if(target){section.value='regions';selected.value=target.id;intelligenceRegion.value=target.id;locationOpen.value=false}},{immediate:true})
const focus=useState<Record<string,string>>('world-event',()=>({}))
const region=computed(()=>data.value?.regions.find((r:any)=>r.id===selected.value)),country=computed(()=>data.value?.countries.find((c:any)=>c.id===region.value?.countryId))
const visibleRegions=computed(()=>data.value?.regions.filter((r:any)=>r.countryId===country.value?.id)||[])
const conflictsByRegion=computed(()=>{
 const byRegion=new Map<string,any[]>()
 for(const conflict of data.value?.conflicts??[]){
  const list=byRegion.get(conflict.regionId)??[]
  list.push(conflict)
  byRegion.set(conflict.regionId,list)
 }
 return byRegion
})
const types:any={government:'Governo',corporation:'Corporação',armed_faction:'Facção',civil:'Organização civil',rival_pmc:'PMC rival'},status:any={active:'Em andamento',completed:'Encerrado',resolved:'Resolvido'}
const base=()=>'/api/v1/games/'+props.game.id+'/world'
async function refresh(){loading.value=true;error.value='';try{data.value=await $fetch(base());older.value={};offset.value={};details.value={};if(focus.value[props.game.id]){await cause(focus.value[props.game.id]);focus.value={...focus.value,[props.game.id]:''}};markSectionRead()}catch(e:any){error.value=e.data?.message||'Não foi possível carregar o mundo.'}finally{loading.value=false}}
function markSectionRead(){for(const key of section.value==='regions'?['regions','news','intelligence']:[section.value])navigationNews.markRead(props.game.id,'world.'+key)}
async function history(regionId:string){try{const rows=await $fetch<any[]>(base()+'/regions/'+regionId+'/history?offset='+(offset.value[regionId]||0)+'&limit=20');older.value[regionId]=[...(older.value[regionId]||[]),...rows];offset.value[regionId]=(offset.value[regionId]||0)+rows.length}catch{error.value='Não foi possível carregar o histórico.'}}
async function cause(id:string,regionId=selected.value){section.value='regions';try{details.value[regionId]=await $fetch(base()+'/events/'+id)}catch{error.value='Não foi possível carregar a origem.'}}
function regionNews(regionId:string){return older.value[regionId]?.length?older.value[regionId]:data.value.history.filter((e:any)=>e.regionId===regionId)}
function toggleIntelligence(regionId:string,event:Event){
 if((event.currentTarget as HTMLDetailsElement).open)intelligenceRegion.value=regionId
 else if(intelligenceRegion.value===regionId)intelligenceRegion.value=''
}
watch(()=>focus.value[props.game.id],async id=>{if(id&&data.value&&!loading.value){await cause(id);focus.value={...focus.value,[props.game.id]:''}}})
watch(selected,()=>{details.value={};older.value={};offset.value={}})
watch(()=>[props.game.id,props.game.stateVersion],refresh)
onMounted(refresh)

watch(section,()=>{if(data.value&&!loading.value)markSectionRead()})
</script>
<template><div class="world-panel">
 <div v-if="error" class="error" role="alert">{{error}} <button class="secondary action-block" @click="refresh">Tentar novamente</button></div>
 <p v-if="loading&&!data" role="status">Carregando países…</p>
 <template v-if="data">
  <SectionNav :game-id="game.id" scope="world" v-model="section" label="Seções do mundo" :items="[['regions','Países'],['rivals','PMCs rivais'],['organizations','Organizações']]" />
  <div v-show="section==='regions'" class="country-view">
   <div class="world-location">
    <div class="country-actions action-row">
     <button type="button" class="secondary location-toggle" :aria-expanded="locationOpen" aria-controls="world-location-options" @click="locationOpen=!locationOpen">
      <strong>{{country?.name||'Selecionar país'}}</strong><span aria-hidden="true">{{locationOpen?'▴':'▾'}}</span>
     </button>
     <button v-if="region" type="button" class="primary country-contracts" @click="emit('open-contracts',region.id)">Ver contratos</button>
    </div>
    <div v-show="locationOpen" id="world-location-options" class="country-list">
     <div v-for="c in data.countries" :key="c.id" class="country-group">
      <button type="button" class="country-option" :class="{selected:country?.id===c.id}" :aria-pressed="country?.id===c.id" @click="selected=c.id;locationOpen=false">
       <OrganizationEmblem :id="c.id" /><strong>{{c.name}}</strong><span class="selection-mark" aria-hidden="true">{{country?.id===c.id?'✓':''}}</span>
      </button>
     </div>
    </div>
   </div>
   <section v-for="dossier in visibleRegions" :key="dossier.id" class="panel country-dossier" :aria-label="'Dossiê de '+dossier.name">
    <div class="country-summary">
     <OrganizationEmblem v-if="country" :id="country.id" />
     <div>
      <h2>{{dossier.name}}</h2>
      <p>Controle · {{dossier.controllerName}}</p>
      <p v-for="conflict in (conflictsByRegion.get(dossier.id)??[]).filter(item=>item.status==='active')" :key="conflict.id">Conflito ativo · intensidade {{conflict.intensity.toLowerCase()}}</p>
     </div>
    </div>
    <details class="card-details country-details" :open="intelligenceRegion===dossier.id" @toggle="toggleIntelligence(dossier.id,$event)">
     <summary>Inteligência e estimativas</summary>
     <IntelligencePanel :id="'intelligence-region-'+dossier.id" compact :key="game.id+':'+dossier.id" :game="game" :active="active&&section==='regions'&&intelligenceRegion===dossier.id" target-type="region" :target-id="dossier.id" @changed="emit('changed')" @processing="emit('processing',$event)" />
    </details>
    <details class="card-details country-details">
     <summary>Presença e conflitos</summary>
     <div>
      <p>Presença estimada · influência local</p>
      <div v-for="presence in dossier.presence" :key="presence.organizationId">
       <p><OrganizationEmblem :id="presence.organizationId" />{{presence.name}} <strong>≈ {{presence.estimatedShare}}%</strong></p>
       <meter class="presence-meter" min="0" max="100" :value="presence.estimatedShare" :aria-label="presence.name+': influência estimada de '+presence.estimatedShare+'%'"></meter>
      </div>
     </div>
     <article v-for="conflict in conflictsByRegion.get(dossier.id)??[]" :key="conflict.id" class="mission-report">
      <h3>Conflito {{status[conflict.status]?.toLowerCase()||''}} · intensidade {{conflict.intensity.toLowerCase()}}</h3>
      <p>Desde {{dateAt(conflict.startedTurn,true)}} · {{conflict.participants.map((participant:any)=>participant.name).join(' × ')}}</p>
      <button type="button" class="secondary action-block" @click="cause(conflict.causeId,dossier.id)">Consultar origem</button>
     </article>
    </details>
    <details class="card-details country-details">
     <summary>Acontecimentos do país</summary>
     <p v-if="!regionNews(dossier.id).length">Nenhuma notícia recente.</p>
     <article v-for="event in regionNews(dossier.id)" :key="event.id" class="mission-report">
      <span class="report-meta">{{dateAt(event.createdTurn,true)}} · {{status[event.status]||event.status}}</span>
      <p>{{event.summary}}</p>
      <div class="personnel-actions">
       <button v-if="event.originId" type="button" class="secondary" @click="cause(event.originId,dossier.id)">Consultar causa</button>
       <button v-if="event.contractId" type="button" class="secondary" @click="emit('open-contracts',dossier.id)">Ver contratos relacionados</button>
      </div>
     </article>
     <button type="button" class="secondary action-block" @click="history(dossier.id)">{{offset[dossier.id]?'Carregar mais notícias':'Consultar histórico do país'}}</button>
    </details>
    <FocusDialog v-if="details[dossier.id]" title="Origem do acontecimento" :busy="loading" :error="error" @close="delete details[dossier.id]">
     <article class="world-cause">
      <p class="report-meta">{{dateAt(details[dossier.id].createdTurn,true)}}</p>
      <p>{{details[dossier.id].summary}}</p>
      <button v-if="details[dossier.id].originId" type="button" class="secondary action-block" @click="cause(details[dossier.id].originId,dossier.id)">Consultar causa anterior</button>
     </article>
    </FocusDialog>
   </section>
  </div>
 <template v-if="section==='rivals'"><section class="section-intro"><p>Rivais disputam ofertas disponíveis após 1 dia de exposição. Contratos já aceitos pela companhia ficam protegidos.</p></section><div class="personnel-grid"><article v-for="r in data.rivals" :key="r.id" class="panel"><OrganizationEmblem :id="r.id" /><h3>{{r.name}}</h3><p>Reputação {{r.reputation}} / 100<br>{{r.activeJobs}} / {{r.capacity}} operações<br>{{r.completed}} concluídas · {{r.failed}} fracassadas<br>Condição financeira estimada: {{r.financialCondition}}</p></article></div>
 </template><template v-if="section==='organizations'"><div class="personnel-grid"><article v-for="o in data.organizations" :key="o.id" class="panel"><span class="eyebrow">{{types[o.type]}}</span><OrganizationEmblem :id="o.id" /><h3>{{o.name}}</h3><p>Objetivo: {{o.goal}}<br>Relação com sua companhia: {{o.companyRelation}}</p><details><summary>Relações diplomáticas estimadas</summary><p v-for="r in o.relations" :key="r.organizationId">{{r.name}} · {{r.relationship}}</p></details></article></div>
 </template></template></div></template>
<style scoped>
.country-view{display:grid;gap:var(--space-3)}
.country-actions{align-items:stretch;gap:var(--space-2)}
@media(min-width:641px){.country-actions{display:grid;grid-template-columns:minmax(0,1fr) auto}}
.country-actions .location-toggle,.country-contracts{min-height:48px;margin:0;padding:8px 12px}
.country-view .country-list{margin:var(--space-2) 0 0}
.country-dossier{padding:var(--space-4)}
.country-summary{display:flex;align-items:flex-start;gap:var(--space-3);margin-bottom:var(--space-3)}
.country-summary h2{margin-bottom:var(--space-1)}
.country-summary p{font-size:var(--text-caption)}
.country-details>summary{font-weight:600}
.country-details .report-meta{font-size:var(--text-caption);color:var(--command-info)}
.world-cause>p+p,.world-cause>button{margin-top:var(--space-3)}
.presence-meter{display:block;width:100%;height:14px;accent-color:#c5d9ad;margin:6px 0 14px}
</style>
