<script setup lang="ts">
const props=defineProps<{game:any}>()
const emit=defineEmits(['changed','processing'])
const data=ref<any>({operators:[],candidates:[],squads:[],familiarity:[]}),busy=ref(false),error=ref(''),notice=ref(''),section=ref('roster'),weeks=ref(4),confirmation=ref<any>(null),selected=ref<any>(null),history=ref<any[]>([])
const pendingStore=useState<Record<string,any>>('personnel-commands',()=>({}))
const pending=computed({get:()=>pendingStore.value[props.game.id]??null,set:(value:any)=>{pendingStore.value={...pendingStore.value,[props.game.id]:value}}})
const editing=ref(false),editorId=ref(''),squadName=ref(''),squadSpec=ref('general'),members=ref<string[]>([]),leader=ref(''),deputy=ref(''),posture=ref('balanced'),priority=ref('team_safety'),risk=ref('medium'),withdrawal=ref('normal')
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n/100)
const labels:any={combat:'Combate',stealth:'Furtividade',technical:'Técnica',perception:'Percepção',endurance:'Resistência',leadership:'Liderança'}
const traits:any={disciplined:'disciplinado',cautious:'cauteloso',impulsive:'impulsivo',resilient:'resiliente',loyal:'leal',ambitious:'ambicioso'}
const specs:any={general:'Geral',recon:'Reconhecimento',assault:'Assalto',medic:'Médico',technical:'Técnico',leader:'Liderança'}
const states:any={available:'Disponível',training:'Em treinamento',rest:'Descansando',recovery:'Em recuperação',mission:'Em missão',contract_pending:'Renovação pendente',recovery_needed:'Precisa de recuperação',exhausted:'Exausto'}
const base=()=>'/api/v1/games/'+props.game.id
const locked=computed(()=>busy.value||!!pending.value)
const available=computed(()=>data.value.operators.filter((o:any)=>o.employment))
const operatorName=(id:string)=>data.value.operators.find((o:any)=>o.id===id)?.name||'Não designado'
async function refresh(){try{data.value=await $fetch(base()+'/personnel');return true}catch(e:any){error.value=e.data?.message||'Não foi possível carregar os operadores.';return false}}
async function details(op:any){selected.value=op;history.value=[];try{history.value=await $fetch<any[]>(base()+'/operators/'+op.id+'/history')}catch{error.value='Não foi possível carregar o histórico.'}}
async function run(path:string,body:any,method='POST'){
 if(busy.value)return
 const command=pending.value||{path,body:{...body,requestId:crypto.randomUUID(),expectedVersion:data.value.stateVersion},method}
 pending.value=command;busy.value=true;emit('processing',true);error.value='';let done=false
 try{
  await $fetch(base()+command.path,{method:command.method as any,body:command.body})
  if(!await refresh())return;pending.value=null;confirmation.value=null;editing.value=false;selected.value=null;notice.value='Comando confirmado e salvo.';done=true
 }catch(e:any){
  if(e.status>=400&&e.status<500){pending.value=null;await refresh()}
  error.value=e.data?.message||'Falha de conexão. Repetir usará o mesmo comando, sem duplicar efeitos.'
 }finally{busy.value=false;emit('processing',!!pending.value)}
 if(done)emit('changed')
}
function edit(s?:any){editorId.value=s?.id||'';squadName.value=s?.name||'';squadSpec.value=s?.specialization||'general';members.value=[...(s?.memberIds||[])];leader.value=s?.leaderId||'';deputy.value=s?.deputyId||'';posture.value=s?.directives.posture||'balanced';priority.value=s?.directives.priority||'team_safety';risk.value=s?.directives.riskTolerance||'medium';withdrawal.value=s?.directives.withdrawalPolicy||'normal';editing.value=true}
function save(){return run('/squads'+(editorId.value?'/'+editorId.value:''),{name:squadName.value,specialization:squadSpec.value,memberIds:members.value,leaderId:members.value.includes(leader.value)?leader.value:null,deputyId:members.value.includes(deputy.value)?deputy.value:null,directives:{posture:posture.value,priority:priority.value,riskTolerance:risk.value,withdrawalPolicy:withdrawal.value}},editorId.value?'PATCH':'POST')}
watch(()=>[props.game.id,props.game.stateVersion],async()=>{confirmation.value=null;selected.value=null;await refresh()})
onMounted(async()=>{emit('processing',!!pending.value);await refresh()})
</script>
<template>
<div class="personnel">
 <div v-if="error" class="error" role="alert">{{error}}</div><p v-if="notice" role="status" class="personnel-notice">{{notice}}</p>
 <div v-if="pending&&!busy" class="panel"><p>Há um comando aguardando confirmação. Repetir consulta a mesma solicitação.</p><button class="primary" @click="run(pending.path,pending.body,pending.method)">Repetir comando</button></div>
 <div class="personnel-tabs" aria-label="Áreas de pessoal"><button v-for="s in [['roster','Operadores'],['recruitment','Recrutamento'],['squads','Equipes']]" :key="s[0]" :class="{active:section===s[0]}" @click="section=s[0]">{{s[1]}}</button></div>
 <div class="personnel-summary"><span>{{data.employed||0}} / {{data.capacity||12}} vínculos ativos</span><span>{{money(data.weeklySalaryCents||0)}} / semana</span><span v-if="data.arrearsCents" class="debit">Em atraso: {{money(data.arrearsCents)}}</span></div>
 <template v-if="section==='recruitment'">
  <div class="section-intro"><h2>Mercado de operadores</h2><p>Ofertas válidas até o turno {{data.nextMarketTurn}}. Bônus de assinatura pago agora; salários a cada 28 turnos do vínculo.</p></div>
  <label class="personnel-label">Duração do vínculo<select v-model.number="weeks" :disabled="locked"><option :value="4">4 semanas</option><option :value="8">8 semanas</option><option :value="12">12 semanas</option></select></label>
  <section v-if="confirmation" class="panel hire-confirm"><h3>Contratar {{confirmation.candidate.name}}?</h3><p>Agora: {{money(confirmation.candidate.signingBonusCents)}} de bônus. Salário: {{money(confirmation.candidate.salaryCents)}} por semana durante {{confirmation.weeks}} semanas. Compromisso total: {{money(confirmation.candidate.signingBonusCents+confirmation.candidate.salaryCents*confirmation.weeks)}}.</p><p>Saldo após assinatura: {{money(game.cashCents-confirmation.candidate.signingBonusCents)}}.</p><div class="personnel-actions"><button class="primary" :disabled="locked" @click="run('/recruitment/hire',{candidateId:confirmation.candidate.id,weeks:confirmation.weeks})">Confirmar contratação</button><button class="secondary" :disabled="locked" @click="confirmation=null">Cancelar</button></div></section>
  <p v-if="!data.candidates.length" class="empty">Nenhuma oferta disponível. O mercado renova no próximo fechamento semanal.</p>
  <div class="personnel-grid"><article v-for="c in data.candidates" :key="c.id" class="panel operator-card"><span class="eyebrow">{{specs[c.specialization]}} · NÍVEL {{c.level}}</span><h3>{{c.name}}</h3><dl class="personnel-attributes"><div v-for="(label,key) in labels" :key="key"><dt>{{label}}</dt><dd>{{c.attributes[key]}}</dd></div></dl><p>Salário {{money(c.salaryCents)}} / semana<br>Bônus de assinatura {{money(c.signingBonusCents)}}</p><button class="primary" :disabled="locked||game.cashCents<c.signingBonusCents||data.employed>=data.capacity" @click="confirmation={candidate:c,weeks}">Revisar contratação</button><small v-if="game.cashCents<c.signingBonusCents">Caixa insuficiente para assinatura.</small><small v-else-if="data.employed>=data.capacity">Capacidade administrativa atingida.</small></article></div>
 </template>
 <template v-else-if="section==='roster'">
  <div class="section-intro"><h2>Quadro da companhia</h2><p>Disponibilidade considera vínculo, saúde, fadiga e agenda. Equipe permanente não reserva operador para missão.</p></div>
  <p v-if="!data.operators.length" class="empty">Nenhum operador contratado. Abra Recrutamento para começar.</p>
  <section v-if="selected" class="panel operator-details"><button class="secondary" @click="selected=null">Fechar ficha</button><h2>{{selected.name}}</h2><p>{{specs[selected.specialization]}} · Nível {{selected.level}} · XP {{selected.xp}}</p><dl class="personnel-attributes"><div v-for="(label,key) in labels" :key="key"><dt>{{label}}</dt><dd>{{selected.attributes[key]}}</dd></div></dl><p>Traços: {{selected.traits.map((t:string)=>traits[t]||t).join(', ')}}</p><p>Saúde {{selected.health}} · Fadiga {{selected.fatigue}} · Moral {{selected.morale}} · Lealdade {{selected.loyalty}}</p><h3>Histórico</h3><p v-if="!history.length">Nenhum registro.</p><div v-for="(h,i) in history" :key="i" class="brief-line"><span>T{{h.turn}}</span><strong>{{h.title}}</strong></div></section>
  <div class="personnel-grid"><article v-for="o in data.operators" :key="o.id" class="panel operator-card"><span class="eyebrow">{{specs[o.specialization]}} · NÍVEL {{o.level}}</span><h3>{{o.name}}</h3><span class="tag">{{states[o.availability]}}</span><p>Saúde {{o.health}} · Fadiga {{o.fatigue}}<br>Moral {{o.morale}} · Lealdade {{o.loyalty}}</p><p v-if="o.employment">{{money(o.employment.salary_cents)}} / semana<br>Próximo salário: T{{o.employment.next_pay_turn}}<br>Vínculo até T{{o.employment.end_turn}}</p><p v-else>Vínculo encerrado. Renove para voltar às atividades.</p><p v-if="o.arrearsCents" class="debit">Dívida salarial {{money(o.arrearsCents)}}</p><p v-if="o.reservation">Atividade até T{{o.reservation.end_turn}}</p>
   <button class="secondary" @click="details(o)">Abrir ficha e histórico</button>
   <label class="personnel-label">Renovação<select v-model.number="weeks" :disabled="locked"><option :value="4">+ 4 semanas</option><option :value="8">+ 8 semanas</option><option :value="12">+ 12 semanas</option></select></label><button class="secondary" :disabled="locked||!!o.arrearsCents" @click="run('/operators/'+o.id+'/renew-contract',{weeks})">Renovar vínculo · sem bônus</button>
   <div v-if="o.employment" class="personnel-actions"><button class="secondary" :disabled="locked||!!o.reservation" @click="run('/operators/'+o.id+'/activities',{type:'rest'})">Descansar · 4 turnos</button><button class="secondary" :disabled="locked||!!o.reservation" @click="run('/operators/'+o.id+'/activities',{type:'recovery'})">Recuperar · 4 turnos</button></div>
  </article></div>
 </template>
 <template v-else>
  <div class="section-intro"><h2>Equipes permanentes</h2><p>De 2 a 6 membros para prontidão. Rascunhos podem ter menos membros. O substituto assume quando o líder está inapto.</p><button class="primary" :disabled="locked" @click="edit()">Criar equipe</button></div>
  <form v-if="editing" class="panel squad-form" @submit.prevent="save"><h3>{{editorId?'Editar equipe':'Nova equipe'}}</h3><label>Nome<input v-model="squadName" required minlength="2" maxlength="60" :disabled="locked"></label><label class="personnel-label">Especialização<select v-model="squadSpec" :disabled="locked"><option v-for="(label,key) in specs" :key="key" :value="key">{{label}}</option></select></label>
   <fieldset :disabled="locked"><legend>Membros (até 6)</legend><label v-for="o in available" :key="o.id" class="member-check"><input v-model="members" type="checkbox" :value="o.id" :disabled="(!members.includes(o.id)&&members.length>=6)||data.squads.some((s:any)=>s.id!==editorId&&s.memberIds.includes(o.id))">{{o.name}} · {{states[o.availability]}}</label><p v-if="!available.length">Contrate operadores para formar uma equipe.</p></fieldset>
   <label class="personnel-label">Líder titular<select v-model="leader" :disabled="locked"><option value="">Não designado</option><option v-for="id in members" :key="id" :value="id">{{operatorName(id)}}</option></select></label><label class="personnel-label">Substituto<select v-model="deputy" :disabled="locked"><option value="">Não designado</option><option v-for="id in members.filter(id=>id!==leader)" :key="id" :value="id">{{operatorName(id)}}</option></select></label>
   <label class="personnel-label">Postura<select v-model="posture" :disabled="locked"><option value="cautious">Cautelosa</option><option value="balanced">Equilibrada</option><option value="aggressive">Agressiva</option></select></label><label class="personnel-label">Prioridade<select v-model="priority" :disabled="locked"><option value="objective">Objetivo</option><option value="team_safety">Segurança da equipe</option><option value="deadline">Prazo</option></select></label><label class="personnel-label">Tolerância a risco<select v-model="risk" :disabled="locked"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label class="personnel-label">Política de retirada<select v-model="withdrawal" :disabled="locked"><option value="conservative">Conservadora</option><option value="normal">Normal</option><option value="persistent">Persistente</option></select></label><p>Diretrizes ficam salvas para o futuro motor de missões. Treino conjunto dura 4 turnos, gera fadiga e familiaridade.</p><div class="personnel-actions"><button class="primary" :disabled="locked">Salvar equipe</button><button type="button" class="secondary" :disabled="locked" @click="editing=false">Cancelar</button></div>
  </form>
  <p v-if="!data.squads.length" class="empty">Nenhuma equipe criada.</p><div class="personnel-grid"><article v-for="s in data.squads" :key="s.id" class="panel operator-card"><span class="eyebrow">{{specs[s.specialization]}}</span><h3>{{s.name}}</h3><span class="tag">{{s.ready?'Pronta':'Formação pendente ou indisponível'}}</span><p>{{s.memberIds.length}} membros · Familiaridade {{s.familiarity}} / 100<br>Líder: {{operatorName(s.leaderId)}}<br>Substituto: {{operatorName(s.deputyId)}}<br>Líder apto: {{operatorName(s.effectiveLeaderId)}}</p><ul><li v-for="id in s.memberIds" :key="id">{{operatorName(id)}}</li></ul><div class="personnel-actions"><button class="secondary" :disabled="locked" @click="edit(s)">Editar formação</button><button class="primary" :disabled="locked||!s.ready" @click="run('/squads/'+s.id+'/training',{})">Treinar juntos · 4 turnos</button></div></article></div>
 </template>
</div>
</template>
