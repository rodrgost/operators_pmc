import {it,expect} from 'vitest';
import {setup} from './online-helpers.ts';

async function fixture(logistics=true){
 const s=setup(),g=(await s.call('/games',{requestId:'create',name:'Execution PMC',seed:'execution'})).data,path='/games/'+g.id;
 if(logistics)await s.call(path+'/logistics');
 async function action(url:string,id:string,body:any={}){const current=(await s.call(path)).data;return s.call(path+url,{requestId:id,expectedVersion:current.stateVersion,...body});}
 const pass=(id:string,turns=1)=>action('/advance',id,{turns,stopOnImportant:false});
 const people=() => s.call(path+'/personnel').then(r=>r.data);
 const p=await people();await action('/recruitment/hire','hire',{candidateId:p.candidates[0].id,weeks:4});await pass('hire-turn');
 const operatorId=(await people()).operators[0].id;
 return {...s,g,path,action,pass,people,operatorId};
}
for(const logistics of [true,false])it(`descanso progressivo conta o primeiro avanço e termina ao zerar (logística=${logistics})`,async()=>{
 const s=await fixture(logistics);try{
  s.db.prepare('UPDATE online_operators SET fatigue=12 WHERE game_id=?').run(s.g.id);
  const planned=await s.action('/operators/'+s.operatorId+'/activities','rest',{type:'rest'});
  expect(planned.data).toMatchObject({queued:true});expect(planned.data.previewText).toContain('12 → 7');expect(planned.data.previewText).toContain('T4');
  expect((await s.people()).operators[0]).toMatchObject({fatigue:12,reservation:null,restTurns:3});
  await s.pass('first');expect((await s.people()).operators[0]).toMatchObject({fatigue:7,availability:'rest',reservation:{end_turn:4}});
  await s.pass('second');expect((await s.people()).operators[0].fatigue).toBe(2);
  await s.pass('third');expect((await s.people()).operators[0]).toMatchObject({fatigue:0,availability:'available',reservation:null});
 }finally{s.db.close()}
});
it('descanso interrompe imediatamente, preserva recuperação e permite nova ordem no mesmo turno',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_operators SET fatigue=40 WHERE game_id=?').run(s.g.id);
  await s.action('/operators/'+s.operatorId+'/activities','rest',{type:'rest'});await s.pass('first');
  const g=(await s.call(s.path)).data,body={requestId:'cancel',expectedVersion:g.stateVersion};
  const stopped=await s.call(s.path+'/operators/'+s.operatorId+'/activities/cancel',body);
  expect(stopped.data).toMatchObject({action:'activity_cancel',currentTurn:2});
  // Repeating the same command must return its original result after the reservation is gone.
  expect((await s.call(s.path+'/operators/'+s.operatorId+'/activities/cancel',body)).data).toEqual(stopped.data);
  expect((await s.people()).operators[0]).toMatchObject({fatigue:35,reservation:null});
  expect((await s.call(s.path+'/orders')).data.orders).toHaveLength(0);
  expect((await s.action('/operators/'+s.operatorId+'/activities','train',{type:'training'})).data.queued).toBe(true);
 }finally{s.db.close()}
});
it('descanso desnecessário é recusado e descanso curto termina no primeiro avanço',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_operators SET fatigue=0 WHERE game_id=?').run(s.g.id);
  expect((await s.action('/operators/'+s.operatorId+'/activities','zero',{type:'rest'})).data.code).toBe('REST_UNNECESSARY');
  s.db.prepare('UPDATE online_operators SET fatigue=3 WHERE game_id=?').run(s.g.id);
  await s.action('/operators/'+s.operatorId+'/activities','short',{type:'rest'});await s.pass('short-turn');
  expect((await s.people()).operators[0]).toMatchObject({fatigue:0,reservation:null});
 }finally{s.db.close()}
});
it('descanso antigo estende a previsão até zerar sem perder progresso',async()=>{
 const s=await fixture();try{
  s.db.prepare('UPDATE online_operators SET fatigue=40 WHERE game_id=?').run(s.g.id);
  await s.action('/operators/'+s.operatorId+'/activities','rest',{type:'rest'});await s.pass('first');
  s.db.prepare('UPDATE online_reservations SET end_turn=3 WHERE game_id=?').run(s.g.id);
  await s.pass('old-end');expect((await s.people()).operators[0]).toMatchObject({fatigue:30,availability:'rest',reservation:{end_turn:9}});
 }finally{s.db.close()}
});
it('contratar, montar equipe, aceitar e enviar missão no mesmo planejamento',async()=>{
 const s=await fixture();try{
  await s.action('/equipment/purchases','kit',{catalogId:'combat-1',quantity:1});await s.pass('delivery',4);
  const before=await s.people(),candidate=before.candidates[0],ids=[s.operatorId,'operator-'+candidate.id];
  await s.action('/recruitment/hire','second-hire',{candidateId:candidate.id,weeks:4});
  expect((await s.action('/squads','alpha',{name:'Alpha',memberIds:ids,leaderId:ids[0],deputyId:ids[1]})).data.queued).toBe(true);
  const p=await s.people();expect(p.operators).toHaveLength(1);expect(p.squads).toHaveLength(0);expect(p.plannedPersonnel.squads[0]).toMatchObject({id:'squad-alpha',memberIds:expect.arrayContaining(ids)});
  const contract=(await s.call(s.path+'/contracts')).data.find((c:any)=>c.type==='security');
  s.db.prepare('UPDATE online_contracts SET risk=1,difficulty=1 WHERE id=?').run(contract.id);
  await s.action('/contracts/'+contract.id+'/accept','accept');
  const body={squadId:'squad-alpha',memberIds:ids,leaderId:ids[0],deputyId:ids[1],reinforcementIds:[],equipmentIds:['kit-kit-0']};
  const reviewed=await s.call(s.path+'/contracts/'+contract.id+'/plan',body);expect(reviewed.status).toBe(200);
  expect((await s.action('/contracts/'+contract.id+'/start','start',body)).data.queued).toBe(true);
  expect((await s.pass('launch')).data.status).toBe('completed');
  expect((await s.people()).squads).toHaveLength(1);
  expect(s.db.prepare('SELECT count(*) n FROM online_missions').get()).toMatchObject({n:1});
  const saved=s.db.prepare("SELECT command_json FROM online_pending_orders WHERE id='alpha'").get() as any;
  expect((await s.call(s.path+'/squads',JSON.parse(saved.command_json))).data).toMatchObject({queued:true,orderId:'alpha'});
 }finally{s.db.close()}
});
it('remover contratação dependente mantém ordens visíveis e bloqueia confirmação atômica',async()=>{
 const s=await fixture();try{
  const candidate=(await s.people()).candidates[0],ids=[s.operatorId,'operator-'+candidate.id];
  await s.action('/recruitment/hire','second',{candidateId:candidate.id,weeks:4});
  await s.action('/squads','dependent',{name:'Alpha',memberIds:ids,leaderId:ids[0]});
  await s.action('/orders/second/cancel','remove');
  const p=await s.people();expect(p.planningError).toBeTruthy();expect(p.pendingOrders).toHaveLength(1);expect(p.operators).toHaveLength(1);
  expect((await s.pass('invalid')).data.code).toBe('PENDING_ORDER_INVALID');
  expect((await s.call(s.path)).data.currentTurn).toBe(1);
  await s.action('/orders/dependent/cancel','remove-team');expect((await s.pass('valid')).data.status).toBe('completed');
 }finally{s.db.close()}
});
