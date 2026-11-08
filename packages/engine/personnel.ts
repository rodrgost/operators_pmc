import balance from '../rules/personnel.json' with { type:'json' };
export { balance };
export const attributes=['combat','stealth','technical','perception','endurance','leadership'] as const;
export const specializations=['recon','assault','medic','technical','leader'] as const;
export type Digest=(value:unknown)=>Promise<string>;
export interface Personnel {operators:any[];contracts:any[];candidates:any[];squads:any[];members:any[];familiarity:any[];reservations:any[]}
export const emptyPersonnel=():Personnel=>({operators:[],contracts:[],candidates:[],squads:[],members:[],familiarity:[],reservations:[]});
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export async function market(seed:string,week:number,reputation:number,digest:Digest){
 const first=['Ana','Bruno','Camila','Diego','Elisa','Felipe','Helena','Igor','Joana','Lucas','Maya','Nicolas'];
 const last=['Vale','Torres','Costa','Moraes','Vidal','Andrade','Lima','Reis','Nunes','Matos','Pires','Duarte'];
 const traits=['disciplined','cautious','impulsive','resilient','loyal','ambitious'];
 return Promise.all(Array.from({length:balance.candidatesPerWeek},async(_,i)=>{
  const hash=await digest([seed,balance.version,week,'recruitment',i]);
  const n=(offset:number,max:number)=>parseInt(hash.slice(offset,offset+4),16)%max;
  const level=1+n(0,Math.min(10,2+Math.floor(reputation/15)));
  const specialization=specializations[n(4,specializations.length)];
  const stats=Object.fromEntries(attributes.map((a,j)=>[a,Math.min(95,25+level*5+n(8+j*4,21))]));
  const band=balance.salaryBands[level<=2?0:level<=6?1:2];
  const salary=(band[0]+n(36,band[1]-band[0]+1))*100;
  const profile={name:first[n(40,first.length)]+' '+last[n(44,last.length)],level,xp:0,specialization,attributes:stats,traits:[traits[n(48,6)],traits[(n(48,6)+1+n(52,5))%6]]};
  return {id:'candidate-'+hash.slice(0,24),week,profile_json:JSON.stringify(profile),salary_cents:salary,bonus_cents:salary*balance.signingSalaryFactor,hired:0};
 }));
}
export function employment(p:Personnel,id:string,turn:number){return p.contracts.find(c=>c.operator_id===id&&c.status==='active'&&c.start_turn<=turn&&c.end_turn>turn)}
export function availability(p:Personnel,op:any,turn:number){
 if(!employment(p,op.id,turn))return 'contract_pending';
 const reservation=p.reservations.find(r=>r.operator_id===op.id);
 if(reservation)return reservation.kind;
 if(op.health<balance.minimumHealth)return 'recovery_needed';
 if(op.fatigue>=balance.exhaustionFatigue)return 'exhausted';
 return 'available';
}
export function squadProjection(p:Personnel,s:any,turn:number){
 const ids=p.members.filter(m=>m.squad_id===s.id).map(m=>m.operator_id).sort();
 const apt=(id:string)=>ids.includes(id)&&p.operators.some(o=>o.id===id&&availability(p,o,turn)==='available');
 const leader=apt(s.leader_id)?s.leader_id:apt(s.deputy_id)?s.deputy_id:null;
 const scores:number[]=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)scores.push(p.familiarity.find(f=>f.operator_low===ids[i]&&f.operator_high===ids[j])?.score??0);
 return {id:s.id,name:s.name,specialization:s.specialization,leaderId:s.leader_id,deputyId:s.deputy_id,effectiveLeaderId:leader,memberIds:ids,directives:JSON.parse(s.directives_json),familiarity:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,ready:ids.length>=balance.squadMin&&!!leader&&ids.every(apt)};
}
export function canonical(p:Personnel){return Object.fromEntries(Object.entries(p).map(([key,rows])=>[key,[...rows].sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'))]));}
export async function personnelTurn(original:Personnel,turn:number,cash:number,seed:string,reputation:number,digest:Digest){
 const p:Personnel=structuredClone(original),ledger:any[]=[],events:any[]=[],history:any[]=[];
 const add=(type:string,title:string,description:string,important=false)=>{events.push({type,title,description,important});};
 const record=(id:string,type:string,title:string,data:any)=>history.push({id,turn,event_type:type,title,data_json:JSON.stringify(data)});
 // Final accrued wage is due at the end boundary before the employment becomes expired.
 for(const c of p.contracts){
  const op=p.operators.find(o=>o.id===c.operator_id);if(!op)continue;
  const due=c.status==='active'&&c.next_pay_turn<=turn&&c.next_pay_turn<=c.end_turn;
  if(due){c.arrears_cents+=c.salary_cents;c.next_pay_turn+=28;}
  if(c.arrears_cents>0&&cash>=c.arrears_cents){
   const amount=c.arrears_cents;cash-=amount;c.arrears_cents=0;
   ledger.push({sourceId:'salary:'+c.id+':'+turn,entryType:'salary_payment',turn,amountCents:-amount});
   op.morale=clamp(op.morale+balance.paidMorale);op.loyalty=clamp(op.loyalty+balance.paidLoyalty);
   add('salary_paid','Salário pago',JSON.parse(op.profile_json).name+' · pagamento confirmado.');record('salary:'+c.id+':'+turn,'salary_paid','Salário pago',{operatorId:op.id,amountCents:amount});
  }else if(due){op.morale=clamp(op.morale-balance.missedPayMorale);op.loyalty=clamp(op.loyalty-balance.missedPayLoyalty);add('salary_unpaid','Salário em atraso',JSON.parse(op.profile_json).name+' · caixa insuficiente.',true);record('unpaid:'+c.id+':'+turn,'salary_unpaid','Salário em atraso',{operatorId:op.id,arrearsCents:c.arrears_cents});}
  if(c.status==='active'&&c.end_turn<=turn){c.status='expired';add('employment_expired','Vínculo encerrado',JSON.parse(op.profile_json).name+' aguarda renovação.',true);record('expired:'+c.id,'employment_expired','Vínculo encerrado',{operatorId:op.id});}
 }
 const ended=p.reservations.filter(r=>r.kind!=='mission'&&r.end_turn<=turn);
 for(const r of ended){const op=p.operators.find(o=>o.id===r.operator_id);if(!op)continue;
  if(r.kind==='rest')op.fatigue=clamp(op.fatigue-balance.restFatigue);
  if(r.kind==='recovery')op.health=clamp(op.health+balance.recoveryHealth);
  if(r.kind==='training')op.fatigue=clamp(op.fatigue+balance.trainingFatigue);
  record('activity:'+r.source_id+':'+op.id,'activity_completed','Atividade concluída',{operatorId:op.id,kind:r.kind});
 }
 const groups=[...new Set(ended.filter(r=>r.kind==='training').map(r=>r.source_id))];
 for(const group of groups){const ids=ended.filter(r=>r.kind==='training'&&r.source_id===group).map(r=>r.operator_id).sort();
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   let f=p.familiarity.find(f=>f.operator_low===ids[i]&&f.operator_high===ids[j]);if(!f){f={operator_low:ids[i],operator_high:ids[j],score:0};p.familiarity.push(f);}f.score=clamp(f.score+balance.familiarityGain);
  }
 }
 if(ended.length)add('activity_completed','Atividades concluídas',ended.length+' operador(es) concluíram atividades.');
 p.reservations=p.reservations.filter(r=>!ended.includes(r));
 if(turn%28===0){p.candidates=await market(seed,turn/28,reputation,digest);add('recruitment_refreshed','Mercado renovado','Novos candidatos disponíveis para contratação.');}
 return {personnel:p,cash,ledger,events,history,status:p.contracts.some(c=>c.arrears_cents>0)?'financial_crisis' as const:'active' as const};
}
