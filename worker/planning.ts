import {ApiError,getGame,mutate,projection,type Database,type Campaign,type Statement} from './persistence.ts';
import {readPersonnel,personnelAction,ensurePersonnel,hireSchema,renewSchema,activitySchema,commandSchema,memberSchema,squadSchema} from './personnel.ts';
import {readLogistics,logisticsAction,ensureLogistics,purchaseSchema} from './logistics.ts';
import {readOperations,operationAction,ensureOperations,startSchema,decisionSchema} from './operations.ts';
import {readIntelligence,analysisAction,ensureIntelligence,analysisSchema} from './intelligence.ts';
import {catalog,config as logisticsConfig} from '../packages/engine/logistics.ts';
import type {Digest} from '../packages/engine/personnel.ts';
export interface Order {id:string;scope:string;kind:string;target:string;command:any;title:string;costCents:number}
export function orderRoute(path:string[],method:string){
 const [,,area,target,action,sub]=path;let scope='',kind='',id='',schema:any;
 if(method==='POST'&&area==='equipment'&&target==='purchases'){scope='logistics';kind='purchase';schema=purchaseSchema;}
 else if(method==='POST'&&area==='equipment'&&['maintenance','resupply'].includes(action)){scope='logistics';kind=action;id=target;schema=commandSchema;}
 else if(method==='POST'&&area==='headquarters'&&target==='modules'&&sub==='upgrade'){scope='logistics';kind='upgrade';id=action;schema=commandSchema;}
 else if(method==='POST'&&area==='intelligence'&&target==='analyses'){scope='intelligence';kind='analysis';schema=analysisSchema;}
 else if(method==='POST'&&area==='recruitment'&&target==='hire'){scope='personnel';kind='hire';schema=hireSchema;}
 else if(area==='operators'&&method==='POST'){scope='personnel';id=target;if(action==='renew-contract'){kind='renew';schema=renewSchema;}else if(action==='activities'){kind=sub==='cancel'?'activity_cancel':'activity';schema=sub==='cancel'?commandSchema:activitySchema;}}
 else if(area==='squads'&&action==='training'&&method==='POST'){scope='personnel';id=target;kind='squad_training';schema=commandSchema;}
 else if(area==='contracts'&&method==='POST'&&['accept','cancel','start'].includes(action)){scope='operations';kind=action;id=target;schema=action==='start'?startSchema:commandSchema;}
 else if(area==='missions'&&method==='POST'&&action==='withdraw'){scope='operations';kind='withdraw';id=target;schema=commandSchema;}
 else if(area==='decisions'&&method==='POST'&&action==='resolve'){scope='operations';kind='decision';id=target;schema=decisionSchema;}
 return kind&&schema?{scope,kind,target:id,schema}:null;
}
export async function orders(db:Database,id:string):Promise<Order[]>{const rows=await db.prepare("SELECT * FROM online_pending_orders WHERE game_id=? AND status='pending' ORDER BY rowid").bind(id).all();return rows.results.map(r=>({id:r.id,scope:r.scope,kind:r.kind,target:r.target??'',command:JSON.parse(r.command_json),title:r.title,costCents:r.cost_cents}));}
export async function planContext(db:Database,g:Campaign){
 const context:any={g:structuredClone({...g,activeRequest:null}),p:g.personnelInitialized?(await readPersonnel(db,g.id,g.owner)).p:null,l:g.logisticsInitialized?await readLogistics(db,g.id):undefined,o:g.operationsInitialized?await readOperations(db,g.id):undefined,i:g.intelligenceInitialized?await readIntelligence(db,g):undefined,builders:[]};
 // This adapter supports reads and records mutation builders; it never executes a write.
 const planned:Database={planning:context,batch:stmts=>db.batch(stmts),prepare(sql){let values:any[]=[];const stmt:any={planningSql:sql,bind(...args:any[]){values=args;return stmt;},first:()=>db.prepare(sql).bind(...values).first(),all:()=>db.prepare(sql).bind(...values).all(),run:()=>{throw new Error('Planning cannot execute SQL writes')},materialize:(turn:number)=>{const final=[...values];if(/^INSERT INTO online_ledger\b/.test(sql))final[3]=turn;if(/^INSERT INTO online_personnel_history\b/.test(sql))final[2]=turn;return db.prepare(sql).bind(...final)}};return stmt;}};
 context.db=planned;return context;
}
export async function applyOrder(context:any,order:Order,digest:Digest){const db=context.db,g=context.g,command={...order.command,expectedVersion:g.stateVersion};
 if(order.scope==='logistics')return logisticsAction(db,g.id,g.owner,order.kind,order.target,command,digest);
 if(order.scope==='personnel')return personnelAction(db,g.id,g.owner,order.kind,order.target||undefined,command,digest);
 if(order.scope==='operations')return operationAction(db,g.id,g.owner,order.kind,order.target,command,digest);
 return analysisAction(db,g.id,g.owner,command,digest);
}
export async function prepareOrders(db:Database,g:Campaign,digest:Digest,pending?:Order[]){const list=pending??await orders(db,g.id),context=await planContext(db,g);for(const order of list){try{await applyOrder(context,order,digest)}catch(e){if(e instanceof ApiError)throw new ApiError(422,'PENDING_ORDER_INVALID',order.title+': '+e.message);throw e;}}return {context,list};}
function label(order:Order,context:any){const names:any={hire:'Contratar operador',renew:'Renovar vínculo',squad_create:'Criar equipe',squad_update:'Editar equipe',squad_member_add:'Adicionar integrante',squad_member_remove:'Remover integrante',activity:'Iniciar atividade',activity_cancel:'Interromper atividade',squad_training:'Treinar equipe',purchase:'Comprar kits',upgrade:'Melhorar módulo',maintenance:'Reparar kit',resupply:'Repor suprimentos',accept:'Aceitar contrato',cancel:'Cancelar contrato',start:'Iniciar missão',withdraw:'Retirar equipe',decision:'Responder decisão',analysis:'Solicitar análise'};
 if(order.kind==='purchase')return `Comprar ${order.command.quantity} kit(s) ${catalog.find(c=>c.id===order.command.catalogId)?.name??''}`;
 if(order.kind==='upgrade')return 'Melhorar '+(logisticsConfig.modules.find(m=>m.id===order.target)?.name??order.target);
 if(order.kind==='hire'){const c=context.p?.candidates.find((c:any)=>c.id===order.command.candidateId);return 'Contratar '+(c?JSON.parse(c.profile_json).name:'operador');}
 if(order.kind==='activity')return ({rest:'Descanso',training:'Treinamento',recovery:'Tratamento'} as any)[order.command.type]+' · '+(context.p?.operators.find((o:any)=>o.id===order.target)?JSON.parse(context.p.operators.find((o:any)=>o.id===order.target).profile_json).name:'operador');
 return names[order.kind]??order.kind;
}
async function ensureScope(db:Database,id:string,owner:string,scope:string,digest:Digest){if(scope==='logistics')await ensureLogistics(db,id,owner,digest);else if(scope==='operations')await ensureOperations(db,id,owner,digest);else if(scope==='intelligence')await ensureIntelligence(db,id,owner,digest);else await ensurePersonnel(db,id,owner,digest);}
export async function enqueue(db:Database,id:string,owner:string,route:any,command:any,digest:Digest){
 await ensureScope(db,id,owner,route.scope,digest);const payload=JSON.stringify({scope:route.scope,kind:route.kind,target:route.target,command});
 for(let attempt=0;attempt<30;attempt++){
 const g=await getGame(db,id,owner);const previous=await db.prepare('SELECT payload_json,result_json FROM online_pending_orders WHERE game_id=? AND id=?').bind(id,command.requestId).first();
 if(previous){if(previous.payload_json!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');return JSON.parse(previous.result_json);}
 if(await db.prepare('SELECT request_id FROM online_actions WHERE game_id=? AND request_id=? UNION ALL SELECT request_id FROM online_commands WHERE game_id=? AND request_id=?').bind(id,command.requestId,id,command.requestId).first())throw new ApiError(409,'REQUEST_REUSED','Identificador utilizado em outro comando.');
 if(g.activeRequest)throw new ApiError(409,'LOCKED','Conclua o lote antes de alterar o planejamento.');if(g.stateVersion!==command.expectedVersion)throw new ApiError(409,'VERSION_CONFLICT','A partida mudou. Atualize os dados.');
 const pending=await orders(db,id);if(pending.length>=20)throw new ApiError(422,'ORDER_LIMIT','Confirme ou remova ordens: limite de 20 por turno.');
 const {context}=await prepareOrders(db,g,digest,pending);const order:Order={id:command.requestId,scope:route.scope,kind:route.kind,target:route.target,command,title:'',costCents:0};order.title=label(order,context);const cash=context.g.state.cashCents;const details=await applyOrder(context,order,digest);order.costCents=cash-context.g.state.cashCents;
 const next={...g,stateVersion:g.stateVersion+1};const response={...details,...projection(next),queued:true,orderId:order.id,title:order.title,costCents:order.costCents,message:'Ordem agendada. Você pode removê-la antes de passar o turno.'};
 if(await mutate(db,g,next,(guard,args)=>[db.prepare(`INSERT INTO online_pending_orders SELECT ?,?,?,?,?,?,?,?,?,?,'pending',NULL,? WHERE ${guard}`).bind(id,order.id,order.scope,order.kind,order.target,JSON.stringify(command),payload,order.title,order.costCents,g.state.turn,JSON.stringify(response),...args)]))return response;
 }throw new ApiError(409,'BUSY','Tente novamente com a mesma ordem.');
}
export async function cancelOrder(db:Database,id:string,owner:string,orderId:string,body:any){const command=commandSchema.parse(body),payload=JSON.stringify({kind:'cancel_pending_order',orderId,command});for(let n=0;n<30;n++){
 const g=await getGame(db,id,owner),old=await db.prepare('SELECT payload_json,result_json FROM online_actions WHERE game_id=? AND request_id=?').bind(id,command.requestId).first();if(old){if(old.payload_json!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador reutilizado.');return JSON.parse(old.result_json);}
 if(await db.prepare('SELECT id FROM online_pending_orders WHERE game_id=? AND id=? UNION ALL SELECT request_id FROM online_commands WHERE game_id=? AND request_id=?').bind(id,command.requestId,id,command.requestId).first())throw new ApiError(409,'REQUEST_REUSED','Identificador reutilizado.');
 if(g.activeRequest)throw new ApiError(409,'LOCKED','Conclua o lote antes de remover ordens.');if(g.stateVersion!==command.expectedVersion)throw new ApiError(409,'VERSION_CONFLICT','A partida mudou. Atualize os dados.');const order=await db.prepare("SELECT id FROM online_pending_orders WHERE game_id=? AND id=? AND status='pending'").bind(id,orderId).first();if(!order)throw new ApiError(422,'ORDER_NOT_PENDING','A ordem já foi confirmada ou removida.');
 const next={...g,stateVersion:g.stateVersion+1},response={...projection(next),cancelledOrderId:orderId};if(await mutate(db,g,next,(guard,args)=>[db.prepare(`UPDATE online_pending_orders SET status='cancelled' WHERE game_id=? AND id=? AND ${guard}`).bind(id,orderId,...args),db.prepare(`INSERT INTO online_actions SELECT ?,?,?,? WHERE ${guard}`).bind(id,command.requestId,payload,JSON.stringify(response),...args)]))return response;
 }throw new ApiError(409,'BUSY','Tente novamente.');}
// Domain state is written once after turn resolution, in FK order. Only immutable facts
// from each staged command are retained here (ledger, history and idempotency records).
export function plannedFacts(context:any,guard:string,args:any[],turn:number):Statement[]{return context.builders.flatMap((build:any)=>build(guard,args).filter((s:any)=>/^INSERT INTO online_(ledger|personnel_history|actions)\b/.test(s.planningSql)).map((s:any)=>s.materialize(turn)));}
export function orderCommitWrites(db:Database,g:Campaign,list:Order[],guard:string,args:any[],turn:number){return list.length?[db.prepare(`UPDATE online_pending_orders SET status='committed',committed_turn=? WHERE game_id=? AND id IN(SELECT value FROM json_each(?)) AND status='pending' AND ${guard}`).bind(turn,g.id,JSON.stringify(list.map(o=>o.id)),...args)]:[];}
