import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
for(const failAt of ['write','refresh'])it('UI logística: retry de compra após perda em '+failAt+' usa o mesmo comando',async()=>{
 const source=readFileSync('apps/web/components/LogisticsPanel.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0],store:Record<string,any>={},posted:any[]=[],actions=new Map<string,any>();let fail=true,ids=0;
 const transport=async(_url:string,options:any={})=>{if(options.method){posted.push(options.body);actions.set(options.body.requestId,options.body);if(failAt==='write'&&fail){fail=false;throw Error('lost response')}return {}}if(failAt==='refresh'&&fail&&actions.size){fail=false;throw Error('lost refresh')}return {stateVersion:actions.size,inventory:[],modules:[],catalog:[]}};
 function mount(){const ctx:any={defineProps:()=>({game:{id:'g',stateVersion:0}}),defineEmits:()=>()=>{},ref:(value:any)=>({value}),computed:(x:any)=>typeof x==='function'?{get value(){return x()}}:{get value(){return x.get()},set value(v){x.set(v)}},useState:(k:string,init:any)=>store[k]??(store[k]={value:init()}),watch:()=>{},onMounted:()=>{},crypto:{randomUUID:()=>`purchase-${++ids}`},$fetch:transport};runInNewContext(ts.transpileModule(source+';globalThis.h={run,refresh,prepare,pending};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,ctx);return ctx.h}
 let h=mount();await h.refresh();h.prepare('/equipment/purchases',{catalogId:'combat-1',quantity:1},'Compra',180000,'Entrega em quatro turnos');await h.run();expect(h.pending.value).not.toBeNull();h=mount();await h.refresh();await h.run();expect(posted).toHaveLength(2);expect(posted[1]).toEqual(posted[0]);expect(actions.size).toBe(1);expect(h.pending.value).toBeNull();
});
