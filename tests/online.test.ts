import { setup } from './online-helpers.ts';
import type { State } from '../packages/domain/index.ts';
import { it, expect } from 'vitest';
import { handleApi } from '../worker/api.ts';
import { advanceTurn } from '../packages/engine/index.ts';
it('online: isolamento por identidade, idempotência e determinismo com motor local',async()=>{const {db,call}=setup();try{const {data:g}=await call('/games',{requestId:'c',name:'Online PMC',seed:'asterra'});expect((await call('/games/'+g.id,undefined,'other')).status).toBe(404);const cmd={requestId:'a',expectedVersion:0,turns:4,stopOnImportant:false};const {data:r}=await call(`/games/${g.id}/advance`,cmd);expect(r.currentTurn).toBe(4);expect((await call(`/games/${g.id}/advance`,cmd)).data).toEqual(r);const summary=(await call(`/games/${g.id}/turns/4/summary`)).data;let state:State={turn:0,cashCents:10000000,reputation:10,status:'active'};let local:any;for(let i=0;i<4;i++){local=advanceTurn(state,'asterra','2030-01-01T00:00:00.000Z');state=local.state}expect(summary).toEqual(local.summary);expect((await call(`/games/${g.id}/advance`,{...cmd,turns:5})).status).toBe(409);expect((await call('/games/'+g.id)).data.seed).toBeUndefined()}finally{db.close()}});
it('online: requisições concorrentes com mesmo ID não duplicam turnos',async()=>{const {db,call}=setup();try{const {data:g}=await call('/games',{requestId:'c',name:'Online PMC',seed:'x'});const command={requestId:'same',expectedVersion:0,turns:28,stopOnImportant:false};const [a,b]=await Promise.all([call(`/games/${g.id}/advance`,command),call(`/games/${g.id}/advance`,command)]);expect(a.data).toEqual(b.data);expect(a.data.currentTurn).toBe(28);const entries=(await call(`/games/${g.id}/timeline?limit=100`)).data;expect(entries.filter((e:any)=>e.type==='weekly_close')).toHaveLength(1)}finally{db.close()}});
it('online: exige identidade de usuário',async()=>{const {db,DB}=setup();try{expect((await handleApi(new Request('https://pmc.example/api/v1/games'),{DB})).status).toBe(401)}finally{db.close()}});

it('online: IDs herdados são comandos válidos e consultas ausentes retornam 404',async()=>{
 const {db,call}=setup();try{
  const {data:g}=await call('/games',{requestId:'create-special',name:'Special PMC',seed:'x'});
  let turn=0;
  for(const requestId of ['constructor','toString','__proto__']){
   expect((await call(`/games/${g.id}/advances/${requestId}`)).status).toBe(404);
   const command={requestId,expectedVersion:turn,turns:1,stopOnImportant:false};
   const response=await call(`/games/${g.id}/advance`,command);
   expect(response.status).toBe(200);expect(response.data.currentTurn).toBe(++turn);
   expect((await call(`/games/${g.id}/advance`,command)).data).toEqual(response.data);
  }
  expect((await call(`/games/${g.id}/turns/constructor/summary`)).status).toBe(404);
 }finally{db.close()}
});
it('online: falha no turno 17 preserva 16, libera lock e retoma os restantes',async()=>{
 let fail=true;
 const {db,call}=setup((sql,args)=>{if(sql.startsWith('INSERT INTO online_turn_summaries')&&args[1]===17&&fail)throw Error('injected');});
 try{
  const {data:g}=await call('/games',{requestId:'c',name:'Recovery PMC',seed:'x'});
  const command={requestId:'a',expectedVersion:0,turns:28,stopOnImportant:false};
  const failed=await call(`/games/${g.id}/advance`,command);
  expect(failed.data).toMatchObject({status:'failed',processedTurns:16,currentTurn:16,reason:'turn_failed'});
  const stored=db.prepare('SELECT * FROM online_games WHERE id=?').get(g.id) as any;
  expect(stored.active_request).toBeNull();expect(db.prepare('SELECT turn FROM online_turn_summaries WHERE game_id=? AND turn=17').get(g.id)).toBeUndefined();
  expect(db.prepare('SELECT turn FROM online_events WHERE game_id=? AND turn=17').get(g.id)).toBeUndefined();
  expect((await call(`/games/${g.id}/advance`,command)).data).toEqual(failed.data);
  fail=false;
  expect((await call(`/games/${g.id}/advances/a/resume`,{expectedVersion:16})).data).toMatchObject({status:'completed',processedTurns:28,currentTurn:28});
  expect((await call(`/games/${g.id}/advances/a/resume`,{expectedVersion:28})).status).toBe(409);
  expect((await call(`/games/${g.id}/timeline?limit=100`)).data.filter((e:any)=>e.type==='weekly_close')).toHaveLength(1);
 }finally{db.close()}
});
it('online: histórico acima de 1,5 MB não impede novos turnos ou regrava histórico',async()=>{
 const trace:{sql:string;args:any[]}[]=[];const {db,call}=setup((sql,args)=>trace.push({sql,args}));try{
  const {data:g}=await call('/games',{requestId:'c',name:'Large PMC',seed:'x'});
  await call(`/games/${g.id}/advance`,{requestId:'first',expectedVersion:0,turns:1});
  const insert=db.prepare('INSERT INTO online_events VALUES(?,?,?,?,?,?,?)');
  db.exec('BEGIN');for(let i=0;i<8000;i++)insert.run(g.id,1,100+i,'historical','Historical event','x'.repeat(220),0);db.exec('COMMIT');
  expect((db.prepare('SELECT sum(length(description)) AS size FROM online_events').get() as any).size).toBeGreaterThan(1500000);
  trace.length=0;
  expect((await call(`/games/${g.id}/advance`,{requestId:'next',expectedVersion:1,turns:1})).data).toMatchObject({status:'completed',currentTurn:2});
  expect(trace.some(t=>/state_json|SELECT.*online_events/i.test(t.sql))).toBe(false);
  expect(Math.max(...trace.map(t=>Buffer.byteLength(JSON.stringify(t.args))))).toBeLessThan(2000);
  expect((await call(`/games/${g.id}/timeline?offset=2&limit=3`)).data).toHaveLength(3);
 }finally{db.close()}
});
it('online: comando concorrente diferente não toma lote e interrupção respeita fechamento semanal',async()=>{
 const {db,call}=setup();try{
  const {data:g}=await call('/games',{requestId:'c',name:'Concurrent PMC',seed:'x'});
  const responses=await Promise.all(['a','b'].map(requestId=>call(`/games/${g.id}/advance`,{requestId,expectedVersion:0,turns:27,stopOnImportant:false})));
  expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await call(`/games/${g.id}`)).data.currentTurn).toBe(27);
  expect((await call(`/games/${g.id}/advance`,{requestId:'week',expectedVersion:27,turns:4,stopOnImportant:true})).data).toMatchObject({status:'interrupted',processedTurns:1,currentTurn:28});
 }finally{db.close()}
});
it('online: 336 turnos reproduzem todos os resumos locais e persistem entre chamadas',async()=>{
 const {db,call}=setup();try{
  const {data:g}=await call('/games',{requestId:'c',name:'Long PMC',seed:'asterra'});
  let state:State={turn:0,cashCents:10000000,reputation:10,status:'active'};
  for(let week=0;week<12;week++){
   expect((await call(`/games/${g.id}/advance`,{requestId:`w-${week}`,expectedVersion:week*28,turns:28,stopOnImportant:false})).data.status).toBe('completed');
   for(let i=0;i<28;i++){
    const local=advanceTurn(state,'asterra','2030-01-01T00:00:00.000Z');state=local.state;
    expect((await call(`/games/${g.id}/turns/${state.turn}/summary`)).data).toEqual(local.summary);
   }
  }
  expect((await call(`/games/${g.id}`)).data.currentTurn).toBe(336);
 }finally{db.close()}
});
it('online: recusa versão de regras desconhecida sem alterar campanha',async()=>{
 const {db,call}=setup();try{
  const {data:g}=await call('/games',{requestId:'c',name:'Version PMC',seed:'x'});
  db.prepare("UPDATE online_games SET rules_version='future' WHERE id=?").run(g.id);
  const response=await call(`/games/${g.id}/advance`,{requestId:'a',expectedVersion:0,turns:1});
  expect(response.status).toBe(422);expect(response.data.code).toBe('RULES_MISMATCH');
  expect((await call(`/games/${g.id}`)).data.currentTurn).toBe(0);
 }finally{db.close()}
});
