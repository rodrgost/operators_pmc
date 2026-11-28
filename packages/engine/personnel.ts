import {operatorIdentity,uniqueOperatorName,operatorAppearance} from './content.ts';
import balance from '../rules/personnel.json' with { type:'json' };
import operationsRules from '../rules/operations.json' with { type:'json' };
export { balance };
export const restFatiguePerTurn=balance.restFatigue/balance.activityTurns;
export const restTurns=(fatigue:number)=>Math.max(1,Math.ceil(fatigue/restFatiguePerTurn));
export const recoveryHealthPerTurn=balance.recoveryHealth/balance.activityTurns;
export const startingXpForLevel=(level:number)=>Math.max(0,level-1)*operationsRules.levelXpStep;
export const attributes=['combat','stealth','technical','perception','endurance','leadership'] as const;
export const specializations=['recon','assault','medic','technical','leader'] as const;
type Attribute=(typeof attributes)[number];
const specializationAttributes={
 recon:['stealth','perception'],
 assault:['combat','endurance'],
 medic:['technical','perception'],
 technical:['technical','stealth'],
 leader:['leadership','perception'],
} satisfies Record<(typeof specializations)[number],readonly [Attribute,Attribute]>;
export type Digest=(value:unknown)=>Promise<string>;
export interface Personnel {operators:any[];contracts:any[];candidates:any[];squads:any[];members:any[];familiarity:any[];reservations:any[]}
export const emptyPersonnel=():Personnel=>({operators:[],contracts:[],candidates:[],squads:[],members:[],familiarity:[],reservations:[]});
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function uniqueCandidateNames(candidates:any[],operators:any[]=[]){
 const used=new Set<string>(operators.map(o=>JSON.parse(o.profile_json).name));
 return candidates.map(candidate=>{
  if(candidate.hired)return candidate;
  const profile=JSON.parse(candidate.profile_json),name=uniqueOperatorName(profile.name,candidate.id,used);
  used.add(name);
  return name===profile.name?candidate:{...candidate,profile_json:JSON.stringify({...profile,name,...operatorAppearance(name,profile.specialization)})};
 });
}
export async function market(seed:string,week:number,reputation:number,digest:Digest,operators:any[]=[]){
 const traits=['disciplined','cautious','impulsive','resilient','loyal','ambitious'];
 const candidates=await Promise.all(Array.from({length:balance.candidatesPerWeek},async(_,i)=>{
  const hash=await digest([seed,balance.version,week,'recruitment',i]);
  const n=(offset:number,max:number)=>parseInt(hash.slice(offset,offset+4),16)%max;
  const level=1+n(0,Math.min(balance.salaryBands.length,2+Math.floor(reputation/15)));
  const specialization=specializations[n(4,specializations.length)];
  const [primary,secondary]=specializationAttributes[specialization];
  const {levelOneBase,spread,primaryBonus,secondaryBonus}=balance.recruitmentAttributes;
  const base=levelOneBase+(level-1)*operationsRules.levelAttributeGain;
  const stats=Object.fromEntries(attributes.map((attribute,index)=>{
   const bonus=attribute===primary?primaryBonus:attribute===secondary?secondaryBonus:0;
   return [attribute,base+bonus+n(8+index*4,spread+1)] as const;
  })) as Record<Attribute,number>;
  const bestOther=Math.max(...attributes.filter(attribute=>attribute!==primary&&attribute!==secondary).map(attribute=>stats[attribute]));
  stats[secondary]=Math.max(stats[secondary],bestOther+1);
  stats[primary]=Math.max(stats[primary],stats[secondary]+1);
  const [minimumSalary,maximumSalary]=balance.salaryBands[level-1];
  const primaryQuality=(stats[primary]-base-primaryBonus)/spread;
  const marketVariation=n(36,101)/100;
  const weight=balance.primaryAttributeSalaryWeight;
  const salaryPosition=primaryQuality*weight+marketVariation*(1-weight);
  const salary=Math.round(minimumSalary+(maximumSalary-minimumSalary)*salaryPosition)*100;
  const profile={...operatorIdentity('candidate-'+hash.slice(0,24),specialization),level,xp:startingXpForLevel(level),specialization,attributes:stats,traits:[traits[n(48,6)],traits[(n(48,6)+1+n(52,5))%6]]};
  return {id:'candidate-'+hash.slice(0,24),week,profile_json:JSON.stringify(profile),salary_cents:salary,bonus_cents:salary*balance.signingSalaryFactor,hired:0};
 }));
 return uniqueCandidateNames(candidates,operators);
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
export function baseRoutine(p:Personnel,turn:number){
 const resting:string[]=[];
 const training:string[][]=[];
 for(const squad of p.squads){
  if(JSON.parse(squad.directives_json).disbanded)continue;
  const participants:string[]=[];
  for(const member of p.members.filter(m=>m.squad_id===squad.id)){
   const op=p.operators.find(o=>o.id===member.operator_id);
   if(!op)continue;
   const status=availability(p,op,turn);
   if(status==='exhausted'||(status==='available'&&op.fatigue>0))resting.push(op.id);
   else if(status==='available')participants.push(op.id);
  }
  if(participants.length>=2)training.push(participants.sort());
 }
 return {resting,training};
}
export function gainFamiliarity(p:Personnel,sortedIds:string[],gain:number){
 for(let i=0;i<sortedIds.length;i++)for(let j=i+1;j<sortedIds.length;j++){
  const low=sortedIds[i],high=sortedIds[j];
  let pair=p.familiarity.find(f=>f.operator_low===low&&f.operator_high===high);
  if(!pair){pair={operator_low:low,operator_high:high,score:0};p.familiarity.push(pair);}
  pair.score=clamp(pair.score+gain);
 }
}
export function squadProjection(p:Personnel,s:any,turn:number){
 const ids=p.members.filter(m=>m.squad_id===s.id).map(m=>m.operator_id).sort();
 const apt=(id:string)=>ids.includes(id)&&p.operators.some(o=>o.id===id&&availability(p,o,turn)==='available');
 const leader=apt(s.leader_id)?s.leader_id:apt(s.deputy_id)?s.deputy_id:null;
 const scores:number[]=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)scores.push(p.familiarity.find(f=>f.operator_low===ids[i]&&f.operator_high===ids[j])?.score??0);
 return {id:s.id,name:s.name,specialization:s.specialization,leaderId:s.leader_id,deputyId:s.deputy_id,effectiveLeaderId:leader,memberIds:ids,directives:JSON.parse(s.directives_json),familiarity:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,ready:ids.length>=balance.squadMin&&!!leader&&ids.every(apt)};
}
export function canonical(p:Personnel){return Object.fromEntries(Object.entries(p).map(([key,rows])=>[key,[...rows].sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'))]));}
export async function personnelTurn(original:Personnel,turn:number,cash:number,seed:string,reputation:number,digest:Digest,managedIds:string[]=[],routine=baseRoutine(original,turn)){
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
  }else if(due){op.morale=clamp(op.morale-balance.missedPayMorale);op.loyalty=clamp(op.loyalty-balance.missedPayLoyalty);add('salary_unpaid','Salário em atraso',JSON.parse(op.profile_json).name+' · caixa insuficiente.');record('unpaid:'+c.id+':'+turn,'salary_unpaid','Salário em atraso',{operatorId:op.id,arrearsCents:c.arrears_cents});}
  if(c.status==='active'&&c.end_turn<=turn){c.status='expired';add('employment_expired','Vínculo encerrado',JSON.parse(op.profile_json).name+' aguarda renovação.');record('expired:'+c.id,'employment_expired','Vínculo encerrado',{operatorId:op.id});}
 }
 for(const r of p.reservations.filter(r=>r.kind==='rest')){
  const op=p.operators.find(o=>o.id===r.operator_id);if(!op)continue;
  if(!managedIds.includes(op.id))op.fatigue=clamp(op.fatigue-restFatiguePerTurn);
  r.end_turn=turn+(op.fatigue>0?restTurns(op.fatigue):0);
 }
 for(const r of p.reservations.filter(r=>r.kind==='recovery'&&!managedIds.includes(r.operator_id))){
  const op=p.operators.find(o=>o.id===r.operator_id);if(!op)continue;
  op.health=clamp(op.health+recoveryHealthPerTurn);
  r.end_turn=turn+Math.ceil((100-op.health)/recoveryHealthPerTurn);
 }
 const ended=p.reservations.filter(r=>r.kind!=='mission'&&r.end_turn<=turn);
 for(const r of ended){const op=p.operators.find(o=>o.id===r.operator_id);if(!op)continue;
  if(!managedIds.includes(op.id)&&r.kind==='training')op.fatigue=clamp(op.fatigue+balance.trainingFatigue);
  record('activity:'+r.source_id+':'+op.id,'activity_completed','Atividade concluída',{operatorId:op.id,kind:r.kind});
 }
 const groups=[...new Set(ended.filter(r=>r.kind==='training').map(r=>r.source_id))];
 for(const group of groups){
  const ids=ended.filter(r=>r.kind==='training'&&r.source_id===group).map(r=>r.operator_id).sort();
  gainFamiliarity(p,ids,balance.familiarityGain);
 }
 for(const id of routine.resting){
  const op=p.operators.find(o=>o.id===id);
  if(op)op.fatigue=clamp(op.fatigue-restFatiguePerTurn);
 }
 for(const ids of routine.training)gainFamiliarity(p,ids,balance.routineFamiliarityGain);
 if(ended.length)add('activity_completed','Atividades concluídas',ended.length+' operador(es) concluíram atividades.');
 p.reservations=p.reservations.filter(r=>!ended.includes(r));
 if(turn%28===0){p.candidates=await market(seed,turn/28,reputation,digest,p.operators);add('recruitment_refreshed','Mercado renovado','Novos candidatos disponíveis para contratação.');}
 return {personnel:p,cash,ledger,events,history,status:p.contracts.some(c=>c.arrears_cents>0)?'financial_crisis' as const:'active' as const};
}
