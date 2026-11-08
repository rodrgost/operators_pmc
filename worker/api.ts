import {ensureLogistics,readLogistics,logisticsWrites,logisticsView,logisticsAction,purchaseSchema} from './logistics.ts';
import {logisticsStart,facilityTurn,facilitiesFinance,logisticsCanonical,config as logisticsConfig} from '../packages/engine/logistics.ts';
import {ensureWorld,readWorld,worldWrites,worldRoute} from './world.ts';
import {worldTurn,applyMissionResults,publishWorldContracts,refreshIntel,worldCanonical,worldNotifications,config as worldConfig} from '../packages/engine/world.ts';
import { createGameSchema, advanceSchema, resumeSchema, paginationSchema } from '../packages/contracts/index.ts';
import { countries, RULES_VERSION } from '../packages/rules/index.ts';
import { ZodError } from 'zod';
import {operationsTurn,opsCanonical,config as opsConfig} from '../packages/engine/operations.ts';
import {ensureOperations,readOperations,operationsWrites,operationsView,operationAction,validatePlan,contractProjection,missionProjection,decisionProjection,planSchema,startSchema,decisionSchema} from './operations.ts';
import { canonical,personnelTurn,balance } from '../packages/engine/personnel.ts';
import { ensurePersonnel,readPersonnel,personnelProjection,personnelAction,personnelWrites,hireSchema,renewSchema,squadSchema,activitySchema,commandSchema,memberSchema } from './personnel.ts';
import { drawInput, stateInput, drawFromHash, resolveTurn } from '../packages/engine/core.ts';
import { ApiError, type Database, type Command, getGame,listGames,createGame,snapshot,projection,result,register,commitTurn,failCommand,timeline,turnSummary,financialLedger } from './persistence.ts';
export type { Database } from './persistence.ts';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function digest(value:unknown){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('')}
function conflict():never{throw new ApiError(409,'VERSION_CONFLICT','A partida mudou. Atualize a tela antes de continuar.')}
function busy():never{throw new ApiError(409,'BUSY','Concorrência elevada. Tente novamente com a mesma requisição.')}
async function failAdvance(db:Database,owner:string,id:string,requestId:string,reason:string){
 for(let i=0;i<100;i++){
  const {g,entry}=await snapshot(db,id,owner,requestId);
  if(!entry)throw new ApiError(404,'NOT_FOUND','Avanço não encontrado.');
  if(entry.result.status!=='processing')return entry.result;
  if(await failCommand(db,g,entry,reason))return result(g,entry,'failed',reason);
 }return busy();
}
async function advance(db:Database,owner:string,id:string,command:any,resume=false){
 const payload=JSON.stringify(command);let registered=false;
 for(let i=0;i<100;i++){
  const {g,entry}=await snapshot(db,id,owner,command.requestId);
  if(g.rulesVersion!==RULES_VERSION)throw new ApiError(422,'RULES_MISMATCH','Versão de regras indisponível.');
  if(entry&&!resume){
   if(entry.payload!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');
   if(entry.result.status!=='processing')return entry.result;
   registered=true;break;
  }
  if(await db.prepare('SELECT request_id FROM online_actions WHERE game_id=? AND request_id=?').bind(id,command.requestId).first())throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado em outro comando.');
  if(g.stateVersion!==command.expectedVersion)conflict();
  if(g.activeRequest&&g.activeRequest!==command.requestId)throw new ApiError(409,'LOCKED','Existe um lote em andamento.');
  if(resume){
   if(!entry||entry.result.status!=='failed')throw new ApiError(409,'NOT_RESUMABLE','Somente avanços com falha podem ser retomados.');
   if(entry.result.currentTurn!==g.state.turn)conflict();
  }
  const pending:Command=entry??{command,payload,processed:0,result:null as any};
  if(await register(db,g,pending,resume)){registered=true;break;}
 }
 if(!registered)return busy();
 for(let i=0;i<100;i++){
  const {g,entry}=await snapshot(db,id,owner,command.requestId);
  if(!entry)throw new ApiError(404,'NOT_FOUND','Avanço não encontrado.');
  if(entry.result.status!=='processing')return entry.result;
  try{
   const nextState={...g.state,turn:g.state.turn+1};
   const [randomHash,hash]=await Promise.all([digest(drawInput(g.seed,nextState.turn,'bulletin','world','country')),digest(stateInput(nextState))]);
   const next=resolveTurn(g.state,g.startDate,drawFromHash(randomHash),hash);
   let effects:any=null,opEffects:any=null,worldEffects:any=null,logistics:any=null,logisticsEvents:any[]=[],logisticsLedger:any[]=[];
   if(g.logisticsInitialized){if(g.logisticsVersion!==logisticsConfig.version)throw new ApiError(422,'LOGISTICS_RULES_MISMATCH','Regras de logística indisponíveis.');logistics=await readLogistics(db,id);logisticsEvents=logisticsStart(logistics,next.state.turn);}
   if(g.personnelInitialized){
    if(g.personnelVersion!==balance.version)throw new ApiError(422,'PERSONNEL_RULES_MISMATCH','Regras de pessoal indisponíveis.');
    const {p}=await readPersonnel(db,id,owner);
    let turnPersonnel=p;
    if(g.operationsInitialized){
     if(g.operationsVersion!==opsConfig.version)throw new ApiError(422,'OPERATIONS_RULES_MISMATCH','Regras de operações indisponíveis.');
     let operations=await readOperations(db,id);
     if(g.worldInitialized){if(g.worldVersion!==worldConfig.version)throw new ApiError(422,'WORLD_RULES_MISMATCH','Regras mundiais indisponíveis.');const resolved=await worldTurn(await readWorld(db,id),operations,next.state.turn,g.seed,digest);worldEffects=resolved.world;operations=resolved.operations;}
     opEffects=await operationsTurn(operations,p,next.state.turn,next.state.cashCents,next.state.reputation,g.seed,digest,logistics??undefined);
     if(worldEffects)applyMissionResults(worldEffects,opEffects.operations,next.state.turn);
     turnPersonnel=opEffects.personnel;next.state.cashCents=opEffects.cash;next.state.reputation=opEffects.reputation;
    }
    const managed=logistics?facilityTurn(logistics,turnPersonnel,next.state.turn):[];
    effects=await personnelTurn(turnPersonnel,next.state.turn,next.state.cashCents,g.seed,next.state.reputation,digest,managed);
    next.state.cashCents=effects.cash;
    if(logistics){const finance=facilitiesFinance(logistics,next.state.turn,next.state.cashCents);next.state.cashCents=finance.cash;logisticsLedger=finance.ledger;logisticsEvents.push(...finance.events);}
    next.state.status=next.state.cashCents<0||logistics?.headquarters.arrears_cents>0?'financial_crisis':effects.status;
    if(worldEffects){await publishWorldContracts(worldEffects,opEffects.operations,g.seed,next.state.turn,digest);await refreshIntel(worldEffects,g.seed,next.state.turn,digest);next.summary.events=next.summary.events.filter(e=>e.type!=='public_bulletin');}
    const weekly=next.summary.events.find(e=>e.type==='weekly_close');if(weekly)weekly.description='Semana encerrada. Consulte os pagamentos e vínculos no livro-razão.';
    for(const e of [...logisticsEvents,...(worldEffects?worldNotifications(worldEffects,next.state.turn):[]),...(opEffects?.events??[]),...effects.events])next.summary.events.push({...e,turn:next.state.turn,sequence:next.summary.events.length});
    next.summary.events.forEach((e,i)=>e.sequence=i);
    next.summary.stateHash=await digest([stateInput(next.state),balance.version,canonical(effects.personnel),...(opEffects?[opsConfig.version,opsCanonical(opEffects.operations)]:[]),...(worldEffects?[worldConfig.version,worldCanonical(worldEffects)]:[]),...(logistics?[logisticsConfig.version,logisticsCanonical(logistics)]:[])]);
   }
   const processed=entry.processed+1;
   const important=entry.command.stopOnImportant&&next.summary.events.some(e=>e.important)&&processed<entry.command.turns;
   const status=opEffects?.critical?'interrupted':important?'interrupted':processed===entry.command.turns?'completed':'processing';
   const reason=opEffects?.critical?'critical_decision':important?'important_event':null;
   if(!await commitTurn(db,g,entry,next.summary,next.state,status,reason,effects?(guard,args)=>personnelWrites(db,g,effects.personnel,guard,args,[...(opEffects?.ledger??[]),...effects.ledger,...logisticsLedger],[...(opEffects?.history??[]),...effects.history]).concat(opEffects?operationsWrites(db,g,opEffects.operations,guard,args,opEffects.reports):[]).concat(worldEffects?worldWrites(db,g,worldEffects,guard,args):[]).concat(logistics?logisticsWrites(db,g,logistics,guard,args):[]):undefined))continue;
   if(status!=='processing')return result({...g,state:next.state,stateVersion:g.stateVersion+1},{...entry,processed},status,reason);
  }catch(error){return failAdvance(db,owner,id,command.requestId,error instanceof ApiError?error.code:'turn_failed');}
 }return busy();
}
export async function handleApi(request:Request,env:{DB:Database}){
 try{
  const url=new URL(request.url),owner=request.headers.get('oai-authenticated-user-id');
  if(!owner)return json({code:'UNAUTHORIZED',message:'Entre com sua conta ChatGPT para continuar.'},401);
  if(!env.DB)throw new ApiError(503,'STORAGE_UNAVAILABLE','Salvamento temporariamente indisponível.');
  const db=env.DB.withSession?.('first-primary')??env.DB;
  if(request.method!=='GET'){
   const origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new ApiError(403,'ORIGIN_DENIED','Origem não autorizada.');
   if(Number(request.headers.get('content-length')||0)>16384)throw new ApiError(413,'TOO_LARGE','Requisição muito grande.');
  }
  const path=url.pathname.replace(/^\/api\/v1\/?/,'').split('/');
  if(path[0]==='health')return json({status:'ok',phase:'logistics-online',rulesVersion:RULES_VERSION});
  if(path[0]!=='games')throw new ApiError(404,'NOT_FOUND','Rota não encontrada.');
  if(!path[1]){
   if(request.method==='GET')return json(await listGames(db,owner));
   if(request.method==='POST'){
    const command=createGameSchema.parse(await request.json());return json(await createGame(db,await digest([owner,command.requestId]),owner,command),201);
   }
  }
  const id=path[1],g=await getGame(db,id,owner);
  if(path.length===2&&request.method==='GET')return json(projection(g));
  if(path[2]==='world'&&request.method==='GET'){await ensureWorld(db,id,owner,digest);const current=await getGame(db,id,owner);const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));return json(await worldRoute(db,current,path,url,offset,limit));}
  if(['logistics','equipment','headquarters'].includes(path[2])){
   await ensureLogistics(db,id,owner,digest);const current=await getGame(db,id,owner);
   if(request.method==='GET'){const view=logisticsView(current,await readLogistics(db,id));if(path[2]==='equipment'&&path[3]==='catalog')return json(view.catalog);if(path[2]==='equipment'&&path[3]==='inventory')return json(view.inventory);if(path[2]==='logistics'||path[2]==='headquarters')return json(view);}
   if(request.method==='POST'){const body=await request.json();if(path[2]==='equipment'&&path[3]==='purchases')return json(await logisticsAction(db,id,owner,'purchase','',purchaseSchema.parse(body),digest),201);if(path[2]==='equipment'&&['maintenance','resupply'].includes(path[4]))return json(await logisticsAction(db,id,owner,path[4],path[3],commandSchema.parse(body),digest));if(path[2]==='headquarters'&&path[3]==='modules'&&path[5]==='upgrade')return json(await logisticsAction(db,id,owner,'upgrade',path[4],commandSchema.parse(body),digest));}
  }
  if(['contracts','missions','decisions','operations'].includes(path[2])){
   await ensureOperations(db,id,owner,digest);const current=await getGame(db,id,owner);
   if(request.method==='GET'){
    if(path[2]==='operations')return json(await operationsView(db,current));
    if(path[2]==='contracts'){
     if(!path[3]){const view=await operationsView(db,current);const status=url.searchParams.get('status'),type=url.searchParams.get('type'),region=url.searchParams.get('region');return json(view.contracts.filter(c=>(!status||c.status===status)&&(!type||c.type===type)&&(!region||c.regionId===region)));}
     const c=await db.prepare('SELECT * FROM online_contracts WHERE game_id=? AND id=?').bind(id,path[3]).first();if(!c)throw new ApiError(404,'NOT_FOUND','Contrato não encontrado.');return json(contractProjection(c,current.logisticsInitialized));
    }
    if(path[2]==='decisions')return json((await operationsView(db,current)).decisions);
    if(path[2]==='missions'){
     if(!path[3])return json((await operationsView(db,current)).missions);
     const m=await db.prepare('SELECT * FROM online_missions WHERE game_id=? AND id=?').bind(id,path[3]).first();if(!m)throw new ApiError(404,'NOT_FOUND','Missão não encontrada.');
     if(path[4]==='reports'){const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));const r=await db.prepare('SELECT id,turn,summary_json FROM online_mission_reports WHERE game_id=? AND mission_id=? ORDER BY turn,id LIMIT ? OFFSET ?').bind(id,m.id,limit,offset).all();return json(r.results.map(r=>({id:r.id,turn:r.turn,...JSON.parse(r.summary_json)})));}
     const a=await db.prepare('SELECT * FROM online_mission_assignments WHERE game_id=? AND mission_id=? ORDER BY operator_id').bind(id,m.id).all();return json(missionProjection(m,a.results));
    }
   }
   if(request.method==='POST'){
    const body=await request.json();
    if(path[2]==='contracts'&&path[4]==='plan'){
     const {g:latest,p}=await readPersonnel(db,id,owner),o=await readOperations(db,id),c=o.contracts.find(c=>c.id===path[3]);const plan=validatePlan(latest,p,o,c,planSchema.parse(body),latest.logisticsInitialized?await readLogistics(db,id):undefined);return json({...plan,stateVersion:latest.stateVersion});
    }
    if(path[2]==='contracts'&&['accept','cancel'].includes(path[4]))return json(await operationAction(db,id,owner,path[4],path[3],commandSchema.parse(body),digest));
    if(path[2]==='contracts'&&path[4]==='start')return json(await operationAction(db,id,owner,'start',path[3],startSchema.parse(body),digest),201);
    if(path[2]==='missions'&&path[4]==='withdraw')return json(await operationAction(db,id,owner,'withdraw',path[3],commandSchema.parse(body),digest));
    if(path[2]==='decisions'&&path[4]==='resolve')return json(await operationAction(db,id,owner,'decision',path[3],decisionSchema.parse(body),digest));
   }
  }

  if(['personnel','operators','recruitment','squads'].includes(path[2])||(path[2]==='finances'&&path[3]==='summary')){
   await ensurePersonnel(db,id,owner,digest);
   if(request.method==='GET'){
    const {g:current,p}=await readPersonnel(db,id,owner);const view=personnelProjection(current,p,current.logisticsInitialized?await readLogistics(db,id):undefined);
    if(path[2]==='personnel'||(path[2]==='finances'&&path[3]==='summary'))return json(view);
    if(path[2]==='recruitment'&&path[3]==='candidates')return json(view.candidates);
    if(path[2]==='squads'){
     if(!path[3])return json(view.squads);
     const squad=view.squads.find(s=>s.id===path[3]);if(!squad)throw new ApiError(404,'NOT_FOUND','Equipe não encontrada.');
     if(path[4]==='history'){
      const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));
      const rows=await db.prepare('SELECT operator_id AS operatorId,joined_turn AS joinedTurn,left_turn AS leftTurn FROM online_squad_members WHERE game_id=? AND squad_id=? ORDER BY joined_version DESC LIMIT ? OFFSET ?').bind(id,path[3],limit,offset).all();return json(rows.results);
     }return json(squad);
    }
    if(path[2]==='operators'){
     if(!path[3])return json(view.operators);
     const operator=view.operators.find(o=>o.id===path[3]);if(!operator)throw new ApiError(404,'NOT_FOUND','Operador não encontrado.');
     if(path[4]==='history'){
      const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));
      const rows=await db.prepare("SELECT turn,event_type AS type,title,data_json FROM online_personnel_history WHERE game_id=? AND json_extract(data_json,'$.operatorId')=? ORDER BY turn DESC,rowid DESC LIMIT ? OFFSET ?").bind(id,path[3],limit,offset).all();return json(rows.results.map(r=>({...r,data:JSON.parse(r.data_json),data_json:undefined})));
     }return json(operator);
    }
   }
   if(request.method==='POST'||request.method==='PATCH'||request.method==='DELETE'){
    const body=await request.json();
    if(path[2]==='recruitment'&&path[3]==='hire')return json(await personnelAction(db,id,owner,'hire',undefined,hireSchema.parse(body),digest),201);
    if(path[2]==='operators'&&path[4]==='renew-contract')return json(await personnelAction(db,id,owner,'renew',path[3],renewSchema.parse(body),digest));
    if(path[2]==='operators'&&path[4]==='activities'&&path[5]==='cancel')return json(await personnelAction(db,id,owner,'activity_cancel',path[3],commandSchema.parse(body),digest));
    if(path[2]==='operators'&&path[4]==='activities')return json(await personnelAction(db,id,owner,'activity',path[3],activitySchema.parse(body),digest));
    if(path[2]==='squads'&&path[4]==='members'&&request.method==='POST')return json(await personnelAction(db,id,owner,'squad_member_add',path[3],memberSchema.parse(body),digest));
    if(path[2]==='squads'&&path[4]==='members'&&path[5]&&request.method==='DELETE')return json(await personnelAction(db,id,owner,'squad_member_remove',path[3],{...commandSchema.parse(body),operatorId:path[5]},digest));
    if(path[2]==='squads'&&path.length===3)return json(await personnelAction(db,id,owner,'squad_create',undefined,squadSchema.parse(body),digest),201);
    if(path[2]==='squads'&&path[4]==='training')return json(await personnelAction(db,id,owner,'squad_training',path[3],commandSchema.parse(body),digest));
    if(path[2]==='squads'&&path.length===4)return json(await personnelAction(db,id,owner,'squad_update',path[3],squadSchema.parse(body),digest));
   }
  }

  if(path[2]==='advance'&&path.length===3&&request.method==='POST')return json(await advance(db,owner,id,advanceSchema.parse(await request.json())));
  if(path[2]==='advances'&&path[3]){
   const {entry}=await snapshot(db,id,owner,path[3]);if(!entry)throw new ApiError(404,'NOT_FOUND','Avanço não encontrado.');
   if(path[4]==='resume'&&path.length===5&&request.method==='POST'){const {expectedVersion}=resumeSchema.parse(await request.json());return json(await advance(db,owner,id,{...entry.command,expectedVersion},true));}
   if(path.length===4&&request.method==='GET')return json(entry.result);
  }
  if(request.method==='GET'){
   if(path[2]==='timeline'){const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));return json(await timeline(db,id,offset,limit));}
   if(path[2]==='dashboard')return json({...projection(g),events:await timeline(db,id,0,8)});
   if(path[2]==='turns'&&path[4]==='summary'){
    const turn=Number(path[3]);if(!Number.isInteger(turn)||turn<1)throw new ApiError(404,'NOT_FOUND','Resumo não encontrado.');return json(await turnSummary(db,id,turn));
   }
   if(path[2]==='world'&&path[3]==='countries')return json(countries.map(c=>({...c,regions:c.regions.map((name,i)=>({id:`${c.id}-${i}`,name}))})));
   if(path[2]==='finances'&&path[3]==='ledger')return json(await financialLedger(db,id));
  }
  throw new ApiError(404,'NOT_FOUND','Rota não encontrada.');
 }catch(e){
  if(e instanceof ZodError)return json({code:'INVALID_REQUEST',message:'Dados inválidos.',issues:e.issues},400);
  if(e instanceof ApiError)return json({code:e.code,message:e.message},e.status);
  if(e instanceof SyntaxError)return json({code:'INVALID_JSON',message:'JSON inválido.'},400);
  console.error('API failure',e);return json({code:'INTERNAL_ERROR',message:'Não foi possível concluir a operação. Seus turnos confirmados permanecem salvos.'},500);
 }
}
