import {NORMAL_V1,preset,savedDifficulty,type DifficultyProfile,type DifficultyId} from '../packages/engine/difficulty.ts';
import type { State, Summary, AdvanceResult, Event } from '../packages/domain/index.ts';
import type { AdvanceCommand } from '../packages/contracts/index.ts';
import { countries, rules, RULES_VERSION } from '../packages/rules/index.ts';
import { gameDate } from '../packages/engine/core.ts';
export interface QueryResult { results:any[];meta:{changes:number} }
export interface Statement {bind(...args:any[]):Statement;first():Promise<any>;all():Promise<QueryResult>;run():Promise<QueryResult>}
export interface Database { planning?:any;prepare(sql:string):Statement;batch(statements:Statement[]):Promise<QueryResult[]>;withSession?(constraint:string):Database}
export interface Campaign {registrationCountryId:string|null;difficultyProfile:DifficultyProfile;id:string;owner:string;name:string;seed:string;startDate:string;rulesVersion:string;state:State;stateVersion:number;revision:number;activeRequest:string|null;createPayload:string;personnelVersion:string;personnelInitialized:boolean;operationsInitialized:boolean;operationsVersion:string;worldInitialized:boolean;worldVersion:string;logisticsInitialized:boolean;logisticsVersion:string;intelligenceInitialized:boolean;intelligenceVersion:string}
export interface Command {command:AdvanceCommand;payload:string;processed:number;result:AdvanceResult}
export class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message)}}
export const rowGame=(r:any):Campaign=>({registrationCountryId:r.registration_country_id??null,difficultyProfile:savedDifficulty(r.difficulty??'normal',r.difficulty_version??'difficulty-1',r.difficulty_json??JSON.stringify(NORMAL_V1)),id:r.id,owner:r.owner,name:r.name,seed:r.seed,startDate:r.start_date,rulesVersion:r.rules_version,state:{turn:r.current_turn,cashCents:r.cash_cents,reputation:r.reputation,status:r.status},stateVersion:r.state_version,revision:r.revision,activeRequest:r.active_request,createPayload:r.creation_payload,personnelVersion:r.personnel_version,personnelInitialized:!!r.personnel_initialized,operationsInitialized:!!r.operations_initialized,operationsVersion:r.operations_version,worldInitialized:!!r.world_initialized,worldVersion:r.world_version,logisticsInitialized:!!r.logistics_initialized,logisticsVersion:r.logistics_version,intelligenceInitialized:!!r.intelligence_initialized,intelligenceVersion:r.intelligence_version});
export const projection=(g:Campaign)=>({registrationCountryId:g.registrationCountryId,registrationCountryName:countries.find(c=>c.id===g.registrationCountryId)?.name??null,id:g.id,name:g.name,difficulty:g.difficultyProfile.id,difficultyLabel:g.difficultyProfile.label,difficultyVersion:g.difficultyProfile.version,difficultyModifiers:g.difficultyProfile,rulesVersion:g.rulesVersion,currentTurn:g.state.turn,stateVersion:g.stateVersion,cashCents:g.state.cashCents,reputation:g.state.reputation,status:g.state.status,date:gameDate(g.startDate,g.state.turn)});
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
 if(db.planning?.g.id===id&&db.planning.g.owner===owner)return db.planning.g;
 let row=await db.prepare('SELECT * FROM online_games WHERE id=? AND owner=?').bind(id,owner).first();
 if(!row){await importLegacy(db,id,owner);row=await db.prepare('SELECT * FROM online_games WHERE id=? AND owner=?').bind(id,owner).first();}
 if(!row)throw new ApiError(404,'NOT_FOUND','Partida não encontrada.');return rowGame(row);
}
export async function listGames(db:Database,owner:string){
 const rows=await db.prepare(`SELECT id,name,rules_version,start_date,current_turn,cash_cents,reputation,status,state_version,created_order,difficulty,difficulty_version,difficulty_json,registration_country_id FROM online_games WHERE owner=?
 UNION ALL SELECT id,name,json_extract(state_json,'$.rulesVersion'),json_extract(state_json,'$.startDate'),json_extract(state_json,'$.state.turn'),json_extract(state_json,'$.state.cashCents'),json_extract(state_json,'$.state.reputation'),json_extract(state_json,'$.state.status'),json_extract(state_json,'$.stateVersion'),rowid,'normal','difficulty-1',?,NULL FROM online_campaigns c WHERE owner=? AND NOT EXISTS(SELECT 1 FROM online_games g WHERE g.id=c.id) ORDER BY created_order DESC`).bind(owner,JSON.stringify(NORMAL_V1),owner).all();
 return rows.results.map(r=>({registrationCountryId:r.registration_country_id??null,registrationCountryName:countries.find(c=>c.id===r.registration_country_id)?.name??null,id:r.id,name:r.name,difficulty:r.difficulty,difficultyLabel:savedDifficulty(r.difficulty,r.difficulty_version,r.difficulty_json).label,difficultyVersion:r.difficulty_version,rulesVersion:r.rules_version,currentTurn:r.current_turn,stateVersion:r.state_version,cashCents:r.cash_cents,reputation:r.reputation,status:r.status,date:gameDate(r.start_date,r.current_turn)}));
}
export async function createGame(db:Database,id:string,owner:string,command:{requestId:string;name:string;seed:string;difficulty?:DifficultyId;registrationCountryId?:string}){
 await importLegacy(db,id,owner);
 const canonicalCreation=(c:any)=>JSON.stringify({requestId:c.requestId,name:c.name,seed:c.seed,difficulty:c.difficulty??'normal',registrationCountryId:c.registrationCountryId??null});
 const payload=canonicalCreation(command),profile=preset(command.difficulty??'normal'),token=crypto.randomUUID();
 await db.batch([
  db.prepare(`INSERT INTO online_games(id,owner,creation_request_id,creation_payload,name,seed,rules_version,start_date,current_turn,cash_cents,reputation,status,state_version,revision,active_request,commit_token,created_order,difficulty,difficulty_version,difficulty_json,registration_country_id)
  VALUES(?,?,?,?,?,?,?,?,0,?,?,'active',0,0,NULL,?,(SELECT coalesce(max(n),0)+1 FROM (SELECT created_order AS n FROM online_games UNION ALL SELECT rowid AS n FROM online_campaigns)),?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(id,owner,command.requestId,payload,command.name,command.seed,RULES_VERSION,rules.startDate,rules.initialCashCents,rules.initialReputation,token,profile.id,profile.version,JSON.stringify(profile),command.registrationCountryId??null),
  db.prepare("INSERT INTO online_ledger SELECT id,'initial-capital','initial_capital',0,? FROM online_games WHERE id=? AND owner=? AND commit_token=?").bind(rules.initialCashCents,id,owner,token),
 ]);
 const g=await getGame(db,id,owner);if(canonicalCreation(JSON.parse(g.createPayload))!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');return projection(g);
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
export async function mutate(db:Database,g:Campaign,next:Campaign,build:(guard:string,args:any[])=>Statement[]){
 if(db.planning){db.planning.builders.push(build);db.planning.g=next;return true;}
 const token=crypto.randomUUID();const guard='EXISTS(SELECT 1 FROM online_games WHERE id=? AND owner=? AND commit_token=?)';
 const rows=await db.batch([
  db.prepare('UPDATE online_games SET current_turn=?,cash_cents=?,reputation=?,status=?,state_version=?,active_request=?,personnel_initialized=?,operations_initialized=?,world_initialized=?,logistics_initialized=?,intelligence_initialized=?,revision=revision+1,commit_token=? WHERE id=? AND owner=? AND revision=?').bind(next.state.turn,next.state.cashCents,next.state.reputation,next.state.status,next.stateVersion,next.activeRequest,Number(next.personnelInitialized),Number(next.operationsInitialized),Number(next.worldInitialized),Number(next.logisticsInitialized),Number(next.intelligenceInitialized),token,g.id,g.owner,g.revision),
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
export async function commitTurn(db:Database,g:Campaign,entry:Command,summary:Summary,state:State,status:AdvanceResult['status'],reason:string|null,extra?:(guard:string,args:any[])=>Statement[]){
 const next={...g,state,stateVersion:g.stateVersion+1,activeRequest:status==='processing'?entry.command.requestId:null};
 return mutate(db,g,next,(guard,args)=>[
  ...(extra?.(guard,args)??[]),
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
export async function financialLedger(db:Database,id:string){
 const rows=await db.prepare(`SELECT l.turn,l.source_id AS sourceId,l.amount_cents AS amountCents,l.entry_type AS entryType,g.start_date AS startDate,
 COALESCE(json_extract(op.profile_json,'$.name'),c.title,p.title) AS detail
 FROM online_ledger l JOIN online_games g ON g.id=l.game_id
 LEFT JOIN online_employment e ON e.game_id=l.game_id AND l.source_id='salary:'||e.id||':'||l.turn
 LEFT JOIN online_operators op ON op.game_id=e.game_id AND op.id=e.operator_id
 LEFT JOIN online_missions m ON m.game_id=l.game_id AND l.source_id IN('mission:'||m.id||':mobilization','mission:'||m.id||':advance','mission:'||m.id||':completion','mission:'||m.id||':refund')
 LEFT JOIN online_contracts c ON c.game_id=m.game_id AND c.id=m.contract_id
 LEFT JOIN online_pending_orders p ON p.game_id=l.game_id AND p.status='committed' AND l.source_id IN('hire:'||p.id,'logistics:'||p.id,'facility:'||p.id,'analysis-'||p.id)
 WHERE l.game_id=? ORDER BY l.turn,l.source_id,l.entry_type`).bind(id).all();
 const descriptions:Record<string,string>={initial_capital:'Capital inicial',signing_bonus:'Bônus de contratação',salary_payment:'Pagamento de salário',equipment_purchase:'Compra de kits',equipment_maintenance:'Reparo de kit',equipment_resupply:'Reposição de suprimentos',headquarters_upgrade:'Melhoria da sede',headquarters_maintenance:'Manutenção da sede',operator_training:'Treinamento de operadores',operator_treatment:'Tratamento de operadores',intelligence_analysis:'Análise de inteligência',mission_mobilization:'Mobilização de missão',mission_advance:'Adiantamento de missão',mission_completion:'Pagamento final de missão',advance_refund:'Devolução de adiantamento'};
 return rows.results.map(({startDate,...row}:any)=>({...row,date:gameDate(startDate,row.turn),description:descriptions[row.entryType]||'Movimentação financeira'}));
}

export async function deleteGame(db:Database,g:Campaign,confirmationName:string,expectedVersion:number){
 if(confirmationName!==g.name)throw new ApiError(422,'NAME_MISMATCH','Digite o nome exato da companhia para confirmar.');
 if(g.stateVersion!==expectedVersion)throw new ApiError(409,'STALE_VERSION','A companhia mudou. Atualize a lista antes de excluir.');
 if(g.activeRequest)throw new ApiError(409,'ADVANCE_IN_PROGRESS','Conclua a passagem de turno antes de excluir a companhia.');
 const dependentTables=['online_commands','online_events','online_ledger','online_turn_summaries','online_actions','online_employment','online_familiarity','online_squad_members','online_personnel_history','online_recruitment','online_reservations','online_mission_assignments','online_decisions','online_mission_reports','online_world_influences','online_world_rival_jobs','online_world_conflict_participants','online_world_relations','online_facility_activities','online_headquarters','online_hq_modules','online_mission_equipment','online_training_progress','online_intel_analyses','online_intel_current','online_mission_intelligence','online_pending_orders','online_operators','online_world_conflicts','online_world_rivals','online_equipment','online_intel_records','online_missions','online_world_events','online_squads','online_contracts','online_world_regions','online_world_organizations'];
 // Child-first deletes share the revision guard and one atomic transaction.
 const rows=await db.batch([
  ...dependentTables.map(table=>db.prepare(`DELETE FROM ${table} WHERE game_id=? AND EXISTS(SELECT 1 FROM online_games WHERE id=? AND owner=? AND revision=? AND active_request IS NULL)`).bind(g.id,g.id,g.owner,g.revision)),
  db.prepare('DELETE FROM online_campaigns WHERE id=? AND owner=? AND EXISTS(SELECT 1 FROM online_games WHERE id=? AND owner=? AND revision=? AND active_request IS NULL)').bind(g.id,g.owner,g.id,g.owner,g.revision),
  db.prepare('DELETE FROM online_games WHERE id=? AND owner=? AND revision=? AND active_request IS NULL').bind(g.id,g.owner,g.revision),
 ]);
 if(rows[rows.length-1].meta.changes!==1)throw new ApiError(409,'STALE_VERSION','A companhia mudou. Atualize a lista antes de excluir.');
 return {deleted:true,id:g.id};
}
