import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
it('UI inteligência: destaca o relatório durante o primeiro turno em que o dossiê é visto',async()=>{
 const source=readFileSync('apps/web/components/IntelligencePanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'');
 const props={game:{id:'g',currentTurn:7},targetType:'region',targetId:'karsen',active:false};
 const report={id:'report-a',source:'analysis',collectedTurn:5};
 const data={topics:{security:{topic:'security',sources:[report]}},analyses:[],history:[]};
 const storage=new Map<string,string>();
 function mount(){
  const ctx:any={useActionFeedback:()=>({}),defineProps:()=>props,defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(read:any)=>({get value(){return read()}}),useState:(_key:string,init:any)=>({value:init()}),watch:()=>{},onMounted:()=>{},$fetch:async()=>data,localStorage:{getItem:(key:string)=>storage.get(key),setItem:(key:string,value:string)=>storage.set(key,value)}};
  runInNewContext(ts.transpileModule(source+';globalThis.h={refresh,markAnalysisResultsSeen,topics};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx);
  return ctx.h;
 }
 let h=mount();await h.refresh();h.markAnalysisResultsSeen();
 expect(storage.size).toBe(0);
 props.active=true;h.markAnalysisResultsSeen();
 expect(h.topics.value[0].newReport).toEqual(report);
 h=mount();await h.refresh();h.markAnalysisResultsSeen();
 expect(h.topics.value[0].newReport).toEqual(report);
 props.game.currentTurn++;h.markAnalysisResultsSeen();
 expect(h.topics.value[0].newReport).toBeNull();
});
for(const failAt of ['write','refresh'])it('UI inteligência: pedido com resposta perdida em '+failAt+' retém requestId ao reabrir',async()=>{
 const source=readFileSync('apps/web/components/IntelligencePanel.vue','utf8').replace(/^import .*$/gm,'').split('<script setup lang="ts">')[1].split('</script>')[0],store:Record<string,any>={},posted:any[]=[],actions=new Map<string,any>();let fail=true,ids=0;
 const transport=async(_url:string,options:any={})=>{if(options.method){posted.push(options.body);actions.set(options.body.requestId,options.body);if(failAt==='write'&&fail){fail=false;throw Error('response lost')}return {}}if(failAt==='refresh'&&fail&&actions.size){fail=false;throw Error('refresh lost')}return {stateVersion:actions.size,topics:{},history:[],pagination:{hasMore:false},analyses:[]}};
 function mount(){const ctx:any={useNavigationNews:()=>({sync:()=>{},markRead:()=>{},status:()=>''}),useActionFeedback:()=>({feedbackTarget:{value:''},captureAction:()=>{}}),defineProps:()=>({game:{id:'g',stateVersion:0},targetType:'region',targetId:'karsen'}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(x:any)=>typeof x==='function'?{get value(){return x()}}:{get value(){return x.get()},set value(v){x.set(v)}},useState:(k:string,init:any)=>store[k]??(store[k]={value:init()}),watch:()=>{},onMounted:()=>{},crypto:{randomUUID:()=>`intel-${++ids}`},$fetch:transport};runInNewContext(ts.transpileModule(source+';globalThis.h={run,refresh,review,pending};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx);return ctx.h}
 let h=mount();await h.refresh();h.review.value='security';await h.run();expect(h.pending.value).not.toBeNull();h=mount();await h.refresh();await h.run();expect(posted).toHaveLength(2);expect(posted[1]).toEqual(posted[0]);expect(actions.size).toBe(1);expect(h.pending.value).toBeNull();
});
