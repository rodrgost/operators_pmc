import { it,expect } from 'vitest';
import { setupImmediate as setup } from './online-helpers.ts';
async function campaign(onRun?:(sql:string,args:any[])=>void){const s=setup(onRun);const g=(await s.call('/games',{requestId:'create',name:'Personnel PMC',seed:'personnel'})).data;const path='/games/'+g.id;return {...s,g,path};}
async function view(s:any){return (await s.call(s.path+'/personnel')).data;}
async function hire(s:any,index=0,weeks=4,requestId='hire-'+index){const p=await view(s);return s.call(s.path+'/recruitment/hire',{requestId,expectedVersion:p.stateVersion,candidateId:p.candidates[index].id,weeks});}
async function advance(s:any,turns:number,requestId='advance'){const g=(await s.call(s.path)).data;return s.call(s.path+'/advance',{requestId,expectedVersion:g.stateVersion,turns,stopOnImportant:false});}
it('pessoal: mercado determinístico, contratação idempotente e projeção sem seed',async()=>{
 const a=await campaign(),b=await campaign();try{
  const av=await view(a),bv=await view(b);expect(av.candidates).toEqual(bv.candidates);expect(av.candidates).toHaveLength(6);
  const command={requestId:'hire',expectedVersion:0,candidateId:av.candidates[0].id,weeks:4};
  const first=await a.call(a.path+'/recruitment/hire',command);expect(first.status).toBe(201);
  expect((await a.call(a.path+'/recruitment/hire',command)).data).toEqual(first.data);
  expect((await view(a)).operators).toHaveLength(1);expect((await view(a)).operators[0].availability).toBe('available');
  expect((await a.call(a.path)).data.cashCents).toBe(10000000-av.candidates[0].signingBonusCents);
  const ledger=(await a.call(a.path+'/finances/ledger')).data;expect(ledger).toHaveLength(2);
  expect((await a.call(a.path+'/recruitment/hire',{...command,weeks:8})).status).toBe(409);
  expect(JSON.stringify(await view(a))).not.toContain('"seed"');
  expect((await a.call(a.path+'/personnel',undefined,'intruder')).status).toBe(404);
 }finally{a.db.close();b.db.close()}
});
it('pessoal: salários reconciliam ledger, renovação preserva salário e mercado expira em 28',async()=>{
 const s=await campaign();try{
  const old=await view(s);const hired=await hire(s);expect(hired.status).toBe(201);
  const initial=(await view(s)).operators[0],salary=initial.employment.salary_cents;
  expect((await advance(s,28)).data.status).toBe('completed');
  const current=await view(s);expect(current.candidates.some((c:any)=>c.id===old.candidates[1].id)).toBe(false);
  expect(current.operators[0].employment.next_pay_turn).toBe(56);
  const ledger=(await s.call(s.path+'/finances/ledger')).data;
  expect(ledger.reduce((n:number,e:any)=>n+e.amountCents,0)).toBe((await s.call(s.path)).data.cashCents);
  expect(ledger.filter((e:any)=>e.entryType==='salary_payment').map((e:any)=>e.amountCents)).toEqual([-salary]);
  const renew={requestId:'renew',expectedVersion:current.stateVersion,weeks:4};
  expect((await s.call(s.path+'/operators/'+initial.id+'/renew-contract',renew)).status).toBe(200);
  expect((await s.call(s.path+'/operators/'+initial.id+'/renew-contract',renew)).status).toBe(200);
  expect((await view(s)).operators[0].employment.end_turn).toBe(224);
 }finally{s.db.close()}
});
it('pessoal: último salário é pago uma vez e contrato expirado pode ser renovado',async()=>{
 const s=await campaign();try{
  await hire(s);for(let i=0;i<4;i++)expect((await advance(s,28,'week-'+i)).data.status).toBe('completed');
  const p=await view(s),op=p.operators[0];expect(op.availability).toBe('contract_pending');
  expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='salary_payment')).toHaveLength(4);
  expect((await s.call(s.path+'/operators/'+op.id+'/renew-contract',{requestId:'renew-expired',expectedVersion:p.stateVersion,weeks:8})).status).toBe(200);
  expect((await view(s)).operators[0].employment.end_turn).toBe(336);
 }finally{s.db.close()}
});
it('pessoal: falta de caixa cria dívida sem débito fictício; quitação posterior é única',async()=>{
 const s=await campaign();try{
  await hire(s);const before=await view(s),op=before.operators[0];
  // Fixture models an independently reconciled expense from a later subsystem.
  const cash=(await s.call(s.path)).data.cashCents;
  s.db.prepare('INSERT INTO online_ledger VALUES(?,?,?,?,?)').run(s.g.id,'fixture-expense','expense',0,-cash);
  s.db.prepare('UPDATE online_games SET cash_cents=0 WHERE id=?').run(s.g.id);
  await advance(s,28);const p=await view(s);expect(p.arrearsCents).toBe(op.employment.salary_cents);expect(p.operators[0].morale).toBe(70);
  expect((await s.call(s.path)).data.status).toBe('financial_crisis');
  expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='salary_payment')).toHaveLength(0);
  const credit=op.employment.salary_cents;
  s.db.prepare('INSERT INTO online_ledger VALUES(?,?,?,?,?)').run(s.g.id,'fixture-income','income',28,credit);
  s.db.prepare('UPDATE online_games SET cash_cents=? WHERE id=?').run(credit,s.g.id);
  await advance(s,1,'settle');expect((await view(s)).arrearsCents).toBe(0);
  expect((await s.call(s.path+'/finances/ledger')).data.reduce((n:number,e:any)=>n+e.amountCents,0)).toBe(0);
 }finally{s.db.close()}
});
it('pessoal: equipe, substituto, treino conjunto, exclusão de agenda e familiaridade',async()=>{
 const s=await campaign();try{
  await hire(s,0,4,'h1');await hire(s,0,4,'h2');let p=await view(s);const ids=p.operators.map((o:any)=>o.id);
  const cmd={requestId:'squad',expectedVersion:p.stateVersion,name:'Equipe Alfa',memberIds:ids,leaderId:ids[0],deputyId:ids[1]};
  expect((await s.call(s.path+'/squads',cmd)).status).toBe(201);p=await view(s);const squad=p.squads[0];expect(squad.ready).toBe(true);
  expect((await s.call(s.path+'/squads/'+squad.id+'/training',{requestId:'training',expectedVersion:p.stateVersion})).status).toBe(200);
  p=await view(s);expect(p.operators.every((o:any)=>o.availability==='training')).toBe(true);
  expect((await s.call(s.path+'/operators/'+ids[0]+'/activities',{requestId:'double',expectedVersion:p.stateVersion,type:'rest'})).status).toBe(422);
  await advance(s,4);p=await view(s);expect(p.familiarity[0].score).toBe(2);expect(p.squads[0].familiarity).toBe(2);
  expect(p.operators.every((o:any)=>o.availability==='available')).toBe(true);
  s.db.prepare('UPDATE online_operators SET health=20 WHERE game_id=? AND id=?').run(s.g.id,ids[0]);
  expect((await view(s)).squads[0].effectiveLeaderId).toBe(ids[1]);
 }finally{s.db.close()}
});
it('pessoal: candidaturas concorrentes não duplicam operador e ação não reutiliza ID de turno',async()=>{
 const s=await campaign();try{
  const p=await view(s),candidateId=p.candidates[0].id;
  const r=await Promise.all(['a','b'].map(requestId=>s.call(s.path+'/recruitment/hire',{requestId,expectedVersion:0,candidateId,weeks:4})));
  expect(r.map(x=>x.status).sort()).toEqual([201,409]);expect((await view(s)).operators).toHaveLength(1);
  const p2=await view(s);const winner=r.find(x=>x.status===201)!.data;
  // Exactly the winning request ID is protected across command families.
  const winningId=r[0].status===201?'a':'b';
  expect((await s.call(s.path+'/advance',{requestId:winningId,expectedVersion:p2.stateVersion,turns:1})).status).toBe(409);
 }finally{s.db.close()}
});
it('pessoal: avanço individual e lote produzem mesmos salários, condições e hashes',async()=>{
 const a=await campaign(),b=await campaign();try{
  await hire(a);await hire(b);
  await advance(a,28,'batch');for(let i=0;i<28;i++)await advance(b,1,'single-'+i);
  expect((await a.call(a.path+'/turns/28/summary')).data).toEqual((await b.call(b.path+'/turns/28/summary')).data);
  expect((await view(a)).operators).toEqual((await view(b)).operators);
 }finally{a.db.close();b.db.close()}
});

it('pessoal: oferta expirada, dinheiro e capacidade são validados antes de contratar',async()=>{
 const s=await campaign();try{
  const p=await view(s),expired=p.candidates[0];await advance(s,28);
  let version=(await view(s)).stateVersion;
  expect((await s.call(s.path+'/recruitment/hire',{requestId:'expired',expectedVersion:version,candidateId:expired.id,weeks:4})).data.code).toBe('CANDIDATE_UNAVAILABLE');
  s.db.prepare('UPDATE online_games SET cash_cents=0 WHERE id=?').run(s.g.id);
  expect((await hire(s)).data.code).toBe('INSUFFICIENT_CASH');
  s.db.prepare('UPDATE online_games SET cash_cents=100000000 WHERE id=?').run(s.g.id);
  for(let week=0;week<2;week++){
   for(let i=0;i<6;i++)expect((await hire(s,0,12,'hire-'+week+'-'+i)).status).toBe(201);
   await advance(s,28,'next-'+week);
  }
  expect((await view(s)).employed).toBe(12);expect((await hire(s,0,4,'overflow')).data.code).toBe('CAPACITY');
 }finally{s.db.close()}
});
it('pessoal: mudanças de equipe preservam histórico e impedem vínculos duplicados',async()=>{
 const s=await campaign();try{
  await hire(s,0,4,'a');await hire(s,0,4,'b');let p=await view(s);const ids=p.operators.map((o:any)=>o.id);
  const cmd={requestId:'team',expectedVersion:p.stateVersion,name:'Alfa',memberIds:ids,leaderId:ids[0],deputyId:ids[1]};
  const created=await s.call(s.path+'/squads',cmd);expect(created.status).toBe(201);p=await view(s);
  expect((await s.call(s.path+'/squads',{...cmd,requestId:'duplicate',expectedVersion:p.stateVersion,name:'Beta'})).data.code).toBe('ALREADY_ASSIGNED');
  expect((await s.call(s.path+'/squads/'+created.data.squadId,{...cmd,requestId:'remove',expectedVersion:p.stateVersion,memberIds:[ids[1]],leaderId:ids[1],deputyId:null})).status).toBe(200);
  p=await view(s);expect(p.squads[0].ready).toBe(false);
  expect((s.db.prepare('SELECT count(*) AS n FROM online_squad_members WHERE left_turn IS NOT NULL').get() as any).n).toBe(1);
  expect((await s.call(s.path+'/squads/'+created.data.squadId,{...cmd,requestId:'rejoin',expectedVersion:p.stateVersion})).status).toBe(200);
  expect((s.db.prepare('SELECT count(*) AS n FROM online_squad_members').get() as any).n).toBe(3);
 }finally{s.db.close()}
});
it('pessoal: reserva de missão bloqueia atividades e índice impede agenda dupla',async()=>{
 const s=await campaign();try{
  await hire(s);const p=await view(s),id=p.operators[0].id;
  s.db.prepare('INSERT INTO online_reservations VALUES(?,?,?,?,?,?)').run(s.g.id,id,'mission','fixture-mission',0,20);
  expect((await s.call(s.path+'/operators/'+id+'/activities',{requestId:'rest',expectedVersion:p.stateVersion,type:'rest'})).data.code).toBe('OPERATOR_BUSY');
  expect(()=>s.db.prepare('INSERT INTO online_reservations VALUES(?,?,?,?,?,?)').run(s.g.id,id,'rest','duplicate',0,4)).toThrow();
 }finally{s.db.close()}
});
it('pessoal: falha no ledger desfaz contratação e retry continua sem duplicar',async()=>{
 let fail=false;const s=await campaign(sql=>{if(fail&&sql.startsWith('INSERT INTO online_ledger'))throw Error('injected personnel ledger fault');});
 const previous=console.error;console.error=()=>{};
 try{
  const p=await view(s);fail=true;
  const command={requestId:'atomic-hire',expectedVersion:p.stateVersion,candidateId:p.candidates[0].id,weeks:4};
  expect((await s.call(s.path+'/recruitment/hire',command)).status).toBe(500);
  expect((await view(s)).operators).toHaveLength(0);expect((await s.call(s.path)).data.cashCents).toBe(10000000);
  fail=false;expect((await s.call(s.path+'/recruitment/hire',command)).status).toBe(201);
  expect((await view(s)).operators).toHaveLength(1);
 }finally{console.error=previous;s.db.close()}
});

it('pessoal: falha no fechamento salarial faz rollback e retomada paga uma única vez',async()=>{
 let fail=false;const s=await campaign((sql,args)=>{if(fail&&sql.startsWith('INSERT INTO online_turn_summaries')&&args[1]===28)throw Error('payroll fault');});
 try{
  await hire(s);const initial=(await s.call(s.path)).data.cashCents;fail=true;
  const failed=await advance(s,28,'payroll');expect(failed.data).toMatchObject({status:'failed',currentTurn:27,processedTurns:27});
  expect((await s.call(s.path)).data.cashCents).toBe(initial);expect((await view(s)).operators[0].employment.next_pay_turn).toBe(28);
  fail=false;const g=(await s.call(s.path)).data;
  expect((await s.call(s.path+'/advances/payroll/resume',{expectedVersion:g.stateVersion})).data).toMatchObject({status:'completed',currentTurn:28});
  expect((await s.call(s.path+'/finances/ledger')).data.filter((e:any)=>e.entryType==='salary_payment')).toHaveLength(1);
 }finally{s.db.close()}
});

it('pessoal: rotas de membros mantêm histórico e retry idempotente',async()=>{
 const s=await campaign();try{
  await hire(s);let p=await view(s);const operatorId=p.operators[0].id;
  const team=(await s.call(s.path+'/squads',{requestId:'empty-team',expectedVersion:p.stateVersion,name:'Equipe vazia'})).data;
  p=await view(s);const add={requestId:'add-member',expectedVersion:p.stateVersion,operatorId};
  expect((await s.call(s.path+'/squads/'+team.squadId+'/members',add)).status).toBe(200);
  expect((await s.call(s.path+'/squads/'+team.squadId+'/members',add)).status).toBe(200);
  p=await view(s);const remove={requestId:'remove-member',expectedVersion:p.stateVersion};
  expect((await s.call(s.path+'/squads/'+team.squadId+'/members/'+operatorId,remove,'owner','DELETE')).status).toBe(200);
  const history=(await s.call(s.path+'/squads/'+team.squadId+'/history')).data;
  expect(history).toHaveLength(1);expect(history[0].leftTurn).toBe(0);
 }finally{s.db.close()}
});
