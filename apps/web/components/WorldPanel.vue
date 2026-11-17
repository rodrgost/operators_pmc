<script setup lang="ts">
const props=defineProps<{game:any}>(),emit=defineEmits(['open-contracts','changed','processing'])
const navigationNews=useNavigationNews()
const data=ref<any>(null),error=ref(''),loading=ref(false),details=ref<Record<string,any>>({}),older=ref<Record<string,any[]>>({}),offset=ref<Record<string,number>>({})
const context=useState<Record<string,string>>('world-region',()=>({})),selected=computed({get:()=>context.value[props.game.id]||'karsen',set:(v:string)=>context.value={...context.value,[props.game.id]:v}})
const section=ref('regions'),locationOpen=ref(false)
const focus=useState<Record<string,string>>('world-event',()=>({}))
const region=computed(()=>data.value?.regions.find((r:any)=>r.id===selected.value)),country=computed(()=>data.value?.countries.find((c:any)=>c.id===region.value?.countryId))
const visibleRegions=computed(()=>data.value?.regions.filter((r:any)=>r.countryId===country.value?.id)||[])
const types:any={government:'Governo',corporation:'Corporação',armed_faction:'Facção',civil:'Organização civil',rival_pmc:'PMC rival'},status:any={active:'Em andamento',completed:'Encerrado',resolved:'Resolvido'}
const base=()=>'/api/v1/games/'+props.game.id+'/world'
async function refresh(){loading.value=true;error.value='';try{data.value=await $fetch(base());older.value={};offset.value={};details.value={};if(focus.value[props.game.id]){await cause(focus.value[props.game.id]);focus.value={...focus.value,[props.game.id]:''}};markSectionRead()}catch(e:any){error.value=e.data?.message||'Não foi possível carregar o mundo.'}finally{loading.value=false}}
function markSectionRead(){for(const key of section.value==='regions'?['regions','news','intelligence']:[section.value])navigationNews.markRead(props.game.id,'world.'+key)}
async function history(regionId:string){try{const rows=await $fetch<any[]>(base()+'/regions/'+regionId+'/history?offset='+(offset.value[regionId]||0)+'&limit=20');older.value[regionId]=[...(older.value[regionId]||[]),...rows];offset.value[regionId]=(offset.value[regionId]||0)+rows.length}catch{error.value='Não foi possível carregar o histórico.'}}
async function cause(id:string,regionId=selected.value){section.value='regions';try{details.value[regionId]=await $fetch(base()+'/events/'+id)}catch{error.value='Não foi possível carregar a origem.'}}
function regionNews(regionId:string){return older.value[regionId]?.length?older.value[regionId]:data.value.history.filter((e:any)=>e.regionId===regionId)}
watch(()=>focus.value[props.game.id],async id=>{if(id&&data.value&&!loading.value){await cause(id);focus.value={...focus.value,[props.game.id]:''}}})
watch(selected,()=>{details.value={};older.value={};offset.value={}})
watch(()=>[props.game.id,props.game.stateVersion],refresh)
onMounted(refresh)

watch(section,()=>{if(data.value&&!loading.value)markSectionRead()})
</script>
<template><div class="world-panel">
 <div class="section-intro"><h2>Asterra em movimento</h2><p>O mundo muda ao avançar os turnos. Indicadores e presença são estimativas, com fonte, confiança e data.</p></div>
 <div v-if="error" class="error" role="alert">{{error}} <button class="secondary" @click="refresh">Tentar novamente</button></div><p v-if="loading" role="status">Carregando dossiês…</p>
 <template v-if="data"><SectionNav :game-id="game.id" scope="world" v-model="section" label="Seções do mundo" :items="[['regions','Países'],['rivals','PMCs rivais'],['organizations','Organizações']]" /><div v-show="section==='regions'" class="world-layout"><div class="world-location"><button type="button" class="secondary location-toggle" :aria-expanded="locationOpen" aria-controls="world-location-options" @click="locationOpen=!locationOpen"><span><small>PAÍS</small><strong>{{country?.name||'Selecionar país'}}</strong></span><span>{{locationOpen?'Fechar ▴':'Trocar ▾'}}</span></button><div v-show="locationOpen" id="world-location-options" class="country-list"><div v-for="c in data.countries" :key="c.id" class="country-group"><button type="button" class="country-option" :class="{selected:country?.id===c.id}" :aria-pressed="country?.id===c.id" @click="selected=c.id;locationOpen=false"><OrganizationEmblem :id="c.id" /><strong>{{c.name}}</strong><span class="selection-mark" aria-hidden="true">{{country?.id===c.id?'✓':''}}</span></button></div></div></div>
 <div class="world-dossiers"><section v-for="region in visibleRegions" :key="region.id" class="panel"><span class="eyebrow">DOSSIÊ DO PAÍS · {{country?.name}}</span><OrganizationEmblem v-if="country" :id="country.id" /><h2>{{region.name}}</h2><p>Controle político informado: {{region.controllerName}}</p><p>Atualizado no turno {{game.currentTurn}}</p>
 <IntelligencePanel compact :key="game.id+':'+region.id" :game="game" target-type="region" :target-id="region.id" @changed="emit('changed')" @processing="emit('processing',$event)" />
 <template v-if="section==='regions'"><h3>Presença estimada</h3><p v-for="p in region.presence" :key="p.organizationId"><OrganizationEmblem :id="p.organizationId" />{{p.name}} <strong>≈ {{p.estimatedShare}}%</strong><meter class="presence-meter" min="0" max="100" :value="p.estimatedShare" :aria-label="p.name+': influência estimada de '+p.estimatedShare+'%'"></meter></p><p>Presença representa influência local e pode diferir do controle político.</p>
 <div v-for="c in data.conflicts.filter((c:any)=>c.regionId===region.id)" :key="c.id" class="mission-report"><h3>Conflito · intensidade {{c.intensity.toLowerCase()}}</h3><p>Desde turno {{c.startedTurn}} · {{c.participants.map((p:any)=>p.name).join(' × ')}}</p><button class="secondary" @click="cause(c.causeId,region.id)">Consultar origem</button></div>
 <button class="primary" @click="emit('open-contracts',region.id)">Ver contratos de {{region.name}} →</button>
 </template><div class="region-section"><h3>Acontecimentos do país</h3><p v-if="!regionNews(region.id).length">Nenhuma notícia recente. Consulte o histórico para eventos anteriores.</p>
 <article v-for="e in regionNews(region.id)" :key="e.id" class="mission-report"><span class="eyebrow">turno {{e.createdTurn}} · {{status[e.status]||e.status}}</span><p>{{e.summary}}</p><div class="personnel-actions"><button v-if="e.originId" class="secondary" @click="cause(e.originId,region.id)">Consultar causa</button><button v-if="e.contractId" class="secondary" @click="emit('open-contracts',region.id)">Ver contratos relacionados</button></div></article>
 <button class="secondary" @click="history(region.id)">{{offset[region.id]?'Carregar mais notícias':'Consultar histórico do país'}}</button>
 <article v-if="details[region.id]" class="panel world-cause"><span class="eyebrow">ORIGEM · turno {{details[region.id].createdTurn}}</span><p>{{details[region.id].summary}}</p><button v-if="details[region.id].originId" class="secondary" @click="cause(details[region.id].originId,region.id)">Consultar causa anterior</button><button class="secondary" @click="delete details[region.id]">Fechar origem</button></article>
 </div></section></div></div>
 <template v-if="section==='rivals'"><section class="section-intro"><h2>PMCs rivais</h2><p>Rivais disputam ofertas disponíveis após quatro turnos de exposição. Contratos já aceitos pela companhia ficam protegidos.</p></section><div class="personnel-grid"><article v-for="r in data.rivals" :key="r.id" class="panel"><OrganizationEmblem :id="r.id" /><h3>{{r.name}}</h3><p>Reputação {{r.reputation}} / 100<br>{{r.activeJobs}} / {{r.capacity}} operações<br>{{r.completed}} concluídas · {{r.failed}} fracassadas<br>Condição financeira estimada: {{r.financialCondition}}</p></article></div>
 </template><template v-if="section==='organizations'"><section class="section-intro"><h2>Organizações e relações</h2></section><div class="personnel-grid"><article v-for="o in data.organizations" :key="o.id" class="panel"><span class="eyebrow">{{types[o.type]}}</span><OrganizationEmblem :id="o.id" /><h3>{{o.name}}</h3><p>Objetivo: {{o.goal}}<br>Relação com sua companhia: {{o.companyRelation}}</p><details><summary>Relações diplomáticas estimadas</summary><p v-for="r in o.relations" :key="r.organizationId">{{r.name}} · {{r.relationship}}</p></details></article></div>
 </template></template></div></template>
<style scoped>
.region-section{margin-top:24px;padding-top:20px;border-top:1px solid #333}.region-section summary{cursor:pointer;font-weight:600;min-height:44px}.region-section h3{margin-bottom:12px}
.presence-meter{display:block;width:100%;height:14px;accent-color:#c5d9ad;margin:6px 0 14px}
.world-dossiers{display:flex;flex-direction:column;gap:20px;min-width:0}
</style>
