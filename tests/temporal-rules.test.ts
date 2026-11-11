import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {setup} from './online-helpers.ts';
import {enqueue,orderRoute} from '../worker/planning.ts';
import {nextTurnCount} from '../apps/web/utils/turnSelection.ts';

const digest=async(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function fixture(logistics=true){
 const s=setup(),g=(await s.call('/games',{requestId:'create',name:'Temporal PMC',seed:'temporal'})).data,path='/games/'+g.id;
 const people=()=>s.call(path+'/personnel').then(r=>r.data);
 const state=()=>s.call(path).then(r=>r.data);
 const action=async(url:string,id:string,body:any={})=>s.call(path+url,{requestId:id,expectedVersion:(await state()).stateVersion,...body});
 const pass=(id:string,turns=1)=>action('/advance',id,{turns,stopOnImportant:false});
 if(logistics)await s.call(path+'/logistics');
 const p=await people();for(let i=0;i<2;i++)await action('/recruitment/hire','hire'+i,{candidateId:p.candidates[i].id,weeks:4});
 if(logistics)await action('/equipment/purchases','kit',{catalogId:'combat-1',quantity:1});
 expect((await pass('prepare',4)).data.status).toBe('completed');
 const ids=(await people()).operators.map((o:any)=>o.id);
 await action('/squads','team',{name:'Alpha',memberIds:ids,leaderId:ids[0],deputyId:ids[1]});
 const contract=(await s.call(path+'/contracts')).data.find((c:any)=>c.type==='security');
 s.db.prepare('UPDATE online_contracts SET difficulty=1,risk=1 WHERE id=?').run(contract.id);
 const plan={squadId:'squad-team',memberIds:ids,leaderId:ids[0],deputyId:ids[1],reinforcementIds:[],equipmentIds:logistics?['kit-kit-0']:[]};
 return {...s,g,path,people,state,action,pass,ids,contract,plan};
}

it('renovação, aceite e cancelamento são imediatos, sem custo de tempo, e retries não repetem',async()=>{
 const s=await fixture();try{
  const before=await s.state(),op=(await s.people()).operators[0],body={requestId:'renew',expectedVersion:before.stateVersion,weeks:4};
  const renewed=await s.call(s.path+'/operators/'+op.id+'/renew-contract',body);
  expect(renewed.data).toMatchObject({action:'renew',currentTurn:4});expect(renewed.data.queued).toBeUndefined();
  expect((await s.call(s.path+'/operators/'+op.id+'/renew-contract',body)).data).toEqual(renewed.data);
  expect((await s.people()).operators[0].employment.end_turn).toBe(op.employment.end_turn+112);
  const acceptBody={requestId:'accept',expectedVersion:(await s.state()).stateVersion};
  const accepted=await s.call(s.path+'/contracts/'+s.contract.id+'/accept',acceptBody);
  expect(accepted.data).toMatchObject({action:'accept',currentTurn:4});
  expect((await s.call(s.path+'/contracts/'+s.contract.id+'/accept',acceptBody)).data).toEqual(accepted.data);
  const view=(await s.call(s.path+'/contracts/'+s.contract.id)).data;
  expect(view).toMatchObject({status:'accepted',acceptedTurn:4,mobilizationDueTurn:12,expiresTurn:28});
  expect((await s.action('/contracts/'+s.contract.id+'/cancel','cancel')).data.action).toBe('cancel');
  expect((await s.state()).currentTurn).toBe(before.currentTurn);expect((await s.state()).cashCents).toBe(before.cashCents);
  expect((await s.call(s.path+'/orders')).data.orders).toHaveLength(0);
 }finally{s.db.close()}
});
it('aceite no último período tem prazo próprio, permite iniciar após vencer a oferta e expira se não mobilizar',async()=>{
 const s=await fixture();try{
  await s.pass('to-27',23);await s.action('/contracts/'+s.contract.id+'/accept','accept');
  await s.pass('to-28');expect((await s.call(s.path+'/contracts/'+s.contract.id)).data).toMatchObject({status:'accepted',expiresTurn:28,mobilizationDueTurn:35});
  expect((await s.call(s.path+'/contracts/'+s.contract.id+'/plan',s.plan)).status).toBe(200);
  await s.pass('deadline',7);expect((await s.call(s.path+'/contracts/'+s.contract.id)).data.status).toBe('expired');
 }finally{s.db.close()}
});
for(const logistics of [true,false])it(`tratamento termina assim que cura e início sem necessidade é recusado (logística=${logistics})`,async()=>{
 const s=await fixture(logistics);try{
  expect((await s.action('/operators/'+s.ids[0]+'/activities','healthy',{type:'recovery'})).data.code).toBe('TREATMENT_UNNECESSARY');
  s.db.prepare('UPDATE online_operators SET health=98 WHERE id=?').run(s.ids[0]);
  expect((await s.action('/operators/'+s.ids[0]+'/activities','treat',{type:'recovery'})).data).toMatchObject({queued:true,dueTurn:5});
  const center=(await s.call(s.path+'/command-center')).data;expect(nextTurnCount(4,center)).toBe(1);
  await s.pass('healed');expect((await s.people()).operators[0]).toMatchObject({health:100,reservation:null,availability:'available'});
 }finally{s.db.close()}
});
it('ferimento grave exige oito períodos, permite interromper depois do mínimo e cura completa pode levar mais',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_operators SET health=10 WHERE id=?').run(s.ids[0]);
  await s.action('/operators/'+s.ids[0]+'/activities','treat',{type:'recovery'});await s.pass('first');
  expect((await s.people()).operators[0]).toMatchObject({health:15,minimumTreatmentEndTurn:12,reservation:{end_turn:22}});
  expect((await s.action('/operators/'+s.ids[0]+'/activities/cancel','early')).data.code).toBe('MINIMUM_TREATMENT');
  await s.pass('minimum',7);expect((await s.people()).operators[0]).toMatchObject({health:50,availability:'recovery'});
  const stopped=await s.action('/operators/'+s.ids[0]+'/activities/cancel','stop');expect(stopped.data).toMatchObject({action:'activity_cancel',currentTurn:12});
  expect((await s.people()).operators[0]).toMatchObject({health:50,reservation:null});
 }finally{s.db.close()}
});
it('treino preserva progresso ao interromper imediatamente e mostra resultado estimado da sessão',async()=>{
 const s=await fixture();try{
  const op=(await s.people()).operators[0],stored=s.db.prepare('SELECT profile_json FROM online_operators WHERE id=?').get(op.id) as any,profile=JSON.parse(stored.profile_json);profile.attributes.combat=50;
  s.db.prepare('UPDATE online_operators SET profile_json=? WHERE id=?').run(JSON.stringify(profile),op.id);
  const planned=await s.action('/operators/'+op.id+'/activities','train',{type:'training',attribute:'combat'});
  expect(planned.data.previewText).toContain('50 → 50');expect(planned.data.previewText).toContain('64/100');
  await s.pass('progress');const progress=(await s.people()).trainingProgress[0].progress;expect(progress).toBe(16);
  const stopBody={requestId:'stop',expectedVersion:(await s.state()).stateVersion};
  const stopped=await s.call(s.path+'/operators/'+op.id+'/activities/cancel',stopBody);
  expect(stopped.data).toMatchObject({action:'activity_cancel',currentTurn:5});
  expect((await s.call(s.path+'/operators/'+op.id+'/activities/cancel',stopBody)).data).toEqual(stopped.data);
  expect((await s.people()).trainingProgress[0].progress).toBe(progress);
  expect((await s.action('/operators/'+op.id+'/activities','again',{type:'training'})).data.queued).toBe(true);
 }finally{s.db.close()}
});
it('resposta e retirada são registradas agora; execução e devolução do adiantamento exigem tempo',async()=>{
 const s=await fixture();try{
  await s.action('/contracts/'+s.contract.id+'/accept','accept');
  await s.action('/contracts/'+s.contract.id+'/start','start',s.plan);await s.pass('launch');
  const turn=(await s.state()).currentTurn,mission='mission-start';
  s.db.prepare("INSERT INTO online_decisions VALUES(?,?,?,?,?,?,?,?,?,?)").run(s.g.id,'manual-decision',mission,1,turn,turn+2,'withdraw',null,null,'pending');
  s.db.prepare("UPDATE online_missions SET status='awaiting_decision' WHERE id=?").run(mission);
  const body={requestId:'answer',expectedVersion:(await s.state()).stateVersion,choice:'safer'};
  const answer=await s.call(s.path+'/decisions/manual-decision/resolve',body);
  expect(answer.data).toMatchObject({action:'decision',currentTurn:turn});expect((await s.call(s.path+'/decisions')).data).toHaveLength(0);
  expect((await s.call(s.path+'/decisions/manual-decision/resolve',body)).data).toEqual(answer.data);
  const cash=(await s.state()).cashCents;
  expect((await s.action('/missions/'+mission+'/withdraw','withdraw')).data).toMatchObject({action:'withdraw',currentTurn:turn});
  expect((await s.call(s.path+'/missions/'+mission)).data.status).toBe('returning');expect((await s.state()).cashCents).toBe(cash);
  const forecast=(await s.call(s.path+'/command-center')).data.advanceForecasts[0];expect(forecast.refundCents).toBe(s.contract.advanceCents);
  await s.pass('return');expect((await s.call(s.path+'/missions/'+mission)).data.status).toBe('withdrawn');expect((await s.state()).cashCents).toBe(cash-s.contract.advanceCents);
 }finally{s.db.close()}
});
it('comando sugere duração da compra e prevê folha, sede e ordens no intervalo selecionado',async()=>{
 const s=await fixture();try{
  await s.pass('to-27',23);
  await s.action('/equipment/purchases','extra-kit',{catalogId:'combat-1',quantity:1});
  const before=await s.state(),center=(await s.call(s.path+'/command-center')).data,f=center.advanceForecasts[0];
  expect(nextTurnCount(27,center)).toBe(1); // Payroll and headquarters fall before the delivery.
  expect(f.salaryCents).toBe((await s.people()).weeklySalaryCents);expect(f.headquartersCents).toBe(60000);
  expect(f.cashAfterObligationsCents).toBe(before.cashCents-180000-f.salaryCents-f.headquartersCents);
  await s.pass('pay');expect((await s.state()).cashCents).toBe(f.cashAfterObligationsCents);
 }finally{s.db.close()}
});
it('novas previsões incluem contratação planejada, dívida uma vez e melhoria que conclui no fechamento',async()=>{
 const s=await fixture();try{
  await s.pass('to-27',23);
  const p=await s.people(),candidate=p.candidates[0];
  await s.action('/recruitment/hire','new-hire',{candidateId:candidate.id,weeks:4});
  s.db.prepare('UPDATE online_employment SET arrears_cents=100 WHERE operator_id=?').run(s.ids[0]);
  s.db.prepare('UPDATE online_hq_modules SET target_level=2,due_turn=28 WHERE type=?').run('training');
  const center=(await s.call(s.path+'/command-center')).data,a=center.advanceForecasts[0],b=center.advanceForecasts[1];
  expect(a.debtCents).toBe(100);expect(b.debtCents).toBe(100);expect(a.headquartersCents).toBeGreaterThan(60000);
  const known=(await s.state()).cashCents-candidate.signingBonusCents-a.obligationsCents;expect(a.cashAfterObligationsCents).toBe(known);
  await s.pass('pay');expect((await s.state()).cashCents).toBe(known);
 }finally{s.db.close()}
});
it('ordens administrativas antigas mantêm confirmação e retry, sem perda de dados',async()=>{
 const s=await fixture();try{
  const body={requestId:'old-accept',expectedVersion:(await s.state()).stateVersion};
  const path=['games',s.g.id,'contracts',s.contract.id,'accept'],route=orderRoute(path,'POST')!;
  const old=await enqueue(s.DB,s.g.id,'owner',route,body,digest);
  expect(old.queued).toBe(true);expect((await s.call(s.path+'/contracts/'+s.contract.id+'/accept',body)).data).toEqual(old);
  await s.pass('commit-old');expect((await s.call(s.path+'/contracts/'+s.contract.id)).data.status).toBe('accepted');
  expect((await s.call(s.path+'/contracts/'+s.contract.id+'/accept',body)).data).toEqual(old);
 }finally{s.db.close()}
});
it('cancelar contrato com envio planejado exige remover a ordem; renovar vínculo não bloqueia o plano',async()=>{
 const s=await fixture();try{
  await s.action('/contracts/'+s.contract.id+'/accept','accept');await s.action('/contracts/'+s.contract.id+'/start','start',s.plan);
  expect((await s.action('/contracts/'+s.contract.id+'/cancel','cancel')).data.code).toBe('PENDING_ORDER_CONFLICT');
  expect((await s.action('/operators/'+s.ids[0]+'/renew-contract','renew',{weeks:4})).data.action).toBe('renew');
  expect((await s.pass('launch')).data.status).toBe('completed');
 }finally{s.db.close()}
});
it('cura antecipada por enfermaria avançada respeita o mínimo de ferimento grave e libera ao cumpri-lo',async()=>{
 const s=await fixture();try{
  s.db.prepare("UPDATE online_hq_modules SET level=5 WHERE type='infirmary'").run();
  s.db.prepare('UPDATE online_operators SET health=10 WHERE id=?').run(s.ids[0]);
  await s.action('/operators/'+s.ids[0]+'/activities','treat',{type:'recovery'});await s.pass('six',6);
  expect((await s.people()).operators[0]).toMatchObject({health:100,availability:'recovery',reservation:{end_turn:12}});
  expect((await s.action('/operators/'+s.ids[0]+'/activities/cancel','early')).data.code).toBe('MINIMUM_TREATMENT');
  await s.pass('eight',2);expect((await s.people()).operators[0]).toMatchObject({health:100,reservation:null});
 }finally{s.db.close()}
});
it('previsão de treino considera melhoria prevista durante a sessão e preserva estado na consulta',async()=>{
 const s=await fixture();try{
  s.db.prepare("UPDATE online_hq_modules SET target_level=2,due_turn=6 WHERE type='training'").run();
  const before=s.db.prepare('SELECT profile_json FROM online_operators WHERE id=?').get(s.ids[0]) as any;
  const p=await s.people(),estimate=p.operators[0].trainingEstimates.combat;
  expect(s.db.prepare('SELECT profile_json FROM online_operators WHERE id=?').get(s.ids[0])).toEqual(before);
  await s.action('/operators/'+s.ids[0]+'/activities','train',{type:'training',attribute:'combat'});await s.pass('session',4);
  const after=await s.people();expect(after.operators[0].attributes.combat).toBe(estimate.attributeAfter);
  expect(after.trainingProgress.find((p:any)=>p.operator_id===s.ids[0]).progress).toBe(estimate.progressAfter);
 }finally{s.db.close()}
});
it('contrato aceito em save antigo mantém prazo anterior e previsão inválida não altera campanha',async()=>{
 const s=await fixture();try{
  s.db.prepare("UPDATE online_contracts SET status='accepted' WHERE id=?").run(s.contract.id);
  expect((await s.call(s.path+'/contracts/'+s.contract.id)).data.mobilizationDueTurn).toBe(28);
  await s.action('/equipment/purchases','extra',{catalogId:'combat-1',quantity:1});
  s.db.prepare('UPDATE online_games SET cash_cents=1').run();const before=s.db.prepare('SELECT * FROM online_games').get();
  const center=(await s.call(s.path+'/command-center')).data;expect(center.planningError).toBeTruthy();expect(center.advanceForecasts).toEqual([]);expect(center.pendingOrders).toHaveLength(1);
  expect(s.db.prepare('SELECT * FROM online_games').get()).toEqual(before);
 }finally{s.db.close()}
});
