import {difficultyChoices} from '../packages/engine/difficulty.ts';
import {orderRoute,enqueue,orders,cancelOrder,prepareOrders,plannedFacts,orderCommitWrites} from './planning.ts';
import {commandCenter,advanceSummary} from './command-center.ts';
import {ensureIntelligence,readIntelligence,intelligenceWrites,intelligenceView,analysisAction,analysisSchema} from './intelligence.ts';
import {collectSources,resolveAnalyses,collectReconnaissance,intelligenceCanonical,dossier,config as intelligenceConfig} from '../packages/engine/intelligence.ts';
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
  if(await db.prepare('SELECT request_id FROM online_actions WHERE game_id=? AND request_id=? UNION ALL SELECT id FROM online_pending_orders WHERE game_id=? AND id=?').bind(id,command.requestId,id,command.requestId).first())throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado em outro comando.');
  if(g.stateVersion!==command.expectedVersion)conflict();
  if(g.activeRequest&&g.activeRequest!==command.requestId)throw new ApiError(409,'LOCKED','Existe um lote em andamento.');
  if(resume){
   if(!entry||entry.result.status!=='failed')throw new ApiError(409,'NOT_RESUMABLE','Somente avanços com falha podem ser retomados.');
   if(entry.result.currentTurn!==g.state.turn)conflict();
  }
  const pending:Command=entry??{command,payload,processed:0,result:null as any};
  if((await orders(db,id)).length)await prepareOrders(db,g,digest);
  if(await register(db,g,pending,resume)){registered=true;break;}
 }
 if(!registered)return busy();
 for(let i=0;i<100;i++){
  const {g,entry}=await snapshot(db,id,owner,command.requestId);
  if(!entry)throw new ApiError(404,'NOT_FOUND','Avanço não encontrado.');
  if(entry.result.status!=='processing')return entry.result;
  try{
   const planned=(await orders(db,id)).length?await prepareOrders(db,g,digest):null;
   const turnState=planned?.context.g.state??g.state;
   const nextState={...turnState,turn:g.state.turn+1};
   const [randomHash,hash]=await Promise.all([digest(drawInput(g.seed,nextState.turn,'bulletin','world','country')),digest(stateInput(nextState))]);
   const next=resolveTurn(turnState,g.startDate,drawFromHash(randomHash),hash);
   let effects:any=null,opEffects:any=null,worldEffects:any=null,logistics:any=null,logisticsEvents:any[]=[],logisticsLedger:any[]=[],intelligence:any=null,intelligenceEvents:any[]=[];
   if(g.intelligenceInitialized){if(g.intelligenceVersion!==intelligenceConfig.version)throw new ApiError(422,'INTELLIGENCE_RULES_MISMATCH','Regras de inteligência indisponíveis.');intelligence=planned?.context.i??await readIntelligence(db,g);}
   if(g.logisticsInitialized){if(g.logisticsVersion!==logisticsConfig.version)throw new ApiError(422,'LOGISTICS_RULES_MISMATCH','Regras de logística indisponíveis.');logistics=planned?.context.l??await readLogistics(db,id);logisticsEvents=logisticsStart(logistics,next.state.turn);}
   if(g.personnelInitialized){
    if(g.personnelVersion!==balance.version)throw new ApiError(422,'PERSONNEL_RULES_MISMATCH','Regras de pessoal indisponíveis.');
    const p=planned?.context.p??(await readPersonnel(db,id,owner)).p;
    let turnPersonnel=p;
    if(g.operationsInitialized){
     if(g.operationsVersion!==opsConfig.version)throw new ApiError(422,'OPERATIONS_RULES_MISMATCH','Regras de operações indisponíveis.');
     let operations=planned?.context.o??await readOperations(db,id);
     if(g.worldInitialized){if(g.worldVersion!==worldConfig.version)throw new ApiError(422,'WORLD_RULES_MISMATCH','Regras mundiais indisponíveis.');const resolved=await worldTurn(await readWorld(db,id),operations,next.state.turn,g.seed,digest,g.difficultyProfile);worldEffects=resolved.world;operations=resolved.operations;}
     if(intelligence)intelligenceEvents.push(...await resolveAnalyses(intelligence,worldEffects,operations,next.state.turn,g.seed,digest));
     opEffects=await operationsTurn(operations,p,next.state.turn,next.state.cashCents,next.state.reputation,g.seed,digest,logistics??undefined,intelligence??undefined,g.difficultyProfile);
     if(worldEffects)applyMissionResults(worldEffects,opEffects.operations,next.state.turn);
     if(intelligence)intelligenceEvents.push(...await collectReconnaissance(intelligence,worldEffects,opEffects.operations,opEffects.reports,next.state.turn,g.seed,digest));
     turnPersonnel=opEffects.personnel;next.state.cashCents=opEffects.cash;next.state.reputation=opEffects.reputation;
    }
    const managed=logistics?facilityTurn(logistics,turnPersonnel,next.state.turn):[];
    effects=await personnelTurn(turnPersonnel,next.state.turn,next.state.cashCents,g.seed,next.state.reputation,digest,managed);
    next.state.cashCents=effects.cash;
    if(logistics){const finance=facilitiesFinance(logistics,next.state.turn,next.state.cashCents);next.state.cashCents=finance.cash;logisticsLedger=finance.ledger;logisticsEvents.push(...finance.events);}
    next.state.status=next.state.cashCents<0||logistics?.headquarters.arrears_cents>0?'financial_crisis':effects.status;
    if(worldEffects){await publishWorldContracts(worldEffects,opEffects.operations,g.seed,next.state.turn,digest,g.difficultyProfile);await refreshIntel(worldEffects,g.seed,next.state.turn,digest);next.summary.events=next.summary.events.filter(e=>e.type!=='public_bulletin');}
    if(intelligence){await collectSources(intelligence,worldEffects,opEffects.operations,next.state.turn,digest);intelligence.snapshots=intelligence.snapshots.filter((s:any)=>opEffects.operations.missions.some((m:any)=>m.id===s.mission_id&&['active','awaiting_decision','returning'].includes(m.status)));}
    const weekly=next.summary.events.find(e=>e.type==='weekly_close');if(weekly)weekly.description='Semana encerrada. Consulte os pagamentos e vínculos no livro-razão.';
    for(const e of [...intelligenceEvents,...logisticsEvents,...(worldEffects?worldNotifications(worldEffects,next.state.turn):[]),...(opEffects?.events??[]),...effects.events])next.summary.events.push({...e,turn:next.state.turn,sequence:next.summary.events.length});
    if(planned?.list.length)next.summary.events.push({turn:next.state.turn,sequence:next.summary.events.length,type:'orders_committed',title:'Ordens confirmadas',description:planned.list.length+' ordem(ns) aplicadas no início do turno.',important:false});
    next.summary.events.forEach((e,i)=>e.sequence=i);
    next.summary.stateHash=await digest([stateInput(next.state),balance.version,canonical(effects.personnel),...(opEffects?[opsConfig.version,opsCanonical(opEffects.operations)]:[]),...(worldEffects?[worldConfig.version,worldCanonical(worldEffects)]:[]),...(logistics?[logisticsConfig.version,logisticsCanonical(logistics)]:[]),...(intelligence?[intelligenceConfig.version,intelligenceCanonical(intelligence)]:[])]);
   }
   if(g.difficultyProfile.id!=='normal')next.summary.stateHash=await digest([next.summary.stateHash,g.difficultyProfile]);
   const processed=entry.processed+1;
   const important=entry.command.stopOnImportant&&next.summary.events.some(e=>e.important)&&processed<entry.command.turns;
   const status=opEffects?.critical?'interrupted':important?'interrupted':processed===entry.command.turns?'completed':'processing';
   const reason=opEffects?.critical?'critical_decision':important?'important_event':null;
   if(!await commitTurn(db,g,entry,next.summary,next.state,status,reason,effects?(guard,args)=>personnelWrites(db,g,effects.personnel,guard,args,[...(opEffects?.ledger??[]),...effects.ledger,...logisticsLedger],[...(opEffects?.history??[]),...effects.history]).concat(opEffects?operationsWrites(db,g,opEffects.operations,guard,args,opEffects.reports):[]).concat(worldEffects?worldWrites(db,g,worldEffects,guard,args):[]).concat(logistics?logisticsWrites(db,g,logistics,guard,args):[]).concat(intelligence?intelligenceWrites(db,g,intelligence,guard,args):[]).concat(planned?plannedFacts(planned.context,guard,args,next.state.turn):[]).concat(planned?orderCommitWrites(db,g,planned.list,guard,args,next.state.turn):[]):undefined))continue;
   if(status!=='processing')return result({...g,state:next.state,stateVersion:g.stateVersion+1},{...entry,processed},status,reason);
  }catch(error){return failAdvance(db,owner,id,command.requestId,error instanceof ApiError?error.code:'turn_failed');}
 }return busy();
}
export async function handleApi(request:Request,env:{DB:Database},execution:'queued'|'immediate'='queued'){
 // The immediate dispatcher is retained only for legacy domain regression fixtures.
 // Production callers do not pass this argument; no HTTP flag can enable it.
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
  if(path[0]==='health')return json({status:'ok',phase:'intelligence-online',rulesVersion:RULES_VERSION});
  if(path[0]==='difficulties'&&path.length===1&&request.method==='GET')return json(difficultyChoices());
  if(path[0]!=='games')throw new ApiError(404,'NOT_FOUND','Rota não encontrada.');
  if(!path[1]){
   if(request.method==='GET')return json(await listGames(db,owner));
   if(request.method==='POST'){
    const command=createGameSchema.parse(await request.json());return json(await createGame(db,await digest([owner,command.requestId]),owner,command),201);
   }
  }
  const id=path[1],g=await getGame(db,id,owner);
  if(path.length===2&&request.method==='GET')return json(projection(g));
  if(path[2]==='orders'){
   if(path.length===3&&request.method==='GET')return json({stateVersion:g.stateVersion,orders:await orders(db,id)});
   if(path[3]&&path[4]==='cancel'&&request.method==='POST')return json(await cancelOrder(db,id,owner,path[3],await request.json()));
  }
  const route=execution==='queued'?orderRoute(path,request.method):null;
  if(route)return json(await enqueue(db,id,owner,route,route.schema.parse(await request.json()),digest),201);
  if(path[2]==='command-center'&&path.length===3&&request.method==='GET')return json(await commandCenter(db,g));
  if(path[2]==='intelligence'){
   await ensureIntelligence(db,id,owner,digest);const current=await getGame(db,id,owner);
   if(request.method==='POST'&&path[3]==='analyses')return json(await analysisAction(db,id,owner,analysisSchema.parse(await request.json()),digest),201);
   if(request.method==='GET'){const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));const type=url.searchParams.get('targetType'),target=url.searchParams.get('targetId'),topic=url.searchParams.get('topic')??undefined;if(type&&target)return json(await intelligenceView(db,current,type,target,offset,limit,topic));if(type||target||topic)throw new ApiError(400,'INVALID_TARGET','Informe tipo e identificador do alvo.');const rows=await db.prepare('SELECT id,target_type AS targetType,target_id AS targetId,topic,requested_turn AS requestedTurn,due_turn AS dueTurn,cost_cents AS costCents,status,completed_turn AS completedTurn FROM online_intel_analyses WHERE game_id=? ORDER BY requested_turn DESC,id LIMIT ? OFFSET ?').bind(id,limit,offset).all();return json({currentTurn:current.state.turn,stateVersion:current.stateVersion,analyses:rows.results,analysis:{costCents:intelligenceConfig.analysisCostCents,turns:intelligenceConfig.analysisTurns,capacity:intelligenceConfig.analysisCapacity}});}
  }
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
     const c=await db.prepare('SELECT * FROM online_contracts WHERE game_id=? AND id=?').bind(id,path[3]).first();if(!c)throw new ApiError(404,'NOT_FOUND','Contrato não encontrado.');return json(contractProjection(c,current.logisticsInitialized,current.intelligenceInitialized?dossier(await readIntelligence(db,current),'contract',c.id,current.state.turn):undefined));
    }
    if(path[2]==='decisions')return json((await operationsView(db,current)).decisions);
    if(path[2]==='missions'){
     if(!path[3])return json((await operationsView(db,current)).missions);
     const m=await db.prepare('SELECT * FROM online_missions WHERE game_id=? AND id=?').bind(id,path[3]).first();if(!m)throw new ApiError(404,'NOT_FOUND','Missão não encontrada.');
     if(path[4]==='reports'){const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));const r=await db.prepare('SELECT id,turn,summary_json FROM online_mission_reports WHERE game_id=? AND mission_id=? ORDER BY turn,id LIMIT ? OFFSET ?').bind(id,m.id,limit,offset).all();return json(r.results.map(r=>({id:r.id,turn:r.turn,...JSON.parse(r.summary_json)})));}
     const a=await db.prepare('SELECT * FROM online_mission_assignments WHERE game_id=? AND mission_id=? ORDER BY operator_id').bind(id,m.id).all();const snapshot=await db.prepare('SELECT snapshot_json FROM online_mission_intelligence WHERE game_id=? AND mission_id=?').bind(id,m.id).first();return json({...missionProjection(m,a.results),intelligenceAtDeparture:snapshot?JSON.parse(snapshot.snapshot_json):null});
    }
   }
   if(request.method==='POST'){
    const body=await request.json();
    if(path[2]==='contracts'&&path[4]==='plan'){
     const {g:latest,p}=await readPersonnel(db,id,owner),o=await readOperations(db,id),c=o.contracts.find(c=>c.id===path[3]);const plan=validatePlan(latest,p,o,c,planSchema.parse(body),latest.logisticsInitialized?await readLogistics(db,id):undefined,latest.intelligenceInitialized?await readIntelligence(db,latest):undefined);return json({...plan,stateVersion:latest.stateVersion});
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
   if(path[4]==='summary'&&path.length===5&&request.method==='GET')return json(await advanceSummary(db,g,path[3]));
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
