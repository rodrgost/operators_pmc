import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {setupImmediate as setup} from './online-helpers.ts';
import {seedWorld,worldTurn,publishWorldContracts,refreshIntel,validateWorld,applyMissionResults,worldCanonical} from '../packages/engine/world.ts';
import {offers,emptyOperations} from '../packages/engine/operations.ts';
const digest=async(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function fixture(hook?:(sql:string,args:any[])=>void){const s=setup(hook),g=(await s.call('/games',{requestId:'create',name:'World PMC',seed:'world-qa'})).data,path='/games/'+g.id;const view=await s.call(path+'/world');expect(view.status).toBe(200);async function advance(turns:number,id='advance'){const g=(await s.call(path)).data;return s.call(path+'/advance',{requestId:id,expectedVersion:g.stateVersion,turns,stopOnImportant:false})}return {...s,g,path,advance,view:view.data};}
it('mundo: inicialização, estimativas estáveis, rotas e isolamento sem segredos',async()=>{const s=await fixture();try{
 expect(s.view.countries).toHaveLength(5);expect(s.view.regions).toHaveLength(15);expect(s.view.organizations).toHaveLength(13);expect(s.view.rivals).toHaveLength(3);
 expect((await s.call(s.path+'/world')).data).toEqual(s.view);expect(JSON.stringify(s.view)).not.toMatch(/"(resources|budget_cents|effects_json|risk|difficulty|seed|cooldown_until|score)"/);
 expect(s.view.regions.every((r:any)=>r.presence.reduce((n:number,p:any)=>n+p.estimatedShare,0)===100)).toBe(true);
 expect((await s.call(s.path+'/world/regions/karsen-0')).data.name).toBe('Varkov');expect((await s.call(s.path+'/world/countries/karsen')).data.regions).toHaveLength(3);
 expect((await s.call(s.path+'/world/organizations/gov-karsen')).status).toBe(200);expect((await s.call(s.path+'/world/rivals')).data).toHaveLength(3);
 expect((await s.call(s.path+'/world',undefined,'intruder')).status).toBe(404);expect((await s.call(s.path+'/world/regions/missing')).status).toBe(404);
 }finally{s.db.close()}});
it('mundo: 336 turnos mantêm limites, influência, cooldown e contratos causais',async()=>{
 let w=await seedWorld('long',0,digest),o=emptyOperations();o.contracts=await offers('long',0,digest);let emergents=0;const last=new Map<string,number>();
 for(let t=1;t<=336;t++){
  ({world:w,operations:o}=await worldTurn(w,o,t,'long',digest));await publishWorldContracts(w,o,'long',t,digest);await refreshIntel(w,'long',t,digest);validateWorld(w);
  for(const r of w.regions)expect(w.events.filter(e=>e.region_id===r.id&&e.status==='active').length).toBeLessThanOrEqual(2);
  for(const e of w.events.filter(e=>e.created_turn===t&&['industrial_crisis','armed_conflict','humanitarian_need','security_incident','political_reform','corporate_investment'].includes(e.type))){if(last.has(e.region_id))expect(t-last.get(e.region_id)!).toBeGreaterThanOrEqual(12);last.set(e.region_id,t);if(e.contract_id){emergents++;expect(o.contracts.find(c=>c.id===e.contract_id)?.origin_event_id).toBe(e.id)}}
 }
 expect(emergents).toBeGreaterThan(10);expect(w.conflicts.length).toBeGreaterThan(0);expect(w.participants.every(p=>p.side===(p.organization_id.startsWith('gov-')?'government':'opposition'))).toBe(true);
});
it('mundo: crise gera demanda e conflito encadeado com participantes',async()=>{
 const zero=async()=> '0'.repeat(64);let w=await seedWorld('cause',0,digest),o=emptyOperations();({world:w,operations:o}=await worldTurn(w,o,1,'cause',zero));await publishWorldContracts(w,o,'cause',1,zero);
 const crisis=w.events.find(e=>e.region_id==='karsen-0'&&e.type==='industrial_crisis');expect(crisis).toBeTruthy();expect(o.contracts.find(c=>c.id===crisis.contract_id)).toMatchObject({source:'world_event',origin_event_id:crisis.id});
 ({world:w,operations:o}=await worldTurn(w,o,13,'cause',zero));await publishWorldContracts(w,o,'cause',13,zero);const conflict=w.conflicts.find(c=>c.region_id==='karsen-0');expect(conflict).toBeTruthy();expect(w.events.find(e=>e.id===conflict.cause_id)?.origin_id).toBe(crisis.id);expect(w.participants.filter(p=>p.conflict_id===conflict.id)).toHaveLength(2);
});
it('mundo: rivais respeitam aceite e usam seu próprio orçamento',async()=>{const s=await fixture();try{
 const c=(await s.call(s.path+'/contracts')).data[0];const g=(await s.call(s.path)).data;expect((await s.call(s.path+'/contracts/'+c.id+'/accept',{requestId:'accept',expectedVersion:g.stateVersion})).status).toBe(200);
 const cash=(await s.call(s.path)).data.cashCents;expect((await s.advance(7)).data).toMatchObject({status:'completed',currentTurn:7});expect((await s.call(s.path+'/contracts/'+c.id)).data.status).toBe('accepted');await s.advance(1,'mobilization-deadline');expect((await s.call(s.path+'/contracts/'+c.id)).data.status).toBe('expired');expect((await s.call(s.path)).data.cashCents).toBe(cash);
 const jobs=s.db.prepare('SELECT * FROM online_world_rival_jobs').all() as any[];expect(jobs.length).toBeGreaterThan(0);expect(jobs.some(j=>j.status!=='active')).toBe(true);expect(jobs.some(j=>j.contract_id===c.id)).toBe(false);
 expect((await s.call(s.path+'/finances/ledger')).data).toHaveLength(1);
 }finally{s.db.close()}});
it('mundo: individual e lote produzem os mesmos hashes e histórico',async()=>{const a=await fixture(),b=await fixture();try{
 expect((await a.advance(28,'batch')).data.status).toBe('completed');for(let t=0;t<28;t++)expect((await b.advance(1,'single-'+t)).data.status).toBe('completed');
 expect(a.db.prepare('SELECT turn,state_hash FROM online_turn_summaries ORDER BY turn').all()).toEqual(b.db.prepare('SELECT turn,state_hash FROM online_turn_summaries ORDER BY turn').all());
 expect((await a.call(a.path+'/world')).data).toEqual((await b.call(b.path+'/world')).data);
 const page=(await a.call(a.path+'/world/history?limit=2&offset=0')).data;expect(page).toHaveLength(2);expect((await a.call(a.path+'/world/events/'+page[0].id)).data).toEqual(page[0]);expect(JSON.stringify(page)).not.toContain('effects_json');
 }finally{a.db.close();b.db.close()}});
it('mundo: falha no commit desfaz rivais e notícias e retoma sem duplicação',async()=>{
 let enabled=false;const s=await fixture(sql=>{if(enabled&&sql.startsWith('INSERT INTO online_world_rival_jobs')){enabled=false;throw Error('world storage fault')}}),reference=await fixture();try{
 enabled=true;expect((await s.advance(8,'fault')).data).toMatchObject({status:'failed',currentTurn:0,processedTurns:0});expect((s.db.prepare('SELECT count(*) n FROM online_world_events').get() as any).n).toBe(0);
 expect((await s.call(s.path+'/advances/fault/resume',{expectedVersion:0})).data).toMatchObject({status:'completed',currentTurn:8});await reference.advance(8,'normal');expect((await s.call(s.path+'/world')).data).toEqual((await reference.call(reference.path+'/world')).data);
 const before=(s.db.prepare('SELECT count(*) n FROM online_world_events').get() as any).n;await s.call(s.path+'/advance',{requestId:'fault',expectedVersion:0,turns:8,stopOnImportant:false});expect((s.db.prepare('SELECT count(*) n FROM online_world_events').get() as any).n).toBe(before);
 }finally{s.db.close();reference.db.close()}
});
it('mundo: consequências de missão mudam região, relação e influência',async()=>{
 const w=await seedWorld('mission',0,digest),r=w.regions.find(r=>r.id==='karsen-0'),o=emptyOperations();o.contracts=await offers('mission',0,digest);const c=o.contracts[0];c.region_id=r.id;c.client_id='gov-karsen';o.missions.push({id:'test',contract_id:c.id,ended_turn:1,status:'completed'});const before=r.security;
 applyMissionResults(w,o,1);expect(r.security).toBe(before+5);expect(w.organizations.find(o=>o.id===c.client_id).company_relation).toBe(4);expect(w.influences.find(f=>f.region_id===r.id&&f.organization_id===c.client_id).score).toBe(53);expect(w.events.find(e=>e.id==='consequence-test').contract_id).toBe(c.id);validateWorld(w);
});
it('mundo: inicialização no turno atual preserva partidas anteriores',async()=>{const s=setup();try{const g=(await s.call('/games',{requestId:'old',name:'Old PMC',seed:'old'})).data,path='/games/'+g.id;await s.call(path+'/advance',{requestId:'old-advance',expectedVersion:0,turns:4,stopOnImportant:false});const before=s.db.prepare('SELECT state_hash FROM online_turn_summaries').all();expect((await s.call(path+'/world')).data.regions.every((r:any)=>r.collectedTurn===4)).toBe(true);expect(s.db.prepare('SELECT state_hash FROM online_turn_summaries').all()).toEqual(before);expect((s.db.prepare('SELECT count(*) n FROM online_world_events').get() as any).n).toBe(0);}finally{s.db.close()}});

it('mundo: aceite concorrente com disputa rival produz um único vencedor',async()=>{const s=await fixture();try{
 await s.advance(3,'before-race');const g=(await s.call(s.path)).data,c=(await s.call(s.path+'/contracts')).data.find((c:any)=>c.status==='available'&&c.type==='reconnaissance');
 const results=await Promise.all([s.call(s.path+'/contracts/'+c.id+'/accept',{requestId:'race-accept',expectedVersion:g.stateVersion}),s.call(s.path+'/advance',{requestId:'race-turn',expectedVersion:g.stateVersion,turns:1,stopOnImportant:false})]);
 expect(results.some(r=>r.status===200)).toBe(true);const row=s.db.prepare('SELECT status FROM online_contracts WHERE id=?').get(c.id) as any,jobs=s.db.prepare('SELECT * FROM online_world_rival_jobs WHERE contract_id=?').all(c.id);if(row.status==='accepted')expect(jobs).toHaveLength(0);if(jobs.length)expect(row.status).toBe('rival_active');
 }finally{s.db.close()}});
it('mundo: missão concluída persiste consequência uma vez junto ao pagamento',async()=>{const s=await fixture();try{
 async function action(url:string,id:string,extra:any={}){const g=(await s.call(s.path)).data;return s.call(s.path+url,{requestId:id,expectedVersion:g.stateVersion,...extra})}
 for(let i=0;i<2;i++){const p=(await s.call(s.path+'/personnel')).data;expect((await action('/recruitment/hire','hire-'+i,{candidateId:p.candidates[0].id,weeks:4})).status).toBe(201)}
 const p=(await s.call(s.path+'/personnel')).data,ids=p.operators.map((o:any)=>o.id);const squad=(await action('/squads','squad',{name:'World Alfa',memberIds:ids,leaderId:ids[0],deputyId:ids[1]})).data.squadId;
 const c=(await s.call(s.path+'/contracts')).data.find((c:any)=>c.type==='security');s.db.prepare('UPDATE online_contracts SET difficulty=1,risk=1 WHERE id=?').run(c.id);await action('/contracts/'+c.id+'/accept','accept');const m=(await action('/contracts/'+c.id+'/start','start',{squadId:squad,memberIds:ids,leaderId:ids[0],deputyId:ids[1],reinforcementIds:[]})).data.missionId;
 expect((await s.advance(4,'mission')).data.status).toBe('completed');expect((await s.call(s.path+'/missions/'+m)).data.status).toBe('completed');const event=s.db.prepare('SELECT * FROM online_world_events WHERE id=?').get('consequence-'+m) as any;expect(event.contract_id).toBe(c.id);expect((s.db.prepare('SELECT company_relation FROM online_world_organizations WHERE id=?').get(c.clientId) as any).company_relation).toBe(4);
 await s.advance(1,'later');expect((s.db.prepare("SELECT count(*) n FROM online_world_events WHERE id=?").get('consequence-'+m) as any).n).toBe(1);const ledger=(await s.call(s.path+'/finances/ledger')).data;expect(ledger.filter((l:any)=>l.entryType==='mission_completion')).toHaveLength(1);expect(ledger.reduce((n:number,l:any)=>n+l.amountCents,0)).toBe((await s.call(s.path)).data.cashCents);
 }finally{s.db.close()}});
