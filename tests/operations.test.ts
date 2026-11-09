import {it,expect,vi} from 'vitest';
import {setupImmediate as setup} from './online-helpers.ts';
async function fixture(hook?:(sql:string,args:any[])=>void){
 const s=setup(hook),g=(await s.call('/games',{requestId:'create',name:'Mission PMC',seed:'missions'})).data,path='/games/'+g.id;
 async function data(){return (await s.call(path+'/personnel')).data}
 for(let i=0;i<3;i++){const p=await data();expect((await s.call(path+'/recruitment/hire',{requestId:'hire-'+i,expectedVersion:p.stateVersion,candidateId:p.candidates[0].id,weeks:4})).status).toBe(201)}
 const p=await data(),ids=p.operators.map((o:any)=>o.id);
 const squad=(await s.call(path+'/squads',{requestId:'squad',expectedVersion:p.stateVersion,name:'Alfa',memberIds:ids.slice(0,2),leaderId:ids[0],deputyId:ids[1]})).data.squadId;
 const view=(await s.call(path+'/operations')).data;
 const contract=view.contracts.find((c:any)=>c.type==='security');
 s.db.prepare('UPDATE online_contracts SET difficulty=1,risk=1 WHERE game_id=? AND id=?').run(g.id,contract.id);
 async function action(url:string,requestId:string,extra:any={}){const state=(await s.call(path)).data;return s.call(path+url,{requestId,expectedVersion:state.stateVersion,...extra});}
 async function advance(turns:number,requestId='advance'){return action('/advance',requestId,{turns,stopOnImportant:false})}
 const plan={squadId:squad,memberIds:ids.slice(0,2),reinforcementIds:[ids[2]],leaderId:ids[0],deputyId:ids[1]};
 async function start(){expect((await action('/contracts/'+contract.id+'/accept','accept')).status).toBe(200);return action('/contracts/'+contract.id+'/start','start',plan)}
 return {...s,g,path,ids,squad,contract,plan,action,advance,start};
}
it('operações: seis tipos, estimativas estáveis e projeções sem segredos',async()=>{
 const s=await fixture();try{
  const a=await s.call(s.path+'/contracts'),b=await s.call(s.path+'/contracts');expect(a.data).toEqual(b.data);expect(new Set(a.data.map((c:any)=>c.type)).size).toBe(6);
  expect(JSON.stringify(a.data)).not.toMatch(/"(difficulty|risk|seed|audit_json|rng)"/);
  expect((await s.call(s.path+'/operations',undefined,'intruder')).status).toBe(404);
 }finally{s.db.close()}
});
it('operações: aceitar, planejar sem reservar e executar gera relatório e ledger único',async()=>{
 const s=await fixture();try{
  const initial=(await s.call(s.path)).data.cashCents;
  await s.action('/contracts/'+s.contract.id+'/accept','accept');
  const preview=await s.call(s.path+'/contracts/'+s.contract.id+'/plan',s.plan);expect(preview.status).toBe(200);expect(preview.data.operatorIds).toHaveLength(3);
  expect((s.db.prepare('SELECT count(*) AS n FROM online_reservations').get() as any).n).toBe(0);
  const command={requestId:'start',expectedVersion:(await s.call(s.path)).data.stateVersion,...s.plan};
  const started=await s.call(s.path+'/contracts/'+s.contract.id+'/start',command);expect(started.status).toBe(201);
  expect((await s.call(s.path+'/contracts/'+s.contract.id+'/start',command)).data).toEqual(started.data);
  expect((await s.advance(4)).data).toMatchObject({status:'completed',currentTurn:4});
  const mission=(await s.call(s.path+'/missions/'+started.data.missionId)).data;expect(mission.status).toBe('completed');expect(mission.crew.filter((a:any)=>a.assignmentType==='reinforcement')).toHaveLength(1);
  const reports=(await s.call(s.path+'/missions/'+mission.id+'/reports')).data;expect(reports.some((r:any)=>r.outcome==='completed')).toBe(true);expect(JSON.stringify(reports)).not.toMatch(/difficulty|complicationDraw|capacity|audit_json/);
  const ledger=(await s.call(s.path+'/finances/ledger')).data;expect(ledger.reduce((n:number,e:any)=>n+e.amountCents,0)).toBe((await s.call(s.path)).data.cashCents);
  expect((await s.call(s.path)).data.cashCents).toBe(initial+s.contract.rewardCents-60000);
  expect((await s.call(s.path)).data.reputation).toBe(12);
  expect((s.db.prepare('SELECT count(*) AS n FROM online_reservations').get() as any).n).toBe(0);
  await s.advance(1,'after');expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='mission_completion')).toHaveLength(1);
 }finally{s.db.close()}
});
it('operações: decisão crítica interrompe mesmo sem preferência e fallback ocorre uma vez',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_contracts SET risk=100 WHERE id=?').run(s.contract.id);
  const m=(await s.start()).data.missionId;
  expect((await s.advance(10)).data).toMatchObject({status:'interrupted',currentTurn:3,reason:'critical_decision'});
  let pending=(await s.call(s.path+'/decisions')).data;expect(pending).toHaveLength(1);expect(pending[0].expiresTurn).toBe(5);
  await s.advance(2,'deadline');expect((await s.call(s.path+'/decisions')).data).toHaveLength(0);
  await s.advance(1,'return');expect((await s.call(s.path+'/missions/'+m)).data.status).toBe('withdrawn');
  await s.advance(2,'later');expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='advance_refund')).toHaveLength(1);
  expect((await s.call(s.path)).data.reputation).toBe(8);
 }finally{s.db.close()}
});
it('operações: resolução explícita é idempotente e permite concluir',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_contracts SET risk=100 WHERE id=?').run(s.contract.id);const mission=(await s.start()).data.missionId;await s.advance(4);
  const d=(await s.call(s.path+'/decisions')).data[0],g=(await s.call(s.path)).data;
  const cmd={requestId:'resolve',expectedVersion:g.stateVersion,choice:'safer'};
  const first=await s.call(s.path+'/decisions/'+d.id+'/resolve',cmd);expect(first.status).toBe(200);expect((await s.call(s.path+'/decisions/'+d.id+'/resolve',cmd)).data).toEqual(first.data);
  await s.advance(2,'finish');expect((await s.call(s.path+'/missions/'+mission)).data.status).toBe('completed');
 }finally{s.db.close()}
});
it('operações: snapshots permanecem imutáveis e reserva impede atividade e segunda operação',async()=>{
 const s=await fixture();try{
  const mission=(await s.start()).data.missionId;const snapshot=s.db.prepare('SELECT snapshot_json FROM online_mission_assignments WHERE mission_id=? ORDER BY operator_id').all(mission);
  expect((await s.action('/operators/'+s.ids[0]+'/activities','rest',{type:'rest'})).data.code).toBe('OPERATOR_BUSY');
  const edit={name:'Equipe alterada',memberIds:[s.ids[1]],leaderId:s.ids[1],deputyId:null};expect((await s.action('/squads/'+s.squad,'edit',edit)).status).toBe(200);
  expect(s.db.prepare('SELECT snapshot_json FROM online_mission_assignments WHERE mission_id=? ORDER BY operator_id').all(mission)).toEqual(snapshot);
  expect((await s.call(s.path+'/missions/'+mission)).data.crew).toHaveLength(3);
  const other=(await s.call(s.path+'/contracts')).data.find((c:any)=>c.id!==s.contract.id);await s.action('/contracts/'+other.id+'/accept','accept-other');
  expect((await s.action('/contracts/'+other.id+'/start','start-other',s.plan)).status).toBe(422);
 }finally{s.db.close()}
});
it('operações: retirada devolve adiantamento, mantém custo e não permite novo pagamento',async()=>{
 const s=await fixture();try{
  const initial=(await s.call(s.path)).data.cashCents,mission=(await s.start()).data.missionId;
  await s.action('/missions/'+mission+'/withdraw','withdraw');await s.advance(1);
  expect((await s.call(s.path)).data.cashCents).toBe(initial-60000);
  expect((await s.action('/missions/'+mission+'/withdraw','again')).status).toBe(422);
  const c=(await s.call(s.path+'/contracts/'+s.contract.id)).data;expect(c.status).toBe('withdrawn');
 }finally{s.db.close()}
});
it('operações: rollback de término e retomada não duplicam recompensa',async()=>{
 let fail=false;const s=await fixture((sql,args)=>{if(fail&&sql.startsWith('INSERT INTO online_turn_summaries')&&args[1]===4)throw Error('final turn fault')});
 try{
  const mission=(await s.start()).data.missionId;fail=true;expect((await s.advance(4,'batch')).data).toMatchObject({status:'failed',processedTurns:3});
  expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='mission_completion')).toHaveLength(0);
  fail=false;const g=(await s.call(s.path)).data;expect((await s.call(s.path+'/advances/batch/resume',{expectedVersion:g.stateVersion})).data.status).toBe('completed');
  expect((await s.call(s.path+'/missions/'+mission)).data.status).toBe('completed');expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='mission_completion')).toHaveLength(1);
 }finally{s.db.close()}
});
it('operações: lote e turnos individuais têm os mesmos relatórios e hash',async()=>{
 const a=await fixture(),b=await fixture();try{
  const am=(await a.start()).data.missionId,bm=(await b.start()).data.missionId;
  await a.advance(4,'batch');for(let i=0;i<4;i++)await b.advance(1,'single-'+i);
  expect((await a.call(a.path+'/turns/4/summary')).data).toEqual((await b.call(b.path+'/turns/4/summary')).data);
  expect((await a.call(a.path+'/missions/'+am+'/reports')).data).toEqual((await b.call(b.path+'/missions/'+bm+'/reports')).data);
 }finally{a.db.close();b.db.close()}
});

it('operações: cancelar antes do início não movimenta caixa; requisitos inválidos não reservam',async()=>{
 const s=await fixture();try{
  const initial=(await s.call(s.path)).data.cashCents;
  await s.action('/contracts/'+s.contract.id+'/accept','accept');
  expect((await s.action('/contracts/'+s.contract.id+'/start','bad-leader',{...s.plan,leaderId:'outside'})).data.code).toBe('INVALID_LEADER');
  expect((await s.action('/contracts/'+s.contract.id+'/start','duplicate',{...s.plan,reinforcementIds:[s.ids[0]]})).data.code).toBe('DUPLICATE_OPERATOR');
  expect((s.db.prepare('SELECT count(*) AS n FROM online_reservations').get() as any).n).toBe(0);
  await s.action('/contracts/'+s.contract.id+'/cancel','cancel');expect((await s.call(s.path)).data.cashCents).toBe(initial);
  expect((await s.call(s.path+'/contracts/'+s.contract.id)).data.status).toBe('cancelled');
 }finally{s.db.close()}
});
it('operações: postura altera a ação autônoma e não revela utilidade ou sorteios',async()=>{
 const a=await fixture(),b=await fixture();try{
  for(const [s,posture] of [[a,'cautious'],[b,'aggressive']] as const){
   await s.action('/contracts/'+s.contract.id+'/accept','accept');
   await s.action('/contracts/'+s.contract.id+'/start','start',{...s.plan,directives:{posture,priority:'objective',riskTolerance:'high',withdrawalPolicy:'normal'}});
   await s.advance(1);
  }
  const ar=(await a.call(a.path+'/missions/mission-start/reports')).data,br=(await b.call(b.path+'/missions/mission-start/reports')).data;
  expect(ar[0].description).toContain('cautelosa');expect(br[0].description).toContain('acelerado');expect(JSON.stringify(ar)).not.toContain('utility');
 }finally{a.db.close();b.db.close()}
});

it('operações: fracasso devolve adiantamento e mantém custo, sem recompensa',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_contracts SET difficulty=100,risk=1 WHERE id=?').run(s.contract.id);
  const initial=(await s.call(s.path)).data.cashCents,m=(await s.start()).data.missionId;
  await s.advance(8);const decision=(await s.call(s.path+'/decisions')).data[0];
  if(decision)await s.action('/decisions/'+decision.id+'/resolve','continue-failure',{choice:'proceed'});
  await s.advance(5,'finish-failure');expect((await s.call(s.path+'/missions/'+m)).data.status).toBe('failed');
  expect((await s.call(s.path)).data.cashCents).toBe(initial-60000);
  expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='mission_completion')).toHaveLength(0);
 }finally{s.db.close()}
});
it('operações: inícios concorrentes com mesmo ID criam somente uma missão e um adiantamento',async()=>{
 const s=await fixture();try{
  await s.action('/contracts/'+s.contract.id+'/accept','accept');const version=(await s.call(s.path)).data.stateVersion;
  const command={...s.plan,requestId:'race',expectedVersion:version};
  const [a,b]=await Promise.all([s.call(s.path+'/contracts/'+s.contract.id+'/start',command),s.call(s.path+'/contracts/'+s.contract.id+'/start',command)]);
  expect(a.data).toEqual(b.data);expect(a.status).toBe(201);
  expect((s.db.prepare('SELECT count(*) AS n FROM online_missions').get() as any).n).toBe(1);
  expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='mission_advance')).toHaveLength(1);
 }finally{s.db.close()}
});
it('operações: incapacidade dos líderes força retorno e reforço conserva equipe permanente',async()=>{
 const s=await fixture();try{
  const reserveTeam=(await s.action('/squads','reserve',{name:'Reserva',memberIds:[s.ids[2]],leaderId:s.ids[2]})).data.squadId;
  const m=(await s.start()).data.missionId;
  s.db.prepare('UPDATE online_operators SET health=20 WHERE game_id=? AND id IN (?,?)').run(s.g.id,s.ids[0],s.ids[1]);
  await s.advance(2);expect((await s.call(s.path+'/missions/'+m)).data.status).toBe('withdrawn');
  expect((await s.call(s.path+'/squads/'+reserveTeam)).data.memberIds).toEqual([s.ids[2]]);
  expect((s.db.prepare('SELECT count(*) AS n FROM online_reservations').get() as any).n).toBe(0);
 }finally{s.db.close()}
});
it('operações: ofertas renovam no fechamento e aceite expira sem iniciar missão',async()=>{
 const s=await fixture();try{
  const old=(await s.call(s.path+'/contracts')).data.map((c:any)=>c.id);await s.action('/contracts/'+s.contract.id+'/accept','accept');
  await s.advance(28);const current=(await s.call(s.path+'/contracts')).data;expect(current).toHaveLength(6);expect(current.every((c:any)=>!old.includes(c.id))).toBe(true);
  expect((await s.call(s.path+'/contracts/'+s.contract.id)).data.status).toBe('expired');
 }finally{s.db.close()}
});

it('operações: demanda vinculada a evento usa o mesmo motor e preserva origem',async()=>{
 const s=await fixture();try{
  s.db.prepare("UPDATE online_contracts SET source='world_event',origin_event_id='fixture-crisis' WHERE id=?").run(s.contract.id);
  const c=(await s.call(s.path+'/contracts/'+s.contract.id)).data;expect(c.originEventId).toBe('fixture-crisis');expect(c.source).toBe('world_event');
  const m=(await s.start()).data.missionId;await s.advance(4);expect((await s.call(s.path+'/missions/'+m)).data.status).toBe('completed');
 }finally{s.db.close()}
});
