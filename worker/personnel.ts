import { z } from 'zod';
import { ApiError, type Database,type Statement,type Campaign,rowGame,mutate,getGame,projection } from './persistence.ts';
import { balance,market,emptyPersonnel,employment,availability,squadProjection,specializations,type Personnel,type Digest } from '../packages/engine/personnel.ts';
const requestId=z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const id=z.string().min(1).max(180);
const weeks=z.union([z.literal(4),z.literal(8),z.literal(12)]);
const base={requestId,expectedVersion:z.number().int().nonnegative()};
export const hireSchema=z.object({...base,candidateId:id,weeks}).strict();
export const renewSchema=z.object({...base,weeks}).strict();
export const activitySchema=z.object({...base,type:z.enum(['rest','training','recovery'])}).strict();
export const commandSchema=z.object(base).strict();
export const memberSchema=z.object({...base,operatorId:id}).strict();
export const directives=z.object({posture:z.enum(['cautious','balanced','aggressive']),priority:z.enum(['objective','team_safety','deadline']),riskTolerance:z.enum(['low','medium','high']),withdrawalPolicy:z.enum(['conservative','normal','persistent'])}).strict();
const squadFields={name:z.string().trim().min(2).max(60),specialization:z.enum(['general',...specializations]).default('general'),leaderId:id.nullable().default(null),deputyId:id.nullable().default(null),memberIds:z.array(id).max(balance.squadMax).default([]),directives:directives.default({posture:'balanced',priority:'team_safety',riskTolerance:'medium',withdrawalPolicy:'normal'})};
export const squadSchema=z.object({...base,...squadFields}).strict();
const clean=(rows:any[])=>rows.map(({game_id,...r})=>r);
export async function readPersonnel(db:Database,id:string,owner:string){
 const rows=await db.batch([
  db.prepare('SELECT * FROM online_games WHERE id=? AND owner=?').bind(id,owner),
  db.prepare('SELECT * FROM online_operators WHERE game_id=? ORDER BY id').bind(id),
  db.prepare("SELECT * FROM online_employment WHERE game_id=? AND (status='active' OR arrears_cents>0 OR rowid IN(SELECT max(rowid) FROM online_employment WHERE game_id=? GROUP BY operator_id)) ORDER BY id").bind(id,id),
  db.prepare('SELECT * FROM online_recruitment WHERE game_id=? AND week=(SELECT current_turn/28 FROM online_games WHERE id=?) ORDER BY id').bind(id,id),
  db.prepare('SELECT * FROM online_squads WHERE game_id=? ORDER BY id').bind(id),
  db.prepare('SELECT * FROM online_squad_members WHERE game_id=? AND left_turn IS NULL ORDER BY squad_id,operator_id').bind(id),
  db.prepare('SELECT * FROM online_familiarity WHERE game_id=? ORDER BY operator_low,operator_high').bind(id),
  db.prepare('SELECT * FROM online_reservations WHERE game_id=? ORDER BY operator_id').bind(id),
 ]);
 if(!rows[0].results[0])throw new ApiError(404,'NOT_FOUND','Partida não encontrada.');
 const g=rowGame(rows[0].results[0]);
 const p:Personnel={operators:clean(rows[1].results),contracts:clean(rows[2].results),candidates:clean(rows[3].results),squads:clean(rows[4].results),members:clean(rows[5].results),familiarity:clean(rows[6].results),reservations:clean(rows[7].results)};
 return {g,p};
}
// Bounded roster snapshots are small; bulk SQL avoids one D1 round trip per operator.
export function personnelWrites(db:Database,g:Campaign,p:Personnel,guard:string,args:any[],ledger:any[]=[],history:any[]=[]):Statement[]{
 function bulk(table:string,columns:string[],keys:string[],rows:any[]){
  const fields=columns.map(c=>`json_extract(value,'$.${c}')`).join(',');
  const updates=columns.filter(c=>!keys.includes(c)).map(c=>`${c}=excluded.${c}`).join(',');
  return db.prepare(`INSERT INTO ${table}(game_id,${columns.join(',')}) SELECT ?,${fields} FROM json_each(?) WHERE ${guard} ON CONFLICT(game_id,${keys.join(',')}) DO ${updates?'UPDATE SET '+updates:'NOTHING'}`).bind(g.id,JSON.stringify(rows),...args);
 }
 return [
  bulk('online_operators',['id','profile_json','health','fatigue','morale','loyalty','hired_turn'],['id'],p.operators),
  bulk('online_employment',['id','operator_id','salary_cents','start_turn','end_turn','next_pay_turn','arrears_cents','status'],['id'],p.contracts),
  bulk('online_recruitment',['id','week','profile_json','salary_cents','bonus_cents','hired'],['id'],p.candidates),
  bulk('online_squads',['id','name','specialization','leader_id','deputy_id','directives_json'],['id'],p.squads),
  db.prepare(`UPDATE online_squad_members SET left_turn=? WHERE game_id=? AND left_turn IS NULL AND operator_id NOT IN(SELECT json_extract(value,'$.operator_id') FROM json_each(?)) AND ${guard}`).bind(g.state.turn,g.id,JSON.stringify(p.members),...args),
  bulk('online_squad_members',['squad_id','operator_id','joined_version','joined_turn','left_turn'],['squad_id','operator_id','joined_version'],p.members),
  bulk('online_familiarity',['operator_low','operator_high','score'],['operator_low','operator_high'],p.familiarity),
  db.prepare(`DELETE FROM online_reservations WHERE game_id=? AND operator_id NOT IN(SELECT json_extract(value,'$.operator_id') FROM json_each(?)) AND ${guard}`).bind(g.id,JSON.stringify(p.reservations),...args),
  bulk('online_reservations',['operator_id','kind','source_id','start_turn','end_turn'],['operator_id'],p.reservations),
  ...ledger.map(e=>db.prepare(`INSERT INTO online_ledger SELECT ?,?,?,?,? WHERE ${guard}`).bind(g.id,e.sourceId,e.entryType,e.turn,e.amountCents,...args)),
  ...history.map(h=>db.prepare(`INSERT INTO online_personnel_history SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(g.id,h.id,h.turn,h.event_type,h.title,h.data_json,...args)),
 ];
}
export async function ensurePersonnel(db:Database,id:string,owner:string,digest:Digest){
 for(let i=0;i<30;i++){
  const g=await getGame(db,id,owner);if(g.personnelVersion!==balance.version)throw new ApiError(422,'PERSONNEL_RULES_MISMATCH','Regras de pessoal indisponíveis.');
  if(g.personnelInitialized)return;
  if(g.activeRequest)throw new ApiError(409,'LOCKED','Conclua ou retome o lote antes de abrir pessoal.');
  const p=emptyPersonnel();p.candidates=await market(g.seed,Math.floor(g.state.turn/28),g.state.reputation,digest);
  if(await mutate(db,g,{...g,personnelInitialized:true},(guard,args)=>personnelWrites(db,g,p,guard,args)))return;
 }throw new ApiError(409,'BUSY','Tente novamente.');
}
export function personnelProjection(g:Campaign,p:Personnel){
 const operators=p.operators.map(op=>({id:op.id,...JSON.parse(op.profile_json),health:op.health,fatigue:op.fatigue,morale:op.morale,loyalty:op.loyalty,hiredTurn:op.hired_turn,availability:availability(p,op,g.state.turn),employment:employment(p,op.id,g.state.turn)??null,lastEmployment:p.contracts.filter(c=>c.operator_id===op.id).sort((a,b)=>b.end_turn-a.end_turn)[0]??null,arrearsCents:p.contracts.filter(c=>c.operator_id===op.id).reduce((n,c)=>n+c.arrears_cents,0),reservation:p.reservations.find(r=>r.operator_id===op.id)??null}));
 return {stateVersion:g.stateVersion,currentTurn:g.state.turn,operators,candidates:p.candidates.filter(c=>!c.hired).map(c=>({id:c.id,...JSON.parse(c.profile_json),salaryCents:c.salary_cents,signingBonusCents:c.bonus_cents,expiresTurn:(c.week+1)*28})),squads:p.squads.map(s=>squadProjection(p,s,g.state.turn)),familiarity:p.familiarity,capacity:balance.operatorCapacity,employed:operators.filter(o=>o.employment).length,weeklySalaryCents:p.contracts.filter(c=>c.status==='active'&&c.start_turn<=g.state.turn&&c.end_turn>g.state.turn).reduce((n,c)=>n+c.salary_cents,0),arrearsCents:p.contracts.reduce((n,c)=>n+c.arrears_cents,0),nextMarketTurn:(Math.floor(g.state.turn/28)+1)*28};
}
function assert(condition:unknown,code:string,message:string):asserts condition{if(!condition)throw new ApiError(422,code,message);}
export async function personnelAction(db:Database,id:string,owner:string,kind:string,target:string|undefined,command:any,digest:Digest){
 await ensurePersonnel(db,id,owner,digest);
 const payload=JSON.stringify({kind,target:target??null,command});
 for(let attempt=0;attempt<30;attempt++){
  const {g,p}=await readPersonnel(db,id,owner);
  const old=await db.prepare('SELECT * FROM online_actions WHERE game_id=? AND request_id=?').bind(id,command.requestId).first();
  if(old){if(old.payload_json!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');return JSON.parse(old.result_json);}
  if(await db.prepare('SELECT request_id FROM online_commands WHERE game_id=? AND request_id=?').bind(id,command.requestId).first())throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado em outro comando.');
  if(g.activeRequest)throw new ApiError(409,'LOCKED','Existe um lote em andamento.');
  if(g.stateVersion!==command.expectedVersion)throw new ApiError(409,'VERSION_CONFLICT','A partida mudou. Atualize os dados.');
  const next={...g,state:{...g.state},stateVersion:g.stateVersion+1};const ledger:any[]=[],history:any[]=[];let entityId=target;
  const op=(operatorId:string)=>{const found=p.operators.find(o=>o.id===operatorId);assert(found,'OPERATOR_NOT_FOUND','Operador não encontrado nesta campanha.');return found;};
  const active=(operatorId:string)=>{op(operatorId);assert(employment(p,operatorId,g.state.turn),'EMPLOYMENT_REQUIRED','Operador sem vínculo ativo.');};
  if(kind==='hire'){
   const c=p.candidates.find(c=>c.id===command.candidateId&&!c.hired);assert(c,'CANDIDATE_UNAVAILABLE','Candidato indisponível ou oferta expirada.');
   assert(p.contracts.filter(c=>c.status==='active').length<balance.operatorCapacity,'CAPACITY','Capacidade administrativa atingida.');
   assert(g.state.cashCents>=c.bonus_cents,'INSUFFICIENT_CASH','Caixa insuficiente para o bônus de assinatura.');
   c.hired=1;entityId='operator-'+c.id;
   p.operators.push({id:entityId,profile_json:c.profile_json,health:balance.initialHealth,fatigue:balance.initialFatigue,morale:balance.initialMorale,loyalty:balance.initialLoyalty,hired_turn:g.state.turn});
   p.contracts.push({id:'employment-'+command.requestId,operator_id:entityId,salary_cents:c.salary_cents,start_turn:g.state.turn,end_turn:g.state.turn+command.weeks*28,next_pay_turn:g.state.turn+28,arrears_cents:0,status:'active'});
   next.state.cashCents-=c.bonus_cents;ledger.push({sourceId:'hire:'+command.requestId,entryType:'signing_bonus',turn:g.state.turn,amountCents:-c.bonus_cents});
  }else if(kind==='renew'){
   op(target!);assert(!p.contracts.some(c=>c.operator_id===target&&c.arrears_cents>0),'SALARY_ARREARS','Quite as dívidas salariais antes de renovar.');
   const existing=employment(p,target!,g.state.turn);
   if(existing)existing.end_turn+=command.weeks*28;
   else {const previous=p.contracts.filter(c=>c.operator_id===target).sort((a,b)=>b.end_turn-a.end_turn)[0];assert(previous,'EMPLOYMENT_REQUIRED','Vínculo anterior não encontrado.');
    assert(p.contracts.filter(c=>c.status==='active').length<balance.operatorCapacity,'CAPACITY','Capacidade administrativa atingida.');
    p.contracts.push({id:'employment-'+command.requestId,operator_id:target,salary_cents:previous.salary_cents,start_turn:g.state.turn,end_turn:g.state.turn+command.weeks*28,next_pay_turn:g.state.turn+28,arrears_cents:0,status:'active'});
   }
  }else if(['squad_create','squad_update','squad_member_add','squad_member_remove'].includes(kind)){
   const s=kind==='squad_create'?{id:'squad-'+command.requestId}:p.squads.find(s=>s.id===target);assert(s,'SQUAD_NOT_FOUND','Equipe não encontrada.');entityId=s.id;
   if(kind==='squad_member_add'||kind==='squad_member_remove'){
    const ids=p.members.filter(m=>m.squad_id===s.id).map(m=>m.operator_id);
    if(kind==='squad_member_remove')assert(ids.includes(command.operatorId),'MEMBER_NOT_FOUND','Operador não integra esta equipe.');
    const memberIds=kind==='squad_member_add'?[...ids,command.operatorId]:ids.filter(x=>x!==command.operatorId);
    command={...command,name:s.name,specialization:s.specialization,memberIds,leaderId:memberIds.includes(s.leader_id)?s.leader_id:null,deputyId:memberIds.includes(s.deputy_id)?s.deputy_id:null,directives:JSON.parse(s.directives_json)};
   }
   const ids=command.memberIds as string[];assert(ids.length<=balance.squadMax,'SQUAD_CAPACITY','Equipe aceita no máximo seis membros.');assert(new Set(ids).size===ids.length,'DUPLICATE_MEMBER','Operadores repetidos na equipe.');
   for(const operatorId of ids){active(operatorId);assert(!p.members.some(m=>m.operator_id===operatorId&&m.squad_id!==s.id),'ALREADY_ASSIGNED','Operador já pertence a outra equipe.');}
   assert(!command.leaderId||ids.includes(command.leaderId),'INVALID_LEADER','O líder precisa integrar a equipe.');
   assert(!command.deputyId||ids.includes(command.deputyId),'INVALID_DEPUTY','O substituto precisa integrar a equipe.');
   assert(!command.leaderId||command.leaderId!==command.deputyId,'INVALID_DEPUTY','Líder e substituto devem ser diferentes.');
   const previous=p.members.filter(m=>m.squad_id===s.id);
   Object.assign(s,{name:command.name,specialization:command.specialization,leader_id:command.leaderId,deputy_id:command.deputyId,directives_json:JSON.stringify(command.directives)});
   if(kind==='squad_create')p.squads.push(s);
   p.members=p.members.filter(m=>m.squad_id!==s.id);
   for(const operatorId of ids)p.members.push(previous.find(m=>m.operator_id===operatorId)??{squad_id:s.id,operator_id:operatorId,joined_version:next.stateVersion,joined_turn:g.state.turn,left_turn:null});
  }else if(kind==='activity'||kind==='squad_training'){
   let ids=[target!],type=command.type;
   if(kind==='squad_training'){const s=p.squads.find(s=>s.id===target);assert(s,'SQUAD_NOT_FOUND','Equipe não encontrada.');ids=p.members.filter(m=>m.squad_id===target).map(m=>m.operator_id);assert(ids.length>=2,'SQUAD_TOO_SMALL','Treino conjunto requer pelo menos dois membros.');type='training';}
   for(const operatorId of ids){active(operatorId);const o=op(operatorId);
    assert(!p.reservations.some(r=>r.operator_id===operatorId),'OPERATOR_BUSY','Operador já possui uma atividade ou missão.');
    assert(type!=='training'||(o.health>=balance.minimumHealth&&o.fatigue<balance.exhaustionFatigue),'OPERATOR_UNFIT','Operador sem condições para treinamento.');
    const c=employment(p,operatorId,g.state.turn);assert(c.end_turn>=g.state.turn+balance.activityTurns,'CONTRACT_TOO_SHORT','Renove o vínculo antes de iniciar esta atividade.');
    p.reservations.push({operator_id:operatorId,kind:type,source_id:command.requestId,start_turn:g.state.turn,end_turn:g.state.turn+balance.activityTurns});
   }
  }else throw new ApiError(404,'NOT_FOUND','Comando não encontrado.');
  const actionResult={...projection(next),action:kind,operatorId:kind==='hire'||kind==='renew'||kind==='activity'?entityId:undefined,squadId:kind.startsWith('squad_')?entityId:undefined};
  history.push({id:'action:'+command.requestId,turn:g.state.turn,event_type:kind,title:kind==='hire'?'Operador contratado':kind==='renew'?'Vínculo renovado':kind.startsWith('squad_')?'Equipe atualizada':'Atividade iniciada',data_json:JSON.stringify({operatorId:actionResult.operatorId,squadId:actionResult.squadId,command})});
  if(await mutate(db,g,next,(guard,args)=>[
   ...personnelWrites(db,g,p,guard,args,ledger,history),
   db.prepare(`INSERT INTO online_actions SELECT ?,?,?,? WHERE ${guard}`).bind(id,command.requestId,payload,JSON.stringify(actionResult),...args),
  ]))return actionResult;
 }
 throw new ApiError(409,'BUSY','Concorrência elevada. Tente novamente com a mesma requisição.');
}
