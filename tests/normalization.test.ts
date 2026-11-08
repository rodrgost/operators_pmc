import { it,expect,vi } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setup,legacyFixture } from './online-helpers.ts';
import { snapshot,register,commitTurn } from '../worker/persistence.ts';
import { advanceTurn } from '../packages/engine/index.ts';
// @ts-expect-error Local JavaScript adapter intentionally has no declaration file.
import { applyMigrations } from '../scripts/sqlite-d1.mjs';
it('migration: banco legado recebe schema novo sem alterar save, e segunda execução é idempotente',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec(readFileSync('drizzle/0000_open_wilson_fisk.sql','utf8').replaceAll('--> statement-breakpoint',''));
  const fixture=legacyFixture(db);
  applyMigrations(db);applyMigrations(db);
  expect((db.prepare('SELECT state_json FROM online_campaigns').get() as any).state_json).toBe(fixture.raw);
  expect((db.prepare('SELECT count(*) AS n FROM preview_migrations').get() as any).n).toBe(readdirSync('drizzle').filter(f=>f.endsWith('.sql')).length);
  expect((db.prepare('SELECT count(*) AS n FROM online_games').get() as any).n).toBe(0);
 }finally{db.close()}
});
it('importação: preserva campanha, eventos, resumos, ledger, retry e retomada de falha',async()=>{
 const {db,call}=setup();try{
  const f=legacyFixture(db,{requestId:'__proto__'});
  expect((await call('/games')).data).toHaveLength(1);
  expect((db.prepare('SELECT count(*) AS n FROM online_games').get() as any).n).toBe(0);
  expect((await call(`/games/${f.id}`,undefined,'intruder')).status).toBe(404);
  expect((db.prepare('SELECT count(*) AS n FROM online_games').get() as any).n).toBe(0);
  expect((await call(`/games/${f.id}`)).data).toMatchObject({currentTurn:16,stateVersion:16,cashCents:10000000});
  expect((await call('/games')).data).toHaveLength(1);
  expect((await call('/games',f.create)).data.id).toBe(f.id);
  expect((await call(`/games/${f.id}/advance`,f.command)).data).toEqual(f.result);
  expect((await call(`/games/${f.id}/timeline?limit=100`)).data).toEqual([...f.campaign.events].reverse());
  for(let turn=1;turn<=16;turn++)expect((await call(`/games/${f.id}/turns/${turn}/summary`)).data).toEqual(f.campaign.summaries[turn]);
  expect((await call(`/games/${f.id}/finances/ledger`)).data).toEqual([{turn:0,sourceId:'initial-capital',amountCents:10000000,entryType:'initial_capital'}]);
  expect((await call(`/games/${f.id}/advances/__proto__/resume`,{expectedVersion:16})).data).toMatchObject({currentTurn:28,processedTurns:28,status:'completed'});
  expect((db.prepare('SELECT state_json FROM online_campaigns').get() as any).state_json).toBe(f.raw);
 }finally{db.close()}
});
it('importação: duas primeiras aberturas concorrentes importam uma vez',async()=>{
 const {db,call}=setup();try{
  const f=legacyFixture(db,{turns:28,status:'completed',requestId:'constructor'});
  const [a,b]=await Promise.all([call(`/games/${f.id}`),call(`/games/${f.id}`)]);
  expect(a.status).toBe(200);expect(a.data).toEqual(b.data);
  expect((db.prepare('SELECT count(*) AS n FROM online_events').get() as any).n).toBe(f.campaign.events.length);
  expect((db.prepare('SELECT count(*) AS n FROM online_commands').get() as any).n).toBe(1);
  expect((db.prepare('SELECT count(*) AS n FROM online_ledger').get() as any).n).toBe(1);
  expect((await call(`/games/${f.id}/advance`,f.command)).data).toEqual(f.result);
 }finally{db.close()}
});
it('importação: erro em tabela filha desfaz tudo e permite nova tentativa',async()=>{
 let fail=true;
 const {db,call}=setup(sql=>{if(fail&&sql.startsWith('INSERT INTO online_turn_summaries'))throw Error('import fault');});
 const logged=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{
  const f=legacyFixture(db);
  expect((await call(`/games/${f.id}`)).status).toBe(500);
  for(const table of ['online_games','online_events','online_commands','online_ledger','online_turn_summaries'])expect((db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as any).n).toBe(0);
  expect((db.prepare('SELECT state_json FROM online_campaigns').get() as any).state_json).toBe(f.raw);
  fail=false;expect((await call(`/games/${f.id}`)).data.currentTurn).toBe(16);
 }finally{logged.mockRestore();db.close()}
});
it('importação: lote processing interrompido continua somente turnos restantes',async()=>{
 const {db,call}=setup();try{
  const f=legacyFixture(db,{status:'processing'});
  expect((await call(`/games/${f.id}/advance`,f.command)).data).toMatchObject({status:'completed',currentTurn:28,processedTurns:28});
  expect((db.prepare('SELECT count(*) AS n FROM online_turn_summaries').get() as any).n).toBe(28);
 }finally{db.close()}
});
it('transação: criação não fica parcial quando ledger falha',async()=>{
 let fail=true;const {db,call}=setup(sql=>{if(fail&&sql.startsWith('INSERT INTO online_ledger'))throw Error('ledger fault');});
 const logged=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{
  const command={requestId:'create',name:'Atomic PMC',seed:'x'};
  expect((await call('/games',command)).status).toBe(500);
  expect((db.prepare('SELECT count(*) AS n FROM online_games').get() as any).n).toBe(0);
  fail=false;expect((await call('/games',command)).status).toBe(201);expect((await call('/games',command)).status).toBe(201);
  expect((db.prepare('SELECT count(*) AS n FROM online_ledger').get() as any).n).toBe(1);
 }finally{logged.mockRestore();db.close()}
});
it('CAS: turno calculado sobre revisão antiga não insere eventos nem atualiza comando',async()=>{
 const {db,DB,call}=setup();try{
  const {data:g}=await call('/games',{requestId:'c',name:'Stale PMC',seed:'x'});
  const old=await snapshot(DB,g.id,'owner','a');
  const command={requestId:'a',expectedVersion:0,turns:1,stopOnImportant:false};
  const entry={command,payload:JSON.stringify(command),processed:0,result:null as any};
  expect(await register(DB,old.g,entry,false)).toBe(true);
  const before=await snapshot(DB,g.id,'owner','a');
  const next=advanceTurn(before.g.state,'x',before.g.startDate);
  expect(await commitTurn(DB,before.g,before.entry!,next.summary,next.state,'completed',null)).toBe(true);
  expect(await commitTurn(DB,before.g,before.entry!,next.summary,next.state,'completed',null)).toBe(false);
  expect((await call(`/games/${g.id}`)).data.currentTurn).toBe(1);
  expect((db.prepare('SELECT count(*) AS n FROM online_events').get() as any).n).toBe(1);
  expect((db.prepare('SELECT processed_turns FROM online_commands').get() as any).processed_turns).toBe(1);
 }finally{db.close()}
});
it('integridade: FKs, unicidade financeira e progresso impedem registros inválidos',async()=>{
 const {db,call}=setup();try{
  expect(()=>db.prepare('INSERT INTO online_ledger VALUES(?,?,?,?,?)').run('missing','origin','initial_capital',0,100)).toThrow();
  const {data:g}=await call('/games',{requestId:'c',name:'Constraints PMC',seed:'x'});
  expect(()=>db.prepare('INSERT INTO online_ledger VALUES(?,?,?,?,?)').run(g.id,'initial-capital','initial_capital',0,10000000)).toThrow();
  expect(()=>db.prepare("INSERT INTO online_commands VALUES(?,?,?,1,2,'processing',NULL,0,0)").run(g.id,'bad','{}')).toThrow();
 }finally{db.close()}
});

it('persistência: reabrir arquivo mantém campanha importada e comando idempotente',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'pmc-normalized-'));let db:DatabaseSync|undefined;
 try{
  const path=join(directory,'game.sqlite');db=new DatabaseSync(path);
  let session=setup(undefined,db);const f=legacyFixture(db);
  await session.call(`/games/${f.id}`);
  const response=await session.call(`/games/${f.id}/advances/legacy/resume`,{expectedVersion:16});
  expect(response.data.currentTurn).toBe(28);
  db.close();db=new DatabaseSync(path);session=setup(undefined,db);
  expect((await session.call(`/games/${f.id}/advance`,f.command)).data).toEqual(response.data);
  expect((await session.call(`/games/${f.id}`)).data.currentTurn).toBe(28);
  expect((db.prepare('SELECT count(*) AS n FROM online_turn_summaries').get() as any).n).toBe(28);
 }finally{
  db?.close();
  if(!resolve(directory).startsWith(resolve(tmpdir())+sep+'pmc-normalized-'))throw Error('Unexpected test directory');
  rmSync(directory,{recursive:true,force:true});
 }
});
it('migration: erro não marca migration como aplicada nem deixa schema parcial',()=>{
 const directory=mkdtempSync(join(tmpdir(),'pmc-normalized-'));const db=new DatabaseSync(':memory:');
 try{
  copyFileSync('drizzle/0000_open_wilson_fisk.sql',join(directory,'0000_open_wilson_fisk.sql'));
  writeFileSync(join(directory,'0001_fault.sql'),'CREATE TABLE partial_migration(id INTEGER); INSERT INTO missing_table VALUES(1);');
  expect(()=>applyMigrations(db,directory)).toThrow();
  expect(db.prepare("SELECT name FROM sqlite_master WHERE name='partial_migration'").get()).toBeUndefined();
  expect(db.prepare("SELECT name FROM preview_migrations WHERE name='0001_fault.sql'").get()).toBeUndefined();
  writeFileSync(join(directory,'0001_fault.sql'),'CREATE TABLE partial_migration(id INTEGER);');
  applyMigrations(db,directory);applyMigrations(db,directory);
  expect(db.prepare("SELECT name FROM preview_migrations WHERE name='0001_fault.sql'").get()).toBeTruthy();
 }finally{
  db.close();
  if(!resolve(directory).startsWith(resolve(tmpdir())+sep+'pmc-normalized-'))throw Error('Unexpected test directory');
  rmSync(directory,{recursive:true,force:true});
 }
});
