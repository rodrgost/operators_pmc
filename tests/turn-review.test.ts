import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {turnDuration,turnReview} from '../apps/web/utils/turnReview.ts'
function fixture(overrides:any={}){
 const props:any={game:{id:'g',currentTurn:0,stateVersion:1},command:{pendingOrders:[],agenda:[],advanceForecasts:[]},turns:1,busy:false,locked:false,pending:false,result:null,...overrides}
 const events:any[]=[],watchers:any[]=[]
 const ctx:any={turnReview,nextTurnCount:()=>1,defineProps:()=>props,defineEmits:()=> (...args:any[])=>events.push(args),ref:(value:any)=>({value}),computed:(fn:any)=>({get value(){return fn()}}),watch:(...args:any[])=>watchers.push(args),nextTick:async()=>{},onMounted:()=>{},onBeforeUnmount:()=>{}}
 const source=readFileSync('apps/web/components/TurnDock.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
 runInNewContext(ts.transpileModule(source+';globalThis.h={requestAdvance,confirmAdvance,reviewOpen};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx)
 return {h:ctx.h,props,events,watchers}
}
it('tempo: duração e rótulo distinguem avanço de confirmação de ordens',()=>{
 expect(turnDuration(1)).toBe('6h');expect(turnDuration(4)).toBe('1 dia');expect(turnDuration(8)).toBe('2 dias');expect(turnDuration(28)).toBe('1 semana')
 expect(turnReview(0,1,{pendingOrders:[{id:'a'}]}).label).toBe('Confirmar 1 ordem · +6h')
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
