import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
function fixture(){
 let status='available'
 const store:Record<string,any>={}
 const contract=()=>({id:'c',title:'Escolta',status})
 const staff={operators:[{id:'a',availability:'available'},{id:'b',availability:'available'}],squads:[{id:'s',memberIds:['a','b'],leaderId:'a',directives:{posture:'balanced',priority:'team_safety',riskTolerance:'medium',withdrawalPolicy:'normal'}}]}
 const context:any={useActionFeedback:()=>({feedbackTarget:{value:''},captureAction:()=>{}}),useNavigationNews:()=>({markRead:()=>{}}),defineProps:()=>({game:{id:'g'},mode:'contracts'}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(fn:any)=>typeof fn==='function'?{get value(){return fn()}}:{get value(){return fn.get()},set value(v){fn.set(v)}},useState:(key:string,init:any)=>store[key]??(store[key]={value:init()}),watch:()=>{},onMounted:()=>{},crypto:{randomUUID:()=> 'request'},$fetch:async(path:string,options:any={})=>{
  if(options.method){status='accepted';return {action:'accept'}}
  if(path.endsWith('/personnel'))return staff
  return {contracts:[contract()],missions:[],decisions:[],stateVersion:1}
 }}
 const source=readFileSync('apps/web/components/OperationsPanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
 runInNewContext(ts.transpileModule(source+';globalThis.h={refresh,plan,run,planBody,equipmentIds,selectedContract,missionContext,preparationStep};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,context)
 return {h:context.h,contract,setStatus:(value:string)=>status=value}
}
it('jornada: aceitar e atualizar a companhia preserva equipe, kits e etapa do plano',async()=>{
 const {h,contract}=fixture();await h.refresh();h.plan(contract());h.equipmentIds.value=['kit'];h.preparationStep.value='plan'
 const before=JSON.parse(JSON.stringify(h.planBody()));await h.run('/contracts/c/accept');await h.refresh()
 expect(JSON.parse(JSON.stringify(h.planBody()))).toEqual(before);expect(h.selectedContract.value.status).toBe('accepted');expect(h.preparationStep.value).toBe('plan');expect(h.missionContext.value.contractId).toBe('c')
})
it('jornada: contrato expirado encerra o rascunho e remove o atalho de retorno',async()=>{
 const {h,contract,setStatus}=fixture();await h.refresh();h.plan(contract());setStatus('expired');await h.refresh()
 expect(h.selectedContract.value).toBeNull();expect(h.missionContext.value).toBeNull()
})
it('relatórios: resposta tardia não substitui a missão selecionada',async()=>{
 const requests:any[]=[],source=readFileSync('apps/web/components/OperationsPanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
 const ctx:any={useNavigationNews:()=>({markRead:()=>{}}),useActionFeedback:()=>({feedbackTarget:{value:''},captureAction:()=>{}}),defineProps:()=>({game:{id:'g'},mode:'operations'}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(x:any)=>typeof x==='function'?{get value(){return x()}}:{get value(){return x.get()},set value(v){x.set(v)}},useState:(_k:string,init:any)=>({value:init()}),watch:()=>{},onMounted:()=>{},$fetch:()=>new Promise(resolve=>requests.push(resolve))}
 runInNewContext(ts.transpileModule(source+';globalThis.h={details,reports,departure,reportsLoading}',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx)
 const a=ctx.h.details({id:'a'}),b=ctx.h.details({id:'b'})
 requests[2]({intelligenceAtDeparture:'b'});requests[3]([{id:'b-report'}]);await b
 requests[0]({intelligenceAtDeparture:'a'});requests[1]([{id:'a-report'}]);await a
 expect(ctx.h.departure.value).toBe('b');expect(ctx.h.reports.value[0].id).toBe('b-report');expect(ctx.h.reportsLoading.value).toBe(false)
})
