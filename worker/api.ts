import { createGameSchema, advanceSchema, resumeSchema, paginationSchema } from '../packages/contracts/index.ts';
import { countries, organizations, rules, RULES_VERSION } from '../packages/rules/index.ts';
import { ZodError } from 'zod';
export interface Database { prepare(sql:string): {bind(...args:any[]):any;first():Promise<any>;all():Promise<{results:any[]}>;run():Promise<any>}; }
interface Campaign { id:string;name:string;seed:string;startDate:string;rulesVersion:string;state:{turn:number;cashCents:number;reputation:number;status:string};stateVersion:number;events:any[];summaries:Record<string,any>;requests:Record<string,any>;activeRequest:string|null }
class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message)}}
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function digest(value:unknown){const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join('')}
const date=(g:Campaign,turn=g.state.turn)=>new Date(Date.parse(g.startDate)+turn*6*3600000).toISOString();
const projection=(g:Campaign)=>({id:g.id,name:g.name,rulesVersion:g.rulesVersion,currentTurn:g.state.turn,stateVersion:g.stateVersion,cashCents:g.state.cashCents,reputation:g.state.reputation,status:g.state.status,date:date(g)});
async function step(g:Campaign):Promise<Campaign>{
 const state={...g.state,turn:g.state.turn+1};const events:any[]=[];
 const add=(type:string,title:string,description:string,important=false)=>events.push({turn:state.turn,sequence:events.length,type,title,description,important});
 add('turn_completed','Turno concluído',`Janela de ${rules.hoursPerTurn} horas processada.`);
 if(state.turn%4===0){const hex=await digest([g.seed,RULES_VERSION,state.turn,'bulletin','world','country']);const n=parseInt(hex.slice(0,13),16)/0x10000000000000;const country=countries[Math.floor(n*countries.length)];add('public_bulletin',`Boletim · ${country.name}`,'Atualização pública registrada. A simulação de crises e contratos será incorporada nas próximas fases.')}
 if(state.turn%28===0)add('weekly_close','Fechamento semanal',`Semana ${state.turn/28} encerrada. Nenhuma despesa operacional contratada nesta fase.`,true);
 const summary={turn:state.turn,date:date(g,state.turn),events,stateHash:await digest([state.turn,state.cashCents,state.reputation,state.status])};
 return {...g,state,stateVersion:g.stateVersion+1,events:[...g.events,...events],summaries:{...g.summaries,[state.turn]:summary}};
}
async function get(db:Database,id:string,owner:string):Promise<Campaign>{const row=await db.prepare('SELECT state_json FROM online_campaigns WHERE id=? AND owner=?').bind(id,owner).first();if(!row)throw new ApiError(404,'NOT_FOUND','Partida não encontrada.');return JSON.parse(row.state_json)}
async function save(db:Database,g:Campaign,owner:string,expectedVersion:number){
 const value=JSON.stringify(g);if(new TextEncoder().encode(value).length>1_500_000)throw new ApiError(422,'SAVE_LIMIT','Esta campanha atingiu o limite de tamanho da versão inicial. Crie outra campanha para continuar os testes.');
 const result=await db.prepare('UPDATE online_campaigns SET state_json=?,version=?,name=? WHERE id=? AND owner=? AND version=?').bind(value,g.stateVersion,g.name,g.id,owner,expectedVersion).run();
 return result.meta.changes===1;
}
function conflict(){throw new ApiError(409,'VERSION_CONFLICT','A partida mudou. Atualize a tela antes de continuar.')}
function result(g:Campaign,entry:any,status:string,reason:string|null=null){return {requestId:entry.command.requestId,requestedTurns:entry.command.turns,processedTurns:entry.processed,currentTurn:g.state.turn,stateVersion:g.stateVersion,status,reason}}
// CAS revision includes changes to requests as well as turns. stateVersion remains the player-visible turn version.
async function cas(db:Database,previous:Campaign,next:Campaign,owner:string){
 const old=JSON.stringify(previous);const value=JSON.stringify(next);
 if(new TextEncoder().encode(value).length>1_500_000)throw new ApiError(422,'SAVE_LIMIT','Limite de tamanho desta campanha alcançado nesta versão.');
 const changed=await db.prepare('UPDATE online_campaigns SET state_json=?,version=?,name=? WHERE id=? AND owner=? AND state_json=?').bind(value,next.stateVersion,next.name,next.id,owner,old).run();return changed.meta.changes===1;
}
async function advance(db:Database,owner:string,id:string,command:any,resume=false){
 const original=JSON.stringify(command);let g=await get(db,id,owner);let entry=g.requests[command.requestId];
 if(entry&&!resume){if(entry.payload!==original)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');if(entry.result.status!=='processing')return entry.result;}
 else{
 if(g.stateVersion!==command.expectedVersion)conflict();
 if(g.activeRequest&&g.activeRequest!==command.requestId)throw new ApiError(409,'LOCKED','Existe um lote em andamento.');
 if(resume){if(!entry||entry.result.status!=='failed')throw new ApiError(409,'NOT_RESUMABLE','Somente avanços com falha podem ser retomados.');if(entry.result.currentTurn!==g.state.turn)conflict();}
 else entry={command,payload:original,processed:0,result:null};
 entry={...entry,result:result(g,entry,'processing')};
 const next={...g,requests:{...g.requests,[command.requestId]:entry},activeRequest:command.requestId};
 if(!await cas(db,g,next,owner))return advance(db,owner,id,command,resume);g=next;
 }
 // Per-turn CAS atomically persists current state, events, summary and command progress.
 // Retrying an unfinished request continues only its remaining turns; duplicate calls race safely via CAS.
 for(let attempts=0;attempts<100;attempts++){
 g=await get(db,id,owner);entry=g.requests[command.requestId];
 if(entry.result.status!=='processing')return entry.result;
 let next=await step(g);const processed=entry.processed+1;
 const important=command.stopOnImportant&&next.summaries[next.state.turn].events.some((e:any)=>e.important)&&processed<command.turns;
 const status=important?'interrupted':processed===command.turns?'completed':'processing';
 const updated={...entry,processed};updated.result=result(next,updated,status,important?'important_event':null);
 next={...next,requests:{...next.requests,[command.requestId]:updated},activeRequest:status==='processing'?command.requestId:null};
 if(!await cas(db,g,next,owner))continue;
 if(status!=='processing')return updated.result;
 }
 throw new ApiError(409,'BUSY','Concorrência elevada. Tente novamente com a mesma requisição.');
}
export async function handleApi(request:Request,env:{DB:Database}){
 try{
 const url=new URL(request.url);const owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return json({code:'UNAUTHORIZED',message:'Entre com sua conta ChatGPT para continuar.'},401);
 if(!env.DB)throw new ApiError(503,'STORAGE_UNAVAILABLE','Salvamento temporariamente indisponível.');
 if(request.method!=='GET'){
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new ApiError(403,'ORIGIN_DENIED','Origem não autorizada.');
 if(Number(request.headers.get('content-length')||0)>16384)throw new ApiError(413,'TOO_LARGE','Requisição muito grande.');
 }
 const path=url.pathname.replace(/^\/api\/v1\/?/,'').split('/');
 if(path[0]==='health')return json({status:'ok',phase:'foundation-online',rulesVersion:RULES_VERSION});
 if(path[0]!=='games')throw new ApiError(404,'NOT_FOUND','Rota não encontrada.');
 if(!path[1]){
 if(request.method==='GET'){const rows=await env.DB.prepare('SELECT state_json FROM online_campaigns WHERE owner=? ORDER BY rowid DESC').bind(owner).all();return json(rows.results.map((r:any)=>projection(JSON.parse(r.state_json))))}
 if(request.method==='POST'){
 const command=createGameSchema.parse(await request.json());const payload=JSON.stringify(command);
 const id=await digest([owner,command.requestId]);
 const g:Campaign={id,name:command.name,seed:command.seed,startDate:rules.startDate,rulesVersion:RULES_VERSION,stateVersion:0,state:{turn:0,cashCents:rules.initialCashCents,reputation:rules.initialReputation,status:'active'},events:[],summaries:{},requests:{},activeRequest:null};
 await env.DB.prepare('INSERT OR IGNORE INTO online_campaigns(id,owner,request_id,create_payload,name,version,state_json) VALUES(?,?,?,?,?,?,?)').bind(id,owner,command.requestId,payload,g.name,0,JSON.stringify(g)).run();
 const row=await env.DB.prepare('SELECT create_payload FROM online_campaigns WHERE id=? AND owner=?').bind(id,owner).first();if(row.create_payload!==payload)throw new ApiError(409,'REQUEST_REUSED','Identificador já utilizado com outros dados.');
 return json(projection(await get(env.DB,id,owner)),201);
 }
 }
 const id=path[1];const g=await get(env.DB,id,owner);
 if(path.length===2&&request.method==='GET')return json(projection(g));
 if(path[2]==='advance'&&request.method==='POST')return json(await advance(env.DB,owner,id,advanceSchema.parse(await request.json())));
 if(path[2]==='advances'&&path[3]){
 const entry=g.requests[path[3]];if(!entry)throw new ApiError(404,'NOT_FOUND','Avanço não encontrado.');
 if(path[4]==='resume'&&request.method==='POST'){const {expectedVersion}=resumeSchema.parse(await request.json());return json(await advance(env.DB,owner,id,{...entry.command,expectedVersion},true))}
 if(request.method==='GET')return json(entry.result);
 }
 if(request.method==='GET'){
 if(path[2]==='timeline'){const {offset,limit}=paginationSchema.parse(Object.fromEntries(url.searchParams));return json([...g.events].sort((a,b)=>b.turn-a.turn||b.sequence-a.sequence).slice(offset,offset+limit))}
 if(path[2]==='dashboard')return json({...projection(g),events:[...g.events].reverse().slice(0,8)});
 if(path[2]==='turns'&&path[4]==='summary'){const summary=g.summaries[path[3]];if(!summary)throw new ApiError(404,'NOT_FOUND','Resumo não encontrado.');return json(summary)}
 if(path[2]==='world'&&path[3]==='countries')return json(countries.map(c=>({...c,regions:c.regions.map((name,i)=>({id:`${c.id}-${i}`,name}))})));
 if(path[2]==='finances'&&path[3]==='ledger')return json([{turn:0,sourceId:'initial-capital',amountCents:rules.initialCashCents,entryType:'initial_capital'}]);
 }
 throw new ApiError(404,'NOT_FOUND','Rota não encontrada.');
 }catch(e){if(e instanceof ZodError)return json({code:'INVALID_REQUEST',message:'Dados inválidos.',issues:e.issues},400);if(e instanceof ApiError)return json({code:e.code,message:e.message},e.status);if(e instanceof SyntaxError)return json({code:'INVALID_JSON',message:'JSON inválido.'},400);console.error('API failure',e);return json({code:'INTERNAL_ERROR',message:'Não foi possível concluir a operação. Seus turnos confirmados permanecem salvos.'},500)}
}
