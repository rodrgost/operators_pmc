import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
for(const failAt of ['write','refresh'] as const){
 it(`UI operações: retry após perda em ${failAt} mantém comando mesmo ao reabrir o painel`,async()=>{
  const source=readFileSync('apps/web/components/OperationsPanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
  const store:Record<string,any>={},actions=new Map<string,any>(),posted:any[]=[];let fail=true,ids=0;
  const transport=async(_path:string,options:any={})=>{
   if(options.method){posted.push(options.body);actions.set(options.body.requestId,options.body);if(failAt==='write'&&fail){fail=false;throw Error('response lost')}return {};}
   if(failAt==='refresh'&&fail&&actions.size){fail=false;throw Error('refresh lost')}
   return {operators:[],candidates:[],squads:[],contracts:[],missions:[],decisions:[],stateVersion:actions.size};
  };
  function mount(){
   const context:any={useNavigationNews:()=>({sync:()=>{},markRead:()=>{},status:()=>''}),useActionFeedback:()=>({feedbackTarget:{value:''},captureAction:()=>{}}),defineProps:()=>({game:{id:'g',stateVersion:0}}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(input:any)=>typeof input==='function'?{get value(){return input()}}:{get value(){return input.get()},set value(v){input.set(v)}},useState:(key:string,init:any)=>store[key]??(store[key]={value:init()}),watch:()=>{},onMounted:()=>{},crypto:{randomUUID:()=>`action-${++ids}`},$fetch:transport};
   runInNewContext(ts.transpileModule(source+';globalThis.harness={run,refresh,pending};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,context);
   return context.harness;
  }
  let h=mount();await h.refresh();await h.run('/contracts/contract/accept',{});expect(h.pending.value).not.toBeNull();
  h=mount();await h.refresh();await h.run('/contracts/contract/accept',{});
  expect(posted).toHaveLength(2);expect(posted[1]).toEqual(posted[0]);expect(actions.size).toBe(1);expect(h.pending.value).toBeNull();
 });
}

it('UI contratos: aceitos e aceites agendados precedem ofertas, com próximos prazos e sem alterar a origem',()=>{
 const source=readFileSync('apps/web/components/OperationsPanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
 const ctx:any={useNavigationNews:()=>({markRead:()=>{}}),useActionFeedback:()=>({feedbackTarget:{value:''},captureAction:()=>{}}),defineProps:()=>({game:{id:'g'},mode:'contracts'}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(input:any)=>typeof input==='function'?{get value(){return input()}}:{get value(){return input.get()},set value(v){input.set(v)}},useState:(_key:string,init:any)=>({value:init()}),watch:()=>{},onMounted:()=>{}};
 runInNewContext(ts.transpileModule(source+';globalThis.h={data,contracts};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx);
 const h=ctx.h;const rows=[{id:'late',status:'available',expiresTurn:20},{id:'soon',status:'available',expiresTurn:3},{id:'queued',status:'available',expiresTurn:10},{id:'accepted',status:'accepted',expiresTurn:12}];
 h.data.value={contracts:rows,pendingOrders:[{kind:'accept',target:'queued'}]};
 expect(h.contracts.value.map((c:any)=>c.id)).toEqual(['accepted','queued','soon','late']);expect(rows.map(c=>c.id)).toEqual(['late','soon','queued','accepted']);
});
