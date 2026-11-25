import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {turnDuration,turnReview} from '../apps/web/utils/turnReview.ts'
import {nextAdvance} from '../apps/web/utils/turnSelection.ts'
import * as campaignTime from '../packages/rules/campaign-time.ts'
import {campaignAgendaWeek,campaignWeek,formatCampaignEvent,formatCampaignReport,formatCampaignTurn} from '../apps/web/utils/campaignTime.ts'
function fixture(overrides:any={},storage=new Map<string,string>()){
 const props:any={game:{id:'g',date:'2030-01-31T18:00:00Z',currentTurn:0,stateVersion:1},command:{pendingOrders:[],agenda:[],advanceForecasts:[]},turns:1,busy:false,locked:false,pending:false,result:null,...overrides}
 const events:any[]=[],watchers:any[]=[],mounts:(()=>void)[]=[]
 const localStorage={getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}
 const ctx:any={...campaignTime,formatCampaignTurn,rules:{hoursPerTurn:6,turnsPerWeek:28},turnReview,nextAdvance,defineProps:()=>props,defineModel:()=>({value:false}),defineEmits:()=> (...args:any[])=>events.push(args),ref:(value:any)=>({value}),computed:(fn:any)=>({get value(){return fn()}}),watch:(...args:any[])=>watchers.push(args),nextTick:async()=>{},localStorage,ResizeObserver:class {},onMounted:(fn:()=>void)=>mounts.push(fn),onBeforeUnmount:()=>{}}
 const source=readFileSync('apps/web/components/TurnDock.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
 runInNewContext(ts.transpileModule(source+';globalThis.h={requestAdvance,confirmAdvance,reviewOpen,reviewFromAgenda,agenda,agendaOpen,agendaDays,deadlines,openItem,eventTiming,dateAt,turnLabel,advanceReason,setShowFinancialEvents,suggestion,deliveredAnalyses};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx)
 mounts.forEach(mount=>mount())
 return {h:ctx.h,props,events,watchers}
}
it('tempo: duração e rótulo distinguem avanço de confirmação de ordens',()=>{
 expect(turnDuration(1)).toBe('6h');expect(turnDuration(4)).toBe('1 dia');expect(turnDuration(5)).toBe('1 dia e 6h');expect(turnDuration(8)).toBe('2 dias');expect(turnDuration(28)).toBe('1 semana')
 expect(turnReview(0,1,{pendingOrders:[{id:'a'}]}).label).toBe('Confirmar 1 ordem')
})
it('relógio usa HH:MM e converte prévias gravadas sem alterar durações',()=>{
 expect(campaignTime.campaignHour(new Date('2030-01-01T06:04:00Z'))).toBe('06:04')
 expect(campaignTime.campaignHour(new Date('2030-01-01T00:00:00Z'))).toBe('00:00')
 expect(campaignTime.normalizeSavedClock('Entrega ter, 1 jan · 6h (6h) · prazo de 1 dia e 12h.')).toBe('Entrega ter, 1 jan · 06:00 (6h) · prazo de 1 dia e 12h.')
 expect(campaignTime.normalizeSavedClock('Entrega ter, 1 jan 2030 · 18h04.')).toBe('Entrega ter, 1 jan 2030 · 18:04.')
})
it('lê as análises entregues no resumo mesmo quando a resposta do avanço só traz o status',()=>{
 const f=fixture({result:{status:'completed',requestId:'a'},command:{latestAdvance:{requestId:'a',events:[{type:'intelligence_analysis_completed',count:2}]}}})
 expect(f.h.deliveredAnalyses.value).toBe(2)
})
it('filtra compromissos financeiros e restaura a preferência ao abrir outra campanha',()=>{
 const salary={id:'salary-a',dueTurn:2,tab:'finance',title:'Salários'}
 const mission={id:'mission-a',dueTurn:5,tab:'operations',title:'Retorno'}
 const command={agenda:[salary,mission]}
 const storage=new Map<string,string>()
 const first=fixture({command,turns:2},storage)
 expect(first.h.agenda.value).toEqual([mission])
 expect(first.h.suggestion.value.item).toEqual(salary)
 expect(first.h.turnLabel(2)).toBe('Até sex, 1 fev · 06:00')
 expect(first.h.advanceReason.value).toBe('')
 first.h.setShowFinancialEvents(true)
 expect(first.h.agenda.value).toEqual([salary,mission])
 const reopened=fixture({command,game:{...first.props.game,id:'g2'}},storage)
 expect(reopened.h.agenda.value).toEqual([salary,mission])
 reopened.h.setShowFinancialEvents(false)
 expect(fixture({command},storage).h.agendaDays.value.flatMap((day:any)=>day.items)).toEqual([mission])
})
it('agenda cruza o mês e reúne etapa, prazo de ação e compromisso financeiro',()=>{
 const salary={id:'salary-a',dueTurn:5,tab:'finance',title:'Salários'}
 const deadline={id:'mobilization-a',dueTurn:3,tab:'contracts',title:'Mobilizar contrato',requiresAction:true}
 const mission={id:'mission-a',dueTurn:2,tab:'operations',title:'Retorno'}
 const f=fixture({command:{agenda:[salary,deadline,mission]},turns:2})
 f.h.setShowFinancialEvents(true)
 expect(f.h.agendaDays.value).toEqual([
  {title:'Amanhã',items:[mission]},
  {title:'sáb, 2 fev',items:[salary]},
 ])
 expect(f.h.deadlines.value).toEqual([deadline])
 expect(f.h.eventTiming(mission)).toBe('Previsto para 06:00')
 expect(f.h.eventTiming(deadline)).toBe('Até 12:00')
 expect(f.h.advanceReason.value).toBe('Você terá 6h para agir · Mobilizar contrato')
 expect(f.h.dateAt(1)).toBe('sex, 1 fev · 00:00')
})
it('agenda fecha e encaminha a pendência específica, sem avançar o tempo',()=>{
 const item={id:'decision-mission-a-1',targetId:'decision-mission-a-1',tab:'operations',title:'Decidir · Escolta',requiresAction:true,dueTurn:4}
 const f=fixture({command:{agenda:[item]}})
 f.h.agendaOpen.value=true
 f.h.openItem(item)
 expect(f.h.agendaOpen.value).toBe(false)
 expect(f.events).toEqual([['open-item',item]])
})
it('revisar pela agenda exige confirmação mesmo para um período simples',()=>{
 const f=fixture()
 f.h.agendaOpen.value=true
 f.h.reviewFromAgenda()
 expect(f.h.agendaOpen.value).toBe(false)
 expect(f.h.reviewOpen.value).toBe(true)
 expect(f.events).toEqual([])
 f.h.confirmAdvance()
 expect(f.events).toEqual([['advance']])
})
it('mostra a data no seletor mesmo quando a sugestão coincide com a duração de um dia',()=>{
 const f=fixture({command:{agenda:[{dueTurn:4,title:'Entrega'}]},turns:4})
 expect(f.h.turnLabel(4)).toBe('Até sex, 1 fev · 18:00')
 expect(f.h.advanceReason.value).toBe('Próximo compromisso · Entrega')
 expect([0,27,28].map(campaignWeek)).toEqual([1,1,2])
})
it('a visão semanal reúne os compromissos visíveis de domingo a sábado e permite consultar a semana seguinte',()=>{
 const game={id:'g',currentTurn:8,date:'2030-01-05T12:00:00Z'}
 const salary={id:'salary-a',dueTurn:10,tab:'finance',title:'Salários'}
 const mission={id:'mission-a',dueTurn:9,tab:'operations',title:'Retorno'}
 const deadline={id:'mobilization-a',dueTurn:11,tab:'contracts',title:'Mobilização',requiresAction:true}
 const f=fixture({game,command:{agenda:[deadline,salary,mission]}})
 const current=campaignAgendaWeek(game,f.h.agenda.value,0)
 expect(current).toHaveLength(7)
 expect(current[0].date.toISOString()).toBe('2029-12-30T00:00:00.000Z')
 expect(current[6]).toMatchObject({isToday:true,items:[mission]})
 const next=()=>campaignAgendaWeek(game,f.h.agenda.value,1)
 expect(next()[0]).toMatchObject({date:new Date('2030-01-06T00:00:00.000Z'),isToday:false,items:[deadline]})
 f.h.setShowFinancialEvents(true)
 expect(next()[0].items).toEqual([salary,deadline])
 expect(next()[1].items).toEqual([])
 expect(f.events).toEqual([])
})
it('mantém a data de um prazo consistente no histórico e mostra a virada de ano',()=>{
 const game={date:'2030-12-31T18:00:00Z',currentTurn:12}
 const date=formatCampaignTurn(game,13)
 expect(date).toBe('qua, 1 jan 2031 · 00:00')
 expect(formatCampaignEvent(game,{type:'critical_decision',description:'Evacuação · escolha uma ação até T13.'})).toBe('Evacuação · escolha uma ação até '+date+'.')
 expect(formatCampaignReport('O andamento desta fase exigiu um turno adicional. Consulte as condições atuais da formação.')).toBe('O andamento desta fase exigiu mais 6h.')
})
it('tempo: um período simples avança; lote ou ordens exigem revisão',()=>{
 const single=fixture();single.h.requestAdvance();expect(single.events).toEqual([['advance']])
 for(const props of [{turns:4},{command:{pendingOrders:[{id:'o'}]}}]){const f=fixture(props);f.h.requestAdvance();expect(f.events).toHaveLength(0);expect(f.h.reviewOpen.value).toBe(true);f.h.confirmAdvance();f.h.confirmAdvance();expect(f.events).toEqual([['advance']])}
})
it('tempo: prazo de ação e saldo negativo também exigem revisão de um turno',()=>{
 const deadline=turnReview(3,1,{agenda:[{id:'d',dueTurn:4,requiresAction:true},{id:'later',dueTurn:5}]})
 expect(deadline.requiresReview).toBe(true);expect(deadline.milestones.map((i:any)=>i.id)).toEqual(['d'])
 expect(turnReview(3,1,{advanceForecasts:[{turns:1,cashAfterObligationsCents:-1}]}).requiresReview).toBe(true)
})
it('a revisão mostra a atividade antes do primeiro período, mesmo com conclusão fora do intervalo',()=>{
 const activity={id:'training',dueTurn:4,firstPeriodPending:true}
 const command={agenda:[activity]}
 const f=fixture({command});f.h.requestAdvance()
 expect(f.h.reviewOpen.value).toBe(true);expect(f.events).toHaveLength(0)
 expect(turnReview(0,1,command).startingActivities).toEqual([activity])
 f.h.confirmAdvance();expect(f.events).toEqual([['advance']])
})
it('tempo: recuperação consulta o mesmo avanço sem uma nova confirmação',()=>{
 const pending=fixture({pending:true,turns:28});pending.h.requestAdvance();expect(pending.events).toEqual([['advance']]);expect(pending.h.reviewOpen.value).toBe(false)
 const failed=fixture({result:{status:'failed'}});failed.h.requestAdvance();expect(failed.events).toEqual([['resume']])
})
it('tempo: bloqueios impedem confirmação e atualização da campanha fecha a revisão',()=>{
 for(const props of [{busy:true},{locked:true},{command:{planningError:'Plano inválido'}}]){const f=fixture(props);f.h.requestAdvance();expect(f.events).toHaveLength(0);expect(f.h.reviewOpen.value).toBe(false)}
 const f=fixture({turns:4});f.h.requestAdvance();f.props.game.stateVersion=2;f.watchers[1][1]();f.h.confirmAdvance();expect(f.events).toHaveLength(0)
})
