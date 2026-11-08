import {countries} from '../packages/rules/index.ts';
import {seedWorld,config,type World} from '../packages/engine/world.ts';
import type {Digest} from '../packages/engine/personnel.ts';
import {ensureOperations,contractProjection} from './operations.ts';
import {getGame,mutate,ApiError,type Database,type Campaign} from './persistence.ts';
const tables={organizations:['id','name','type','goal','resources','company_relation'],regions:['id','country_id','name','stability','security','economy','tension','controller_id','cooldown_until','last_event_id','last_event_type','intel_json'],influences:['region_id','organization_id','score'],relations:['org_low','org_high','value'],events:['id','region_id','type','category','created_turn','end_turn','status','origin_id','contract_id','summary','effects_json'],conflicts:['id','region_id','intensity','status','started_turn','ended_turn','cause_id'],participants:['conflict_id','organization_id','side'],rivals:['id','capacity','budget_cents','reputation','specialization','completed','failed'],jobs:['id','rival_id','contract_id','region_id','started_turn','completes_turn','status','origin_id']};
const names:Record<string,string>={participants:'conflict_participants',jobs:'rival_jobs'};
const keys:Record<string,string[]>={influences:['region_id','organization_id'],relations:['org_low','org_high'],participants:['conflict_id','organization_id']};
export async function readWorld(db:Database,id:string):Promise<World>{
 const entries=Object.keys(tables);const rows=await db.batch(entries.map(k=>{
  const filter=['events','conflicts','jobs'].includes(k)?" AND status='active'":k==='participants'?" AND conflict_id IN (SELECT id FROM online_world_conflicts WHERE game_id=? AND status='active')":'';
  return db.prepare('SELECT * FROM online_world_'+(names[k]??k)+' WHERE game_id=?'+filter+' ORDER BY '+(keys[k]??['id']).join(',')).bind(id,...(k==='participants'?[id]:[]));
 }));return Object.fromEntries(entries.map((k,i)=>[k,rows[i].results.map(({game_id,...r})=>r)])) as unknown as World;
}
export function worldWrites(db:Database,g:Campaign,w:World,guard:string,args:any[]){
 return Object.entries(tables).map(([key,columns])=>{
  const pk=keys[key]??['id'];const updates=columns.filter(c=>!pk.includes(c)).map(c=>c+'=excluded.'+c).join(',');
  return db.prepare(`INSERT INTO online_world_${names[key]??key}(game_id,${columns.join(',')}) SELECT ?,${columns.map(c=>"json_extract(value,'$."+c+"')").join(',')} FROM json_each(?) WHERE ${guard} ON CONFLICT(game_id,${pk.join(',')}) DO UPDATE SET ${updates}`).bind(g.id,JSON.stringify(w[key as keyof World]),...args);
 });
}
export async function ensureWorld(db:Database,id:string,owner:string,digest:Digest){
 await ensureOperations(db,id,owner,digest);
 for(let i=0;i<30;i++){
  const g=await getGame(db,id,owner);if(g.worldVersion!==config.version)throw new ApiError(422,'WORLD_RULES_MISMATCH','Regras mundiais indisponíveis.');if(g.worldInitialized)return;
  if(g.activeRequest)throw new ApiError(409,'LOCKED','Conclua o lote antes de abrir o mundo.');
  const w=await seedWorld(g.seed,g.state.turn,digest);if(await mutate(db,g,{...g,worldInitialized:true},(guard,args)=>worldWrites(db,g,w,guard,args)))return;
 }throw new ApiError(409,'BUSY','Tente novamente.');
}
const eventProjection=(e:any)=>({id:e.id,regionId:e.region_id,type:e.type,category:e.category,createdTurn:e.created_turn,endTurn:e.end_turn,status:e.status,originId:e.origin_id,contractId:e.contract_id,summary:e.summary});
export async function worldHistory(db:Database,id:string,offset:number,limit:number,region?:string){const rows=await db.prepare('SELECT id,region_id,type,category,created_turn,end_turn,status,origin_id,contract_id,summary FROM online_world_events WHERE game_id=?'+(region?' AND region_id=?':'')+' ORDER BY created_turn DESC,id LIMIT ? OFFSET ?').bind(id,...(region?[region]:[]),limit,offset).all();return rows.results.map(eventProjection);}
export async function worldView(db:Database,g:Campaign){
 const w=await readWorld(db,g.id),name=(id:string)=>w.organizations.find(o=>o.id===id)?.name??id;
 const regions=w.regions.map(r=>{const intel=JSON.parse(r.intel_json);return {id:r.id,name:r.name,countryId:r.country_id,...intel,controllerName:name(intel.controllerId),presence:intel.presence.map((p:any)=>({...p,name:name(p.organizationId)})),activeEvents:w.events.filter(e=>e.region_id===r.id).length,activeConflicts:w.conflicts.filter(c=>c.region_id===r.id).length}});
 const band=(v:number)=>v<-40?'Hostil':v<-10?'Tensa':v>30?'Cooperativa':'Neutra';
 const orgs=w.organizations.map(o=>({id:o.id,name:o.name,type:o.type,goal:({stability:'Estabilidade',expansion:'Expansão territorial',profit:'Atividade econômica',relief:'Ajuda humanitária',contracts:'Contratos'} as any)[o.goal]??o.goal,companyRelation:o.company_relation,relations:w.relations.filter(r=>r.org_low===o.id||r.org_high===o.id).map(r=>({organizationId:r.org_low===o.id?r.org_high:r.org_low,name:name(r.org_low===o.id?r.org_high:r.org_low),relationship:band(r.value)}))}));
 return {currentTurn:g.state.turn,countries:countries.map(c=>({...c,regions:regions.filter(r=>r.countryId===c.id)})),regions,organizations:orgs,rivals:w.rivals.map(r=>({id:r.id,name:name(r.id),capacity:r.capacity,reputation:r.reputation,specialization:r.specialization,completed:r.completed,failed:r.failed,activeJobs:w.jobs.filter(j=>j.rival_id===r.id).length,financialCondition:r.budget_cents<200000?'Pressionada':r.budget_cents<2000000?'Moderada':'Confortável'})),conflicts:w.conflicts.map(c=>({id:c.id,regionId:c.region_id,status:c.status,startedTurn:c.started_turn,causeId:c.cause_id,intensity:c.intensity<35?'Baixa':c.intensity<65?'Moderada':'Alta',participants:w.participants.filter(p=>p.conflict_id===c.id).map(p=>({organizationId:p.organization_id,name:name(p.organization_id),side:p.side}))})),history:await worldHistory(db,g.id,0,20)};
}
export async function worldRoute(db:Database,g:Campaign,path:string[],url:URL,offset:number,limit:number){
 const v=await worldView(db,g),kind=path[3],id=path[4];if(!kind)return v;
 if(kind==='history')return worldHistory(db,g.id,offset,limit);
 if(kind==='events'&&id){const e=await db.prepare('SELECT * FROM online_world_events WHERE game_id=? AND id=?').bind(g.id,id).first();if(e)return eventProjection(e);}
 if(kind==='countries'){const c=v.countries.find(c=>c.id===id);if(!id)return v.countries;if(c)return c;}
 if(kind==='organizations'){if(!id)return v.organizations;const o=v.organizations.find(o=>o.id===id);if(o)return o;}
 if(kind==='rivals')return v.rivals;
 if(kind==='regions'&&id){const r=v.regions.find(r=>r.id===id);if(r){if(path[5]==='history')return worldHistory(db,g.id,offset,limit,id);if(path[5]==='conflicts')return v.conflicts.filter(c=>c.regionId===id);if(path[5]==='contracts'){const rows=await db.prepare("SELECT * FROM online_contracts WHERE game_id=? AND region_id=? AND (expires_turn>? OR status IN ('accepted','active','rival_active')) ORDER BY offered_turn DESC,id").bind(g.id,id,g.state.turn).all();return rows.results.map(c=>contractProjection(c,g.logisticsInitialized));}return {...r,conflicts:v.conflicts.filter(c=>c.regionId===id),history:await worldHistory(db,g.id,offset,limit,id)};}}
 throw new ApiError(404,'NOT_FOUND','Registro mundial não encontrado.');
}
