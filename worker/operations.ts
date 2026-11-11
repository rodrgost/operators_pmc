import {readIntelligence,intelligenceWrites} from './intelligence.ts';
import {dossier,type Intelligence} from '../packages/engine/intelligence.ts';
import {readLogistics,logisticsWrites,equipmentPlan,logisticsView} from './logistics.ts';
import {moduleCapacity,config as logisticsConfig,type Logistics} from '../packages/engine/logistics.ts';
import {z} from 'zod';
import {countries,organizations} from '../packages/rules/index.ts';
import {type Database,type Statement,type Campaign,ApiError,mutate,getGame,projection} from './persistence.ts';
import {ensurePersonnel,readPersonnel,personnelWrites,directives,commandSchema} from './personnel.ts';
import {availability,employment,type Personnel,type Digest} from '../packages/engine/personnel.ts';
import {config,contractDeadline,mobilizationTurns,offers,emptyOperations,liveStatuses,type Operations} from '../packages/engine/operations.ts';
const id=z.string().min(1).max(180);
export const planSchema=z.object({squadId:id,memberIds:z.array(id).min(2).max(6),reinforcementIds:z.array(id).max(config.maxReinforcements).default([]),leaderId:id.optional(),deputyId:id.nullable().optional(),directives:directives.optional(),equipmentIds:z.array(id).max(12).default([])}).strict();
export const startSchema=planSchema.extend(commandSchema.shape).strict();
export const decisionSchema=commandSchema.extend({choice:z.enum(['proceed','safer','withdraw'])}).strict();
const clean=(rows:any[])=>rows.map(({game_id,...r})=>r);
export async function readOperations(db:Database,gameId:string):Promise<Operations>{
 if(db.planning)return db.planning.o;
 const rows=await db.batch([
  db.prepare("SELECT * FROM online_contracts WHERE game_id=? AND (expires_turn>(SELECT current_turn FROM online_games WHERE id=?) OR status IN ('accepted','active','rival_active') OR id IN (SELECT target_id FROM online_intel_analyses WHERE game_id=? AND target_type='contract' AND status='pending')) ORDER BY id").bind(gameId,gameId,gameId),
  db.prepare("SELECT * FROM online_missions WHERE game_id=? AND status IN ('active','awaiting_decision','returning') ORDER BY id").bind(gameId),
  db.prepare("SELECT a.* FROM online_mission_assignments a JOIN online_missions m ON m.game_id=a.game_id AND m.id=a.mission_id WHERE a.game_id=? AND m.status IN ('active','awaiting_decision','returning') ORDER BY a.mission_id,a.operator_id").bind(gameId),
  db.prepare("SELECT d.* FROM online_decisions d JOIN online_missions m ON m.game_id=d.game_id AND m.id=d.mission_id WHERE d.game_id=? AND m.status IN ('active','awaiting_decision','returning') ORDER BY d.id").bind(gameId),
 ]);return {contracts:clean(rows[0].results),missions:clean(rows[1].results),assignments:clean(rows[2].results),decisions:clean(rows[3].results)};
}
export function operationsWrites(db:Database,g:Campaign,o:Operations,guard:string,args:any[],reports:any[]=[]){
 function bulk(table:string,columns:string[],keys:string[],rows:any[],immutable=false){
  const updates=columns.filter(c=>!keys.includes(c)).map(c=>`${c}=excluded.${c}`).join(',');
  return db.prepare(`INSERT INTO ${table}(game_id,${columns.join(',')}) SELECT ?,${columns.map(c=>`json_extract(value,'$.${c}')`).join(',')} FROM json_each(?) WHERE ${guard} ON CONFLICT(game_id,${keys.join(',')}) DO ${immutable?'NOTHING':'UPDATE SET '+updates}`).bind(g.id,JSON.stringify(rows),...args);
 }
 return [
  bulk('online_contracts',['id','type','title','region_id','client_id','source','origin_event_id','offered_turn','expires_turn','difficulty','risk','intel_json','reward_cents','minimum_operators','status'],['id'],o.contracts),
  bulk('online_missions',['id','contract_id','squad_id','leader_id','deputy_id','directives_json','status','started_turn','ended_turn','stage_index','stage_due_turn','delays','success_points','completed_stages','advance_cents','paid_cents'],['id'],o.missions),
  bulk('online_mission_assignments',['mission_id','operator_id','assignment_type','role','snapshot_json'],['mission_id','operator_id'],o.assignments,true),
  bulk('online_decisions',['id','mission_id','stage_index','created_turn','expires_turn','fallback_action','chosen_action','resolved_turn','status'],['id'],o.decisions),
  bulk('online_mission_reports',['id','mission_id','turn','summary_json','audit_json'],['id'],reports,true),
 ];
}
export async function ensureOperations(db:Database,id:string,owner:string,digest:Digest){
 await ensurePersonnel(db,id,owner,digest);
 for(let i=0;i<30;i++){
  const g=await getGame(db,id,owner);if(g.operationsVersion!==config.version)throw new ApiError(422,'OPERATIONS_RULES_MISMATCH','Regras de operações indisponíveis.');
  if(g.operationsInitialized)return;
  if(g.activeRequest)throw new ApiError(409,'LOCKED','Conclua o lote antes de abrir os contratos.');
  const o=emptyOperations();o.contracts=await offers(g.seed,Math.floor(g.state.turn/28),digest,g.difficultyProfile);
  if(await mutate(db,g,{...g,operationsInitialized:true},(guard,args)=>operationsWrites(db,g,o,guard,args)))return;
 }throw new ApiError(409,'BUSY','Tente novamente.');
}
const assert=(condition:unknown,code:string,message:string)=>{if(!condition)throw new ApiError(422,code,message)};
export function contractProjection(c:any,logisticsEnabled=false,knowledge?:any){const intel=JSON.parse(c.intel_json);const country=countries.find(x=>c.region_id.startsWith(x.id+'-'));const regionName=country?.regions[Number(c.region_id.split('-').at(-1))]??c.region_id;return {countryName:country?.name??'',regionName,clientName:organizations.find(x=>x.id===c.client_id)?.name??c.client_id,id:c.id,type:c.type,title:c.title,briefing:intel.narrative?.briefing??null,objective:intel.narrative?.objective??null,context:intel.narrative?.context??null,catalogVersion:intel.narrative?.catalogVersion??null,regionId:c.region_id,clientId:c.client_id,source:c.source,originEventId:c.origin_event_id,status:c.status,expiresTurn:c.expires_turn,acceptedTurn:intel.acceptedTurn??null,mobilizationDueTurn:c.status==='accepted'?contractDeadline(c):null,mobilizationTurns,rewardCents:c.reward_cents,advanceCents:Math.round(c.reward_cents*config.advanceRate),minimumOperators:c.minimum_operators,mobilizationPerOperatorCents:config.mobilizationPerOperatorCents,requiredEquipment:logisticsEnabled?(logisticsConfig.requirements as any)[c.type]:[],stages:config.stages,intelligence:knowledge??null,estimatedDifficulty:knowledge?(knowledge.topics.difficulty.estimate??{min:0,max:100}):intel.estimatedDifficulty,estimatedRisk:knowledge?(knowledge.topics.risk.estimate??{min:0,max:100}):intel.estimatedRisk,confidence:knowledge?knowledge.topics.risk.confidence:intel.confidence,intelSource:knowledge?knowledge.topics.risk.sourceName:intel.source,collectedTurn:knowledge?knowledge.topics.risk.collectedTurn:intel.collectedTurn};}
export function decisionProjection(d:any){return {id:d.id,missionId:d.mission_id,stageIndex:d.stage_index,createdTurn:d.created_turn,expiresTurn:d.expires_turn,fallbackAction:d.fallback_action,chosenAction:d.chosen_action,resolvedTurn:d.resolved_turn,status:d.status,options:[{id:'proceed',label:'Prosseguir',consequence:'Mantém as diretrizes e a exposição atual.'},{id:'safer',label:'Reduzir exposição',consequence:'Abordagem cautelosa, com menor capacidade ofensiva.'},{id:'withdraw',label:'Retirar equipe',consequence:'Retorno em um turno, devolução do adiantamento e perda de reputação.'}]};}
export function missionProjection(m:any,assignments:any[]=[]){return {id:m.id,contractTitle:m.contract_title??null,contractId:m.contract_id,squadId:m.squad_id,leaderId:m.leader_id,deputyId:m.deputy_id,status:m.status,startedTurn:m.started_turn,endedTurn:m.ended_turn,stageIndex:m.stage_index,stageName:config.stages[m.stage_index]??'Finalizada',stageDueTurn:m.stage_due_turn,totalStages:config.stages.length,completedStages:m.completed_stages,directives:JSON.parse(m.directives_json),advanceCents:m.advance_cents,paidCents:m.paid_cents,crew:assignments.filter(a=>a.mission_id===m.id).map(a=>({operatorId:a.operator_id,name:JSON.parse(a.snapshot_json).name,assignmentType:a.assignment_type,role:a.role}))};}
export function validatePlan(g:Campaign,p:Personnel,o:Operations,c:any,command:any,logistics?:Logistics,intelligence?:Intelligence){
 assert(c?.status==='accepted','CONTRACT_NOT_ACCEPTED','Aceite o contrato antes de iniciar ou planejar.');assert(contractDeadline(c)>g.state.turn,'CONTRACT_EXPIRED','O prazo de mobilização terminou.');
 const squad=p.squads.find(s=>s.id===command.squadId);assert(squad,'SQUAD_NOT_FOUND','Equipe não encontrada.');
 const ids=[...command.memberIds,...command.reinforcementIds];assert(new Set(ids).size===ids.length,'DUPLICATE_OPERATOR','Não repita operadores na formação.');assert(ids.length<=config.maxMembers,'FORMATION_TOO_LARGE','Formação acima do limite.');
 assert(command.memberIds.every((id:string)=>p.members.some(m=>m.squad_id===squad.id&&m.operator_id===id)),'INVALID_MEMBER','Membros permanentes devem integrar a equipe selecionada.');
 assert(ids.length>=c.minimum_operators,'FORMATION_TOO_SMALL','Formação insuficiente para o contrato.');assert(o.missions.filter(m=>liveStatuses.includes(m.status)).length<(logistics?moduleCapacity(logistics,'operations'):config.capacity),'OPERATIONS_CAPACITY','Não há vaga de operação simultânea.');
 const crew=ids.map((id:string)=>{const op=p.operators.find(o=>o.id===id);assert(op&&availability(p,op,g.state.turn)==='available','OPERATOR_UNAVAILABLE','Um operador está sem vínculo, inapto ou reservado.');assert(employment(p,id,g.state.turn)?.end_turn>=g.state.turn+config.maxMissionTurns,'CONTRACT_TOO_SHORT','Renove o vínculo para cobrir a duração máxima da missão.');return op;});
 const apt=(id:string)=>ids.includes(id)&&crew.some((op:any)=>op.id===id);
 const leader=command.leaderId??(apt(squad.leader_id)?squad.leader_id:apt(squad.deputy_id)?squad.deputy_id:null);assert(leader&&apt(leader),'INVALID_LEADER','Selecione um líder apto presente na formação.');
 const deputy=command.deputyId===undefined?squad.deputy_id:command.deputyId;assert(!deputy||(apt(deputy)&&deputy!==leader),'INVALID_DEPUTY','Substituto deve estar presente e ser diferente do líder.');
 const cost=ids.length*config.mobilizationPerOperatorCents;assert(g.state.cashCents>=cost,'INSUFFICIENT_CASH','Caixa insuficiente para mobilização.');
 const equipment=logistics?equipmentPlan(logistics,c.type,command.equipmentIds??[]):null;
 const knowledge=intelligence?dossier(intelligence,'contract',c.id,g.state.turn):null;
 return {intelligence:knowledge,intelligenceAdvice:knowledge?(knowledge.topics.risk.stale||knowledge.topics.risk.conflicting?'Informação obsoleta ou conflitante: considere análise, reconhecimento e diretrizes cautelosas.':knowledge.topics.risk.estimate?.max>60?'Exposição estimada elevada: revise especialistas, kits e política de retirada.':'Compare as fontes e a validade antes de enviar a equipe.'):'',equipmentIds:equipment?.kits.map(k=>k.id)??[],load:equipment?.load??0,loadCapacity:equipment?.loadCapacity??0,squadId:squad.id,leaderId:leader,deputyId:deputy??null,directives:command.directives??JSON.parse(squad.directives_json),operatorIds:ids,mobilizationCents:cost,advanceCents:Math.round(c.reward_cents*config.advanceRate),maxTurns:config.maxMissionTurns,cashBeforeCents:g.state.cashCents,cashAfterCents:g.state.cashCents-cost+Math.round(c.reward_cents*config.advanceRate),requiredEquipment:equipment?.requiredEquipment??[]};
}
export async function operationAction(db:Database,id:string,owner:string,kind:string,target:string,command:any,digest:Digest){
 await ensureOperations(db,id,owner,digest);const payload=JSON.stringify({kind,target,command});
 for(let i=0;i<30;i++){
  const {g,p}=await readPersonnel(db,id,owner),o=await readOperations(db,id),logistics=g.logisticsInitialized?await readLogistics(db,id):undefined,intelligence=g.intelligenceInitialized?await readIntelligence(db,g):undefined;
  const old=await db.prepare('SELECT * FROM online_actions WHERE game_id=? AND request_id=?').bind(id,command.requestId).first();
  if(old){if(old.payload_json!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador reutilizado com outros dados.');return JSON.parse(old.result_json);}
  if(await db.prepare('SELECT request_id FROM online_commands WHERE game_id=? AND request_id=?').bind(id,command.requestId).first())throw new ApiError(409,'REQUEST_REUSED','Identificador utilizado em outro comando.');
  if(g.activeRequest)throw new ApiError(409,'LOCKED','Existe um lote em processamento.');if(command.expectedVersion!==g.stateVersion)throw new ApiError(409,'VERSION_CONFLICT','A partida mudou. Atualize os dados.');
  const next={...g,state:{...g.state},stateVersion:g.stateVersion+1},ledger:any[]=[],history:any[]=[];let missionId:string|undefined;
  if(['accept','cancel','start'].includes(kind)){
   const c=o.contracts.find(c=>c.id===target);assert(c,'CONTRACT_NOT_FOUND','Contrato não encontrado ou expirado.');
   if(kind==='accept'){assert(c.status==='available'&&c.expires_turn>g.state.turn,'CONTRACT_UNAVAILABLE','Oferta indisponível.');c.status='accepted';c.intel_json=JSON.stringify({...JSON.parse(c.intel_json),acceptedTurn:g.state.turn,mobilizationDueTurn:g.state.turn+mobilizationTurns});}
   if(kind==='cancel'){assert(c.status==='accepted','NOT_CANCELLABLE','Somente contratos aceitos e não iniciados podem ser cancelados.');c.status='cancelled';}
   if(kind==='start'){
    const plan=validatePlan(g,p,o,c,command,logistics,intelligence);missionId='mission-'+command.requestId;
    o.missions.push({id:missionId,contract_id:c.id,squad_id:plan.squadId,leader_id:plan.leaderId,deputy_id:plan.deputyId,directives_json:JSON.stringify(plan.directives),status:'active',started_turn:g.state.turn,ended_turn:null,stage_index:0,stage_due_turn:g.state.turn+1,delays:0,success_points:0,completed_stages:0,advance_cents:plan.advanceCents,paid_cents:plan.advanceCents});
    for(const operatorId of plan.operatorIds){const op=p.operators.find(o=>o.id===operatorId);o.assignments.push({mission_id:missionId,operator_id:operatorId,assignment_type:command.reinforcementIds.includes(operatorId)?'reinforcement':'permanent',role:operatorId===plan.leaderId?'leader':operatorId===plan.deputyId?'deputy':'member',snapshot_json:JSON.stringify({...JSON.parse(op.profile_json),health:op.health,fatigue:op.fatigue,morale:op.morale,loyalty:op.loyalty})});p.reservations.push({operator_id:operatorId,kind:'mission',source_id:missionId,start_turn:g.state.turn,end_turn:g.state.turn+config.maxMissionTurns});}
    if(logistics)for(const kitId of plan.equipmentIds){const k=logistics.equipment.find(k=>k.id===kitId)!;logistics.assignments.push({mission_id:missionId,equipment_id:k.id,snapshot_json:JSON.stringify({catalogId:k.catalog_id,condition:k.condition,supplies:k.supplies}),status:'assigned',returned_turn:null});k.status='reserved';k.mission_id=missionId;}
    if(intelligence)intelligence.snapshots.push({mission_id:missionId,snapshot_json:JSON.stringify({collectedTurn:g.state.turn,contract:plan.intelligence,region:dossier(intelligence,'region',c.region_id,g.state.turn)})});
    c.status='active';next.state.cashCents+=plan.advanceCents-plan.mobilizationCents;
    ledger.push({sourceId:'mission:'+missionId+':mobilization',entryType:'mission_mobilization',turn:g.state.turn,amountCents:-plan.mobilizationCents},{sourceId:'mission:'+missionId+':advance',entryType:'mission_advance',turn:g.state.turn,amountCents:plan.advanceCents});
   }
  }else if(kind==='withdraw'){
   const m=o.missions.find(m=>m.id===target);assert(m&&['active','awaiting_decision'].includes(m.status),'NOT_WITHDRAWABLE','Missão não pode ser retirada neste estado.');m.status='returning';m.stage_due_turn=g.state.turn+1;missionId=m.id;
   for(const d of o.decisions.filter(d=>d.mission_id===m.id&&d.status==='pending')){d.status='cancelled';d.chosen_action='withdraw';d.resolved_turn=g.state.turn;}
  }else if(kind==='decision'){
   const d=o.decisions.find(d=>d.id===target);assert(d&&d.status==='pending'&&d.expires_turn>g.state.turn,'DECISION_UNAVAILABLE','Decisão resolvida ou vencida.');
   d.status='resolved';d.chosen_action=command.choice;d.resolved_turn=g.state.turn;const m=o.missions.find(m=>m.id===d.mission_id)!;m.status=command.choice==='withdraw'?'returning':'active';m.stage_due_turn=g.state.turn+1;missionId=m.id;
  }
  const response={...projection(next),action:kind,contractId:['accept','cancel','start'].includes(kind)?target:undefined,missionId,decisionId:kind==='decision'?target:undefined};
  history.push({id:'action:'+command.requestId,turn:g.state.turn,event_type:'operation_'+kind,title:'Comando de operação confirmado',data_json:JSON.stringify({kind,target,missionId})});
  if(await mutate(db,g,next,(guard,args)=>[...personnelWrites(db,g,p,guard,args,ledger,history),...operationsWrites(db,g,o,guard,args),...(logistics?logisticsWrites(db,g,logistics,guard,args):[]),...(intelligence?intelligenceWrites(db,g,intelligence,guard,args):[]),db.prepare(`INSERT INTO online_actions SELECT ?,?,?,? WHERE ${guard}`).bind(id,command.requestId,payload,JSON.stringify(response),...args)]))return response;
 }throw new ApiError(409,'BUSY','Tente novamente com o mesmo comando.');
}
export async function operationsView(db:Database,g:Campaign){
 const rows=await db.batch([
  db.prepare("SELECT * FROM online_contracts WHERE game_id=? AND (expires_turn>? OR status IN ('accepted','active','rival_active')) ORDER BY offered_turn DESC,id LIMIT 50").bind(g.id,g.state.turn),
  db.prepare('SELECT m.*,(SELECT title FROM online_contracts c WHERE c.game_id=m.game_id AND c.id=m.contract_id) AS contract_title FROM online_missions m WHERE m.game_id=? ORDER BY m.started_turn DESC,m.rowid DESC LIMIT 30').bind(g.id),
  db.prepare("SELECT * FROM online_decisions WHERE game_id=? AND status='pending' ORDER BY expires_turn,id LIMIT 30").bind(g.id),
  db.prepare('SELECT a.* FROM online_mission_assignments a WHERE a.game_id=? AND a.mission_id IN(SELECT id FROM online_missions WHERE game_id=? ORDER BY started_turn DESC,rowid DESC LIMIT 30) ORDER BY operator_id').bind(g.id,g.id),
 ]);
 const logistics=g.logisticsInitialized?await readLogistics(db,g.id):undefined,intelligence=g.intelligenceInitialized?await readIntelligence(db,g):undefined;const logisticsData=logistics?logisticsView(g,logistics):null;
 return {logistics:logisticsData,stateVersion:g.stateVersion,currentTurn:g.state.turn,capacity:logistics?moduleCapacity(logistics,'operations'):config.capacity,contracts:rows[0].results.map(c=>contractProjection(c,!!logistics,intelligence?dossier(intelligence,'contract',c.id,g.state.turn):undefined)),missions:rows[1].results.map(m=>missionProjection(m,rows[3].results)),decisions:rows[2].results.map(decisionProjection),logisticsNote:logistics?'Selecione kits obrigatórios, em condição e suprimentos suficientes. Reserva somente ao iniciar.':'Abra Sede e logística para ativar equipamentos e infraestrutura nesta campanha.'};
}
