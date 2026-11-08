import type { State, Summary, AdvanceResult, Event } from '../packages/domain/index.ts';
import type { AdvanceCommand } from '../packages/contracts/index.ts';
import { rules, RULES_VERSION } from '../packages/rules/index.ts';
import { gameDate } from '../packages/engine/core.ts';
export interface QueryResult { results:any[];meta:{changes:number} }
export interface Statement {bind(...args:any[]):Statement;first():Promise<any>;all():Promise<QueryResult>;run():Promise<QueryResult>}
export interface Database {prepare(sql:string):Statement;batch(statements:Statement[]):Promise<QueryResult[]>;withSession?(constraint:string):Database}
export interface Campaign {id:string;owner:string;name:string;seed:string;startDate:string;rulesVersion:string;state:State;stateVersion:number;revision:number;activeRequest:string|null;createPayload:string}
export interface Command {command:AdvanceCommand;payload:string;processed:number;result:AdvanceResult}
export class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message)}}
const rowGame=(r:any):Campaign=>({id:r.id,owner:r.owner,name:r.name,seed:r.seed,startDate:r.start_date,rulesVersion:r.rules_version,state:{turn:r.current_turn,cashCents:r.cash_cents,reputation:r.reputation,status:r.status},stateVersion:r.state_version,revision:r.revision,activeRequest:r.active_request,createPayload:r.creation_payload});
export const projection=(g:Campaign)=>({id:g.id,name:g.name,rulesVersion:g.rulesVersion,currentTurn:g.state.turn,stateVersion:g.stateVersion,cashCents:g.state.cashCents,reputation:g.state.reputation,status:g.state.status,date:gameDate(g.startDate,g.state.turn)});
const rowCommand=(r:any):Command|undefined=>r?{command:JSON.parse(r.payload_json),payload:r.payload_json,processed:r.processed_turns,result:{requestId:r.request_id,requestedTurns:r.requested_turns,processedTurns:r.processed_turns,currentTurn:r.last_turn,stateVersion:r.result_version,status:r.status,reason:r.reason}}:undefined;
const rowEvent=(r:any):Event=>({turn:r.turn,sequence:r.sequence,type:r.event_type,title:r.title,description:r.description,important:!!r.important});
export function result(g:Campaign,entry:Command,status:AdvanceResult['status'],reason:string|null=null):AdvanceResult{return {requestId:entry.command.requestId,requestedTurns:entry.command.turns,processedTurns:entry.processed,currentTurn:g.state.turn,stateVersion:g.stateVersion,status,reason}}
// Bounded backfill: one campaign, five SQL statements, no history sent through Worker bindings.
// Every statement belongs to the same D1 batch transaction. The old row is preserved.
export async function importLegacy(db:Database,id:string,owner:string){
 if(await db.prepare('SELECT id FROM online_games WHERE id=? AND owner=?').bind(id,owner).first())return;
 const token=crypto.randomUUID();
 const source="c.id=? AND c.owner=? AND EXISTS (SELECT 1 FROM online_games g WHERE g.id=c.id AND g.owner=c.owner AND g.commit_token=?)";
 await db.batch([
  db.prepare(`INSERT INTO online_games(id,owner,creation_request_id,creation_payload,name,seed,rules_version,start_date,current_turn,cash_cents,reputation,status,state_version,revision,active_request,commit_token,created_order)
   SELECT id,owner,request_id,create_payload,name,json_extract(state_json,'$.seed'),json_extract(state_json,'$.rulesVersion'),json_extract(state_json,'$.startDate'),json_extract(state_json,'$.state.turn'),json_extract(state_json,'$.state.cashCents'),json_extract(state_json,'$.state.reputation'),json_extract(state_json,'$.state.status'),json_extract(state_json,'$.stateVersion'),0,json_extract(state_json,'$.activeRequest'),?,rowid FROM online_campaigns WHERE id=? AND owner=? ON CONFLICT(id) DO NOTHING`).bind(token,id,owner),
  db.prepare(`INSERT INTO online_commands SELECT c.id,e.key,json_extract(e.value,'$.payload'),json_extract(e.value,'$.command.turns'),json_extract(e.value,'$.processed'),json_extract(e.value,'$.result.status'),json_extract(e.value,'$.result.reason'),json_extract(e.value,'$.result.currentTurn'),json_extract(e.value,'$.result.stateVersion') FROM online_campaigns c,json_each(c.state_json,'$.requests') e WHERE ${source}`).bind(id,owner,token),
  db.prepare(`INSERT INTO online_events SELECT c.id,json_extract(e.value,'$.turn'),json_extract(e.value,'$.sequence'),json_extract(e.value,'$.type'),json_extract(e.value,'$.title'),json_extract(e.value,'$.description'),json_extract(e.value,'$.important') FROM online_campaigns c,json_each(c.state_json,'$.events') e WHERE ${source}`).bind(id,owner,token),
  db.prepare(`INSERT INTO online_turn_summaries SELECT c.id,json_extract(e.value,'$.turn'),json_extract(e.value,'$.date'),json_extract(e.value,'$.stateHash') FROM online_campaigns c,json_each(c.state_json,'$.summaries') e WHERE ${source}`).bind(id,owner,token),
  // The legacy foundation had exactly one financial fact, fixed by rules version 0.1.0.
  db.prepare(`INSERT INTO online_ledger SELECT c.id,'initial-capital','initial_capital',0,10000000 FROM online_campaigns c WHERE ${source}`).bind(id,owner,token),
 ]);
}
export async function getGame(db:Database,id:string,owner:string):Promise<Campaign>{
 let row=await db.prepare('SELECT * FROM online_games WHERE id=? AND owner=?').bind(id,owner).first();
 if(!row){await importLegacy(db,id,owner);row=await db.prepare('SELECT * FROM online_games WHERE id=? AND owner=?').bind(id,owner).first();}
 if(!row)throw new ApiError(404,'NOT_FOUND','Partida não encontrada.');return rowGame(row);
}
export async function listGames(db:Database,owner:string){
 const rows=await db.prepare(`SELECT id,name,rules_version,start_date,current_turn,cash_cents,reputation,status,state_version,created_order FROM online_games WHERE owner=?
 UNION ALL SELECT id,name,json_extract(state_json,'$.rulesVersion'),json_extract(state_json,'$.startDate'),json_extract(state_json,'$.state.turn'),json_extract(state_json,'$.state.cashCents'),json_extract(state_json,'$.state.reputation'),json_extract(state_json,'$.state.status'),json_extract(state_json,'$.stateVersion'),rowid FROM online_campaigns c WHERE owner=? AND NOT EXISTS(SELECT 1 FROM online_games g WHERE g.id=c.id) ORDER BY created_order DESC`).bind(owner,owner).all();
 return rows.results.map(r=>({id:r.id,name:r.name,rulesVersion:r.rules_version,currentTurn:r.current_turn,stateVersion:r.state_version,cashCents:r.cash_cents,reputation:r.reputation,status:r.status,date:gameDate(r.start_date,r.current_turn)}));
}
export async function createGame(db:Database,id:string,owner:string,command:{requestId:string;name:string;seed:string}){
 await importLegacy(db,id,owner);
 const payload=JSON.stringify(command),token=crypto.randomUUID();
 await db.batch([
  db.prepare(`INSERT INTO online_games(id,owner,creation_request_id,creation_payload,name,seed,rules_version,start_date,current_turn,cash_cents,reputation,status,state_version,revision,active_request,commit_token,created_order)
  VALUES(?,?,?,?,?,?,?,?,0,?,?,'active',0,0,NULL,?,(SELECT coalesce(max(n),0)+1 FROM (SELECT created_order AS n FROM online_games UNION ALL SELECT rowid AS n FROM online_campaigns))) ON CONFLICT(id) DO NOTHING`).bind(id,owner,command.requestId,payload,command.name,command.seed,RULES_VERSION,rules.startDate,rules.initialCashCents,rules.initialReputation,token),
  db.prepare("INSERT INTO online_ledger SELECT id,'initial-capital','initial_capital',0,? FROM online_games WHERE id=? AND owner=? AND commit_token=?").bind(rules.initialCashCents,id,owner,token),
 ]);
 const g=await getGame(db,id,owner);if(g.createPayload!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');return projection(g);
}
export async function snapshot(db:Database,id:string,owner:string,requestId:string){
 const rows=await db.batch([
  db.prepare('SELECT * FROM online_games WHERE id=? AND owner=?').bind(id,owner),
  db.prepare('SELECT c.* FROM online_commands c JOIN online_games g ON g.id=c.game_id WHERE c.game_id=? AND c.request_id=? AND g.owner=?').bind(id,requestId,owner),
 ]);
 if(!rows[0].results[0])throw new ApiError(404,'NOT_FOUND','Partida não encontrada.');
 return {g:rowGame(rows[0].results[0]),entry:rowCommand(rows[1].results[0])};
}
// A fresh token gates all dependent writes when revision CAS loses the race.
// D1 batch provides transaction atomicity; stale contenders produce no side effects.
async function mutate(db:Database,g:Campaign,next:Campaign,build:(guard:string,args:any[])=>Statement[]){
 const token=crypto.randomUUID();const guard='EXISTS(SELECT 1 FROM online_games WHERE id=? AND owner=? AND commit_token=?)';
 const rows=await db.batch([
  db.prepare('UPDATE online_games SET current_turn=?,cash_cents=?,reputation=?,status=?,state_version=?,active_request=?,revision=revision+1,commit_token=? WHERE id=? AND owner=? AND revision=?').bind(next.state.turn,next.state.cashCents,next.state.reputation,next.state.status,next.stateVersion,next.activeRequest,token,g.id,g.owner,g.revision),
  ...build(guard,[g.id,g.owner,token]),
 ]);return rows[0].meta.changes===1;
}
export async function register(db:Database,g:Campaign,entry:Command,resume:boolean){
 const next={...g,activeRequest:entry.command.requestId};
 return mutate(db,g,next,(guard,args)=>[
  resume?db.prepare(`UPDATE online_commands SET status='processing',reason=NULL,last_turn=?,result_version=? WHERE game_id=? AND request_id=? AND ${guard}`).bind(g.state.turn,g.stateVersion,g.id,entry.command.requestId,...args):
  db.prepare(`INSERT INTO online_commands SELECT ?,?,?,?,0,'processing',NULL,?,? WHERE ${guard}`).bind(g.id,entry.command.requestId,entry.payload,entry.command.turns,g.state.turn,g.stateVersion,...args),
 ]);
}
export async function commitTurn(db:Database,g:Campaign,entry:Command,summary:Summary,state:State,status:AdvanceResult['status'],reason:string|null){
 const next={...g,state,stateVersion:g.stateVersion+1,activeRequest:status==='processing'?entry.command.requestId:null};
 return mutate(db,g,next,(guard,args)=>[
  ...summary.events.map(e=>db.prepare(`INSERT INTO online_events SELECT ?,?,?,?,?,?,? WHERE ${guard}`).bind(g.id,e.turn,e.sequence,e.type,e.title,e.description,Number(e.important),...args)),
  db.prepare(`INSERT INTO online_turn_summaries SELECT ?,?,?,? WHERE ${guard}`).bind(g.id,summary.turn,summary.date,summary.stateHash,...args),
  db.prepare(`UPDATE online_commands SET processed_turns=?,status=?,reason=?,last_turn=?,result_version=? WHERE game_id=? AND request_id=? AND ${guard}`).bind(entry.processed+1,status,reason,state.turn,next.stateVersion,g.id,entry.command.requestId,...args),
 ]);
}
export async function failCommand(db:Database,g:Campaign,entry:Command,reason:string){
 return mutate(db,g,{...g,activeRequest:null},(guard,args)=>[
  db.prepare(`UPDATE online_commands SET status='failed',reason=?,last_turn=?,result_version=? WHERE game_id=? AND request_id=? AND ${guard}`).bind(reason,g.state.turn,g.stateVersion,g.id,entry.command.requestId,...args),
 ]);
}
export async function timeline(db:Database,id:string,offset=0,limit=30){
 const rows=await db.prepare('SELECT * FROM online_events WHERE game_id=? ORDER BY turn DESC,sequence DESC LIMIT ? OFFSET ?').bind(id,limit,offset).all();return rows.results.map(rowEvent);
}
export async function turnSummary(db:Database,id:string,turn:number){
 const rows=await db.batch([db.prepare('SELECT * FROM online_turn_summaries WHERE game_id=? AND turn=?').bind(id,turn),db.prepare('SELECT * FROM online_events WHERE game_id=? AND turn=? ORDER BY sequence').bind(id,turn)]);
 const s=rows[0].results[0];if(!s)throw new ApiError(404,'NOT_FOUND','Resumo não encontrado.');return {turn:s.turn,date:s.date,stateHash:s.state_hash,events:rows[1].results.map(rowEvent)};
}
export async function financialLedger(db:Database,id:string){const rows=await db.prepare('SELECT turn,source_id AS sourceId,amount_cents AS amountCents,entry_type AS entryType FROM online_ledger WHERE game_id=? ORDER BY turn,source_id').bind(id).all();return rows.results;}
