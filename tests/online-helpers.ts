import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { handleApi } from '../worker/api.ts';
import { advanceTurn } from '../packages/engine/index.ts';
import type { State } from '../packages/domain/index.ts';
// @ts-expect-error Local JavaScript adapter intentionally has no declaration file.
import { sqliteD1,applyMigrations } from '../scripts/sqlite-d1.mjs';
export function setup(onRun?:(sql:string,args:any[])=>void,db=new DatabaseSync(':memory:')){
 applyMigrations(db);const DB=sqliteD1(db,onRun);
 async function call(path:string,body?:any,user='owner',method=body?'POST':'GET'){
  const response=await handleApi(new Request('https://pmc.example/api/v1'+path,{method,headers:{'oai-authenticated-user-id':user,'content-type':'application/json'},body:body?JSON.stringify(body):undefined}),{DB});
  return {status:response.status,data:await response.json() as any};
 }
 return {db,DB,call};
}
export function legacyFixture(db:DatabaseSync,options:{owner?:string;turns?:number;status?:string;requestId?:string;creationId?:string}={}){
 const owner=options.owner??'owner',turns=options.turns??16,status=options.status??'failed',requestId=options.requestId??'legacy';
 const create={requestId:options.creationId??'legacy-create',name:'Legacy PMC',seed:'asterra'};
 const id=createHash('sha256').update(JSON.stringify([owner,create.requestId])).digest('hex');
 let state:State={turn:0,cashCents:10000000,reputation:10,status:'active'};const events:any[]=[],summaries:Record<string,any>={};
 for(let i=0;i<turns;i++){const next=advanceTurn(state,create.seed,'2030-01-01T00:00:00.000Z');state=next.state;events.push(...next.summary.events);summaries[state.turn]=next.summary;}
 const command={requestId,expectedVersion:0,turns:28,stopOnImportant:false};
 const result={requestId,requestedTurns:28,processedTurns:turns,currentTurn:turns,stateVersion:turns,status,reason:status==='failed'?'turn_failed':null};
 const campaign={id,name:create.name,seed:create.seed,startDate:'2030-01-01T00:00:00.000Z',rulesVersion:'0.1.0',state,stateVersion:turns,events,summaries,requests:{[requestId]:{command,payload:JSON.stringify(command),processed:turns,result}},activeRequest:status==='processing'?requestId:null};
 const raw=JSON.stringify(campaign);
 db.prepare('INSERT INTO online_campaigns VALUES(?,?,?,?,?,?,?)').run(id,owner,create.requestId,JSON.stringify(create),create.name,turns,raw);
 return {id,create,command,result,campaign,raw};
}
