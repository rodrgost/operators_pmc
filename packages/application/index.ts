import {NORMAL_V1,preset,type DifficultyId} from '../engine/difficulty.ts';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { DomainError, type Game, type AdvanceResult, type Summary } from '../domain/index.ts';
import type { AdvanceCommand } from '../contracts/index.ts';
import { countries, organizations, rules, RULES_VERSION } from '../rules/index.ts';
import { advanceTurn, gameDate } from '../engine/index.ts';
import { transaction, rowGame } from '../persistence/index.ts';
export class GameService {
 private active=new Set<string>();
 constructor(public db:DatabaseSync,private beforeCommit?:(turn:number)=>void){
 // A single API process owns this database. Recover requests interrupted by process exit.
 transaction(db,()=>{
  const interrupted=db.prepare("SELECT * FROM advance_requests WHERE status='processing'").all() as any[];
  for(const row of interrupted){
   const game=this.get(row.game_id);
   const result:AdvanceResult={requestId:row.request_id,requestedTurns:row.requested_turns,processedTurns:row.processed_turns,currentTurn:row.last_committed_turn,stateVersion:game.stateVersion,status:'failed',reason:'process_interrupted'};
   db.prepare("UPDATE advance_requests SET status='failed',interruption_reason='process_interrupted',result_json=? WHERE game_id=? AND request_id=?").run(JSON.stringify(result),row.game_id,row.request_id);
  }
 });
 }
 get(id:string):Game {const row=this.db.prepare('SELECT * FROM games WHERE id=?').get(id);if(!row)throw new DomainError('NOT_FOUND','Partida não encontrada.',404);return rowGame(row)}
 project(game:Game){return {difficulty:(game.difficultyProfile??NORMAL_V1).id,difficultyLabel:(game.difficultyProfile??NORMAL_V1).label,difficultyVersion:(game.difficultyProfile??NORMAL_V1).version,id:game.id,name:game.name,rulesVersion:game.rulesVersion,currentTurn:game.state.turn,stateVersion:game.stateVersion,cashCents:game.state.cashCents,reputation:game.state.reputation,status:game.state.status,date:gameDate(game.startDate,game.state.turn)}}
 list(){return this.db.prepare('SELECT * FROM games ORDER BY rowid DESC').all().map(r=>this.project(rowGame(r)))}
 create(command:{requestId:string;name:string;seed:string;difficulty?:DifficultyId}){
 return transaction(this.db,()=>{
 const old=this.db.prepare('SELECT * FROM creation_requests WHERE request_id=?').get(command.requestId) as any;
 const canonicalCreation=(c:any)=>JSON.stringify({requestId:c.requestId,name:c.name,seed:c.seed,difficulty:c.difficulty??'normal'});
 const payload=canonicalCreation(command),profile=preset(command.difficulty??'normal');
 if(old){if(canonicalCreation(JSON.parse(old.payload_json))!==payload)throw new DomainError('REQUEST_REUSED','Identificador já utilizado com outros dados.');return this.project(this.get(old.game_id))}
 const id=randomUUID();this.db.prepare('INSERT INTO games(id,name,seed,rules_version,start_date,current_turn,cash_cents,reputation,status,state_version,difficulty,difficulty_version,difficulty_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,command.name,command.seed,RULES_VERSION,rules.startDate,0,rules.initialCashCents,rules.initialReputation,'active',0,profile.id,profile.version,JSON.stringify(profile));
 this.db.prepare('INSERT INTO creation_requests VALUES(?,?,?)').run(command.requestId,payload,id);
 for(const country of countries){this.db.prepare('INSERT INTO countries VALUES(?,?,?,?)').run(id,country.id,country.name,country.description);country.regions.forEach((name,i)=>this.db.prepare('INSERT INTO regions VALUES(?,?,?,?)').run(id,country.id,`${country.id}-${i}`,name))}
 for(const org of organizations)this.db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(id,org.id,org.name,org.type);
 this.db.prepare('INSERT INTO financial_ledger VALUES(?,?,?,?,?)').run(id,'initial-capital',0,rules.initialCashCents,'initial_capital');
 return this.project(this.get(id));
 })}
 result(id:string,requestId:string):AdvanceResult {const row=this.db.prepare('SELECT result_json FROM advance_requests WHERE game_id=? AND request_id=?').get(id,requestId) as any;if(!row)throw new DomainError('NOT_FOUND','Avanço não encontrado.',404);if(!row.result_json)throw new DomainError('IN_PROGRESS','Avanço em processamento.');return JSON.parse(row.result_json)}
 advance(id:string,command:AdvanceCommand,resume=false):AdvanceResult {
 if(this.active.has(id))throw new DomainError('LOCKED','Já existe um avanço ativo.');
 this.active.add(id);
 try{
 const payload=JSON.stringify(command);
 const initial=transaction(this.db,()=>{
 const game=this.get(id);
 const old=this.db.prepare('SELECT * FROM advance_requests WHERE game_id=? AND request_id=?').get(id,command.requestId) as any;
 if(old&&!resume){if(old.payload_json!==payload)throw new DomainError('REQUEST_REUSED','Identificador já utilizado com outros dados.');return {cached:this.result(id,command.requestId)}}
 if(game.stateVersion!==command.expectedVersion)throw new DomainError('VERSION_CONFLICT','A partida mudou. Atualize a tela antes de continuar.');
 if(game.rulesVersion!==RULES_VERSION)throw new DomainError('RULES_MISMATCH','Versão de regras indisponível.',422);
 if(resume){if(!old||old.status!=='failed')throw new DomainError('NOT_RESUMABLE','Somente avanços com falha podem ser retomados.');if(game.state.turn!==old.last_committed_turn)throw new DomainError('RESUME_CONFLICT','A partida avançou após a falha. Inicie um novo lote.');this.db.prepare("UPDATE advance_requests SET status='processing' WHERE game_id=? AND request_id=?").run(id,command.requestId)}
 else this.db.prepare("INSERT INTO advance_requests(game_id,request_id,payload_json,requested_turns,last_committed_turn,status) VALUES(?,?,?,?,?,'processing')").run(id,command.requestId,payload,command.turns,game.state.turn);
 return {cached:undefined};});
 if(initial.cached)return initial.cached;
 let result:AdvanceResult;
 for(;;){
 try{result=transaction(this.db,()=>{
 const row=this.db.prepare('SELECT * FROM advance_requests WHERE game_id=? AND request_id=?').get(id,command.requestId) as any;
 const game=this.get(id);const next=advanceTurn(game.state,game.seed,game.startDate);
 this.db.prepare('UPDATE games SET current_turn=?,state_version=state_version+1,cash_cents=?,reputation=?,status=? WHERE id=?').run(next.state.turn,next.state.cashCents,next.state.reputation,next.state.status,id);
 for(const event of next.summary.events)this.db.prepare('INSERT INTO game_events VALUES(?,?,?,?,?)').run(id,event.turn,event.sequence,event.type,JSON.stringify(event));
 this.db.prepare('INSERT INTO turn_summaries VALUES(?,?,?,?)').run(id,next.state.turn,JSON.stringify(next.summary),next.summary.stateHash);
 const processed=row.processed_turns+1; const interrupted=command.stopOnImportant&&next.summary.events.some(e=>e.important)&&processed<command.turns;
 const status=interrupted?'interrupted':processed===command.turns?'completed':'processing';
 const value={requestId:command.requestId,requestedTurns:command.turns,processedTurns:processed,currentTurn:next.state.turn,stateVersion:game.stateVersion+1,status,reason:interrupted?'important_event':null};
 this.db.prepare('UPDATE advance_requests SET processed_turns=?,last_committed_turn=?,status=?,interruption_reason=?,result_json=? WHERE game_id=? AND request_id=?').run(processed,next.state.turn,status,value.reason,JSON.stringify(value),id,command.requestId);
 this.beforeCommit?.(next.state.turn);
 return value as AdvanceResult;
 });}catch(error){
 const game=this.get(id); const row=this.db.prepare('SELECT processed_turns FROM advance_requests WHERE game_id=? AND request_id=?').get(id,command.requestId) as any;
 const failed:AdvanceResult={requestId:command.requestId,requestedTurns:command.turns,processedTurns:row.processed_turns,currentTurn:game.state.turn,stateVersion:game.stateVersion,status:'failed',reason:'turn_failed'};
 this.db.prepare("UPDATE advance_requests SET status='failed',interruption_reason='turn_failed',result_json=? WHERE game_id=? AND request_id=?").run(JSON.stringify(failed),id,command.requestId);return failed;
 }
 if(result.status!=='processing')return result;
 }
 }finally{this.active.delete(id)}
 }
 resume(id:string,requestId:string,expectedVersion:number){const row=this.db.prepare('SELECT payload_json FROM advance_requests WHERE game_id=? AND request_id=?').get(id,requestId) as any;if(!row)throw new DomainError('NOT_FOUND','Avanço não encontrado.',404);return this.advance(id,{...JSON.parse(row.payload_json),expectedVersion},true)}
 timeline(id:string,offset=0,limit=30){this.get(id);return this.db.prepare('SELECT payload_json FROM game_events WHERE game_id=? ORDER BY turn DESC,sequence DESC LIMIT ? OFFSET ?').all(id,limit,offset).map((r:any)=>JSON.parse(r.payload_json))}
 summary(id:string,turn:number):Summary {this.get(id);const row=this.db.prepare('SELECT summary_json FROM turn_summaries WHERE game_id=? AND turn=?').get(id,turn) as any;if(!row)throw new DomainError('NOT_FOUND','Resumo não encontrado.',404);return JSON.parse(row.summary_json)}
 world(id:string){this.get(id);return this.db.prepare('SELECT * FROM countries WHERE game_id=? ORDER BY id').all(id).map((c:any)=>({id:c.id,name:c.name,description:c.description,regions:this.db.prepare('SELECT id,name FROM regions WHERE game_id=? AND country_id=? ORDER BY id').all(id,c.id)}))}
 ledger(id:string){this.get(id);return this.db.prepare('SELECT turn,source_id AS sourceId,amount_cents AS amountCents,entry_type AS entryType FROM financial_ledger WHERE game_id=? ORDER BY turn,source_id').all(id)}
}
