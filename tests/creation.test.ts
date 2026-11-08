import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
// Exercise the actual Vue setup handlers with a transport that loses responses.
function setup(failAt:'create'|'list'|'select'){
 let fail=true,ids=0;const campaigns=new Map<string,any>();const posted:any[]=[];
 const source=readFileSync('apps/web/pages/index.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
 const context:any={useState:(_key:string,init:any)=>({value:init()}),ref:(value:any)=>({value}),computed:(fn:any)=>({get value(){return fn()}}),onMounted:()=>{},localStorage:{setItem:()=>{}},crypto:{randomUUID:()=>`creation-${++ids}`},$fetch:async(path:string,options:any={})=>{
  if(options.method==='POST'){
   const command=options.body;posted.push(command);
   if(!campaigns.has(command.requestId))campaigns.set(command.requestId,{id:command.requestId,name:command.name});
   if(fail&&failAt==='create'){fail=false;throw Error('lost response')}
   return campaigns.get(command.requestId);
  }
  if(path==='/api/v1/games'){
   if(fail&&failAt==='list'){fail=false;throw Error('lost list')}
   return [...campaigns.values()];
  }
  if(path.endsWith('/'+posted[0]?.requestId)){
   if(fail&&failAt==='select'){fail=false;throw Error('lost projection')}
   return campaigns.get(posted[0].requestId);
  }
  return [];
 }};
 runInNewContext(ts.transpileModule(source+';globalThis.harness={create,pendingCreation,name,seed,busy,error,showCreate};',{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.None}}).outputText,context);
 return {h:context.harness,campaigns,posted};
}
for(const failAt of ['create','list','select'] as const){
 it(`UI: retry após falha em ${failAt} recupera a mesma criação`,async()=>{
  const {h,campaigns,posted}=setup(failAt);
  await h.create();expect(h.pendingCreation.value).not.toBeNull();expect(h.busy.value).toBe(false);
  const pending=h.pendingCreation.value;
  await h.create();
  expect(posted).toHaveLength(2);expect(posted[1]).toEqual(pending);
  expect(campaigns.size).toBe(1);expect(h.pendingCreation.value).toBeNull();expect(h.error.value).toBe('');
 });
}
