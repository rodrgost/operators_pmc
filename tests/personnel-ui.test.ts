import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
for(const failAt of ['write','refresh'] as const){
 it(`UI pessoal: retry após perda em ${failAt} mantém comando mesmo ao reabrir o painel`,async()=>{
  const source=readFileSync('apps/web/components/PersonnelPanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
  const store:Record<string,any>={},actions=new Map<string,any>(),posted:any[]=[];let fail=true,ids=0;
  const transport=async(_path:string,options:any={})=>{
   if(options.method){posted.push(options.body);actions.set(options.body.requestId,options.body);if(failAt==='write'&&fail){fail=false;throw Error('response lost')}return {};}
   if(failAt==='refresh'&&fail&&actions.size){fail=false;throw Error('refresh lost')}
   return {operators:[],candidates:[],squads:[],stateVersion:actions.size};
  };
  function mount(){
   const context:any={useActionFeedback:()=>({feedbackTarget:{value:''},captureAction:()=>{}}),defineProps:()=>({game:{id:'g',stateVersion:0}}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(input:any)=>typeof input==='function'?{get value(){return input()}}:{get value(){return input.get()},set value(v){input.set(v)}},useState:(key:string,init:any)=>store[key]??(store[key]={value:init()}),watch:()=>{},onMounted:()=>{},crypto:{randomUUID:()=>`action-${++ids}`},$fetch:transport};
   runInNewContext(ts.transpileModule(source+';globalThis.harness={run,refresh,pending,notice};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,context);
   return context.harness;
  }
  let h=mount();await h.refresh();await h.run('/squads',{name:'Alfa'});expect(h.pending.value).not.toBeNull();
  h=mount();await h.refresh();await h.run('/squads',{name:'Alfa'});
  expect(posted).toHaveLength(2);expect(posted[1]).toEqual(posted[0]);expect(actions.size).toBe(1);expect(h.pending.value).toBeNull();expect(h.notice.value).toContain('Equipe salva');
 });
}
