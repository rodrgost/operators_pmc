import {catalog,contractContent,reportNarrative} from './content.ts';
import {NORMAL_V1,reward,probability,type DifficultyProfile} from './difficulty.ts';
import {perceivedRisk,type Intelligence} from './intelligence.ts';
import {stageEquipment,returnEquipment,type Logistics} from './logistics.ts';
import config from '../rules/operations.json' with {type:'json'};
import {countries,organizations} from '../rules/index.ts';
import {employment,type Personnel,type Digest} from './personnel.ts';
export {config};
export interface Operations {contracts:any[];missions:any[];assignments:any[];decisions:any[]}
export const liveStatuses=['active','awaiting_decision','returning'];
export const emptyOperations=():Operations=>({contracts:[],missions:[],assignments:[],decisions:[]});
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
export async function offers(seed:string,week:number,digest:Digest,difficultyProfile:DifficultyProfile=NORMAL_V1){return Promise.all(config.templates.map(async(t,i)=>{
 const h=await digest([seed,config.version,'offers',week,t.type]);const n=(o:number,m:number)=>parseInt(h.slice(o,o+4),16)%m;
 const country=countries[n(0,countries.length)],difficulty=t.baseDifficulty+n(4,11),risk=t.baseRisk+n(8,11);
 const content=contractContent(t.type,'contract-'+h.slice(0,24),country.regions[n(12,3)],organizations.find(o=>o.id==='gov-'+country.id)!.name,'commercial');
 const estimate=(v:number,offset:number)=>{const center=clamp(v+n(offset,15)-7);return {min:Math.max(1,center-12),max:Math.min(100,center+12)}};
 return {id:'contract-'+h.slice(0,24),type:t.type,title:content.title,region_id:country.id+'-'+n(12,3),client_id:'gov-'+country.id,source:'commercial',origin_event_id:null,offered_turn:week*28,expires_turn:(week+1)*28,difficulty,risk,intel_json:JSON.stringify({estimatedDifficulty:estimate(difficulty,16),estimatedRisk:estimate(risk,20),confidence:45,source:'Contratante',collectedTurn:week*28,narrative:content}),reward_cents:reward(t.rewardCents+n(24,1001)*100,difficultyProfile),minimum_operators:2,status:'available'};
}));}
export function opsCanonical(o:Operations){const current={...o,missions:o.missions.filter(m=>liveStatuses.includes(m.status))};return Object.fromEntries(Object.entries(current).map(([k,rows])=>[k,[...rows].sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'))]));}
export async function operationsTurn(original:Operations,personnel:Personnel,turn:number,cash:number,reputation:number,seed:string,digest:Digest,logistics?:Logistics,intelligence?:Intelligence,difficultyProfile:DifficultyProfile=NORMAL_V1){
 const o:Operations=structuredClone(original),p:Personnel=structuredClone(personnel),ledger:any[]=[],reports:any[]=[],events:any[]=[],history:any[]=[];let critical=false;
 const event=(type:string,title:string,description:string,important=false)=>events.push({type,title,description,important});
 const report=(m:any,outcome:string,title:string,description:string,audit:any={},extra:any={})=>reports.push({id:m.id+':'+turn+':'+reports.length,mission_id:m.id,turn,summary_json:JSON.stringify({catalogVersion:catalog.version,outcome,title,description,stageIndex:m.stage_index,...extra}),audit_json:JSON.stringify(audit)});
 function finish(m:any,status:string){
  if(logistics)returnEquipment(logistics,m.id,turn);
  const c=o.contracts.find(c=>c.id===m.contract_id);m.status=status;m.ended_turn=turn;c.status=status==='completed'?'completed':status==='withdrawn'?'withdrawn':'failed';
  let payment=0,delta=config.failureReputation;
  if(status==='completed'){
   const total=Math.round(c.reward_cents*Math.max(config.minimumCompletionFactor,Math.min(1,m.success_points/(config.stages.length*2))));payment=total-m.advance_cents;m.paid_cents=total;delta=config.successReputation;
   ledger.push({sourceId:'mission:'+m.id+':completion',entryType:'mission_completion',turn,amountCents:payment});
  }else {payment=-m.advance_cents;m.paid_cents=0;if(payment)ledger.push({sourceId:'mission:'+m.id+':refund',entryType:'advance_refund',turn,amountCents:payment});}
  cash+=payment;reputation=clamp(reputation+delta);
  const crew=o.assignments.filter(a=>a.mission_id===m.id);const ids=crew.map(a=>a.operator_id).sort();
  p.reservations=p.reservations.filter(r=>!(r.kind==='mission'&&r.source_id===m.id));
  for(const d of o.decisions.filter(d=>d.mission_id===m.id&&d.status==='pending')){d.status='cancelled';d.resolved_turn=turn;}
  for(const id of ids){const op=p.operators.find(o=>o.id===id);if(!op)continue;const profile=JSON.parse(op.profile_json);if(status==='completed')profile.xp+=config.xpCompletion;
   while(profile.level<config.maximumLevel&&profile.xp>=profile.level*config.levelXpStep){profile.level++;for(const key of Object.keys(profile.attributes))profile.attributes[key]=clamp(profile.attributes[key]+config.levelAttributeGain);}op.profile_json=JSON.stringify(profile);
   history.push({id:'mission:'+m.id+':'+id,turn,event_type:'mission_'+status,title:'Missão '+(status==='completed'?'concluída':status==='withdrawn'?'retirada':'fracassada'),data_json:JSON.stringify({operatorId:id,missionId:m.id})});
  }
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){let f=p.familiarity.find(f=>f.operator_low===ids[i]&&f.operator_high===ids[j]);if(!f){f={operator_low:ids[i],operator_high:ids[j],score:0};p.familiarity.push(f);}f.score=clamp(f.score+config.missionFamiliarity);}
  report(m,status,status==='completed'?'Missão concluída':status==='withdrawn'?'Retirada concluída':'Missão fracassada',reportNarrative(status,[m.id,turn,'final']),{}, {paymentCents:payment,reputationDelta:delta,totalPaidCents:m.paid_cents});
  event('mission_'+status,status==='completed'?'Missão concluída':status==='withdrawn'?'Equipe retornou':'Missão fracassada',c.title+' · consulte o relatório.',true);
 }
 for(const c of o.contracts)if(['available','accepted'].includes(c.status)&&c.expires_turn<=turn){c.status='expired';event('contract_expired','Oferta expirada',c.title);}
 for(const m of o.missions){
  if(!liveStatuses.includes(m.status))continue;
  if(m.status==='returning'){if(m.stage_due_turn<=turn)finish(m,'withdrawn');continue;}
  const c=o.contracts.find(c=>c.id===m.contract_id),crew=o.assignments.filter(a=>a.mission_id===m.id),directives=JSON.parse(m.directives_json);
  const operators=crew.map(a=>({assignment:a,op:p.operators.find(o=>o.id===a.operator_id)}));
  const apt=(id:string)=>operators.some(({op})=>op?.id===id&&op.health>=config.leaderMinimumHealth&&op.fatigue<config.maximumMissionFatigue&&employment(p,id,turn));
  if(!apt(m.leader_id)&&m.deputy_id&&apt(m.deputy_id)){m.leader_id=m.deputy_id;event('leader_replaced','Substituto assumiu a missão',c.title);}
  if(!apt(m.leader_id)||operators.some(({op})=>!op||op.health<(directives.withdrawalPolicy==='conservative'?config.leaderMinimumHealth:config.withdrawalMinimumHealth)||!employment(p,op.id,turn))){m.status='returning';m.stage_due_turn=turn+1;event('automatic_withdrawal','Retorno de segurança',c.title+' · formação sem condições de continuar.',true);continue;}
  let decision=o.decisions.find(d=>d.mission_id===m.id&&d.stage_index===m.stage_index);
  if(m.status==='awaiting_decision'){
   if(decision?.status==='pending'&&decision.expires_turn<=turn){decision.status='resolved';decision.chosen_action=decision.fallback_action;decision.resolved_turn=turn;event('decision_fallback','Prazo da decisão encerrado','Política automática aplicada à missão.',true);}
   if(decision?.status==='pending')continue;
   if(decision?.chosen_action==='withdraw'){m.status='returning';m.stage_due_turn=turn+1;continue;}
   m.status='active';m.stage_due_turn=turn;
  }
  if(m.stage_due_turn>turn)continue;
  const knowledge=intelligence?.snapshots.some(s=>s.mission_id===m.id)?perceivedRisk(intelligence,c.id,turn):null;
  const evaluatedRisk=knowledge?.evaluation??c.risk,decisionRisk=knowledge?.threshold??c.risk;
  if(m.stage_index===2&&!decision&&(decisionRisk>config.riskThresholds[directives.riskTolerance as keyof typeof config.riskThresholds]||m.success_points<2)){
   decision={id:'decision-'+m.id+'-'+m.stage_index,mission_id:m.id,stage_index:m.stage_index,created_turn:turn,expires_turn:turn+config.decisionTurns,fallback_action:directives.withdrawalPolicy==='persistent'?'safer':'withdraw',chosen_action:null,resolved_turn:null,status:'pending'};
   o.decisions.push(decision);m.status='awaiting_decision';critical=true;event('critical_decision','Decisão do comandante necessária',c.title+' · escolha uma ação até T'+decision.expires_turn+'.',true);report(m,'decision','Situação excepcional',reportNarrative('decision',[m.id,turn,m.stage_index]),{},knowledge?{intelligence:{level:knowledge.level,stale:knowledge.stale,conflicting:knowledge.conflicting}}:{});continue;
  }
  const equipment=logistics?stageEquipment(logistics,m.id,m.stage_index,c.type,crew):{capacity:0,injuryReduction:0,fatigueReduction:0,used:[]};
  const t=config.templates.find(t=>t.type===c.type)!;let capacity=0;
  for(const [attribute,weight] of Object.entries(t.weights)){
   const scores=operators.map(({assignment,op})=>JSON.parse(assignment.snapshot_json).attributes[attribute]*(Math.max(config.minimumConditionFactor,op.health/100)*(1-op.fatigue/config.fatigueDivisor))*(config.moraleBase+op.morale/config.moraleDivisor)).sort((a,b)=>b-a);
   capacity+=(scores[0]*config.bestSpecialistWeight+(scores[1]??scores[0])*config.secondSpecialistWeight)*(weight??0);
  }
  const leader=operators.find(({op})=>op.id===m.leader_id)!;const profile=JSON.parse(leader.assignment.snapshot_json);
  capacity+=profile.attributes.leadership*config.leaderWeight;
  const ids=crew.map(a=>a.operator_id).sort(),familiarity=p.familiarity.filter(f=>ids.includes(f.operator_low)&&ids.includes(f.operator_high));
  capacity*=1+Math.min(config.familiarityMaximum,familiarity.reduce((n,f)=>n+f.score,0)/Math.max(1,familiarity.length)/config.familiarityDivisor);
  const successWeight=directives.priority==='objective'?config.objectiveWeight:directives.priority==='team_safety'?config.safetyWeight:config.deadlineWeight;
  const safetyWeight=config.riskWeights[directives.riskTolerance as keyof typeof config.riskWeights];
  const alternatives=config.autonomy.map(action=>({...action,utility:action.capacity*successWeight-evaluatedRisk*action.risk*safetyWeight*(0.5+profile.attributes.leadership/100)+(directives.posture===action.id?config.postureBias:0)+(profile.traits.includes('cautious')&&action.id==='cautious'?config.traitBias:0)+(profile.traits.includes('impulsive')&&action.id==='aggressive'?config.traitBias:0)+(directives.priority==='deadline'&&action.id==='aggressive'?config.deadlineBias:0)}));
  const action=decision?.chosen_action==='safer'?alternatives[0]:alternatives.sort((a,b)=>b.utility-a.utility)[0];
  capacity+=action.capacity+equipment.capacity;
  const h=await digest([seed,config.version,turn,'mission',m.id,m.stage_index,m.delays]);
  const draw=parseInt(h.slice(0,8),16)/0x100000000,complicationDraw=parseInt(h.slice(8,16),16)/0x100000000;
  const margin=capacity-c.difficulty+(draw-0.5)*config.randomSpread;
  let outcome=margin>=config.successMargin?'success':margin>=config.partialMargin?'partial':margin>=config.delayMargin&&m.delays<config.maxDelays?'delay':'failure';
  const effectiveRisk=c.risk*action.risk*(profile.traits.includes('cautious')?config.cautiousTraitRisk:profile.traits.includes('impulsive')?config.impulsiveTraitRisk:1);
  const complication=complicationDraw<probability(effectiveRisk/config.riskDivisor,difficultyProfile.missionComplications);
  for(const {op} of operators){op.fatigue=clamp(op.fatigue+config.stageFatigue-equipment.fatigueReduction);const profile=JSON.parse(op.profile_json);profile.xp+=outcome==='success'?config.xpSuccess:outcome==='partial'?config.xpPartial:0;op.profile_json=JSON.stringify(profile);}
  if(complication){const victim=operators[parseInt(h.slice(16,20),16)%operators.length].op;victim.health=Math.max(5,victim.health-Math.max(1,Math.round((config.injuryMin+parseInt(h.slice(20,24),16)%(config.injuryMax-config.injuryMin+1))*(1-equipment.injuryReduction))));if(outcome==='success')outcome='complication';}
  const name=config.stages[m.stage_index];
  report(m,outcome,name+' · '+({success:'sucesso',partial:'resultado parcial',delay:'atraso',failure:'falha',complication:'complicação'}[outcome]),action.label+'. '+reportNarrative(outcome,[m.id,turn,m.stage_index,m.delays],name)+(complication&&outcome!=='complication'?' Uma complicação também afetou a saúde de um integrante.':'')+' Consulte as condições atuais da formação.',{capacity,difficulty:c.difficulty,risk:c.risk,draw,complicationDraw,utility:action.utility},{equipment:equipment.used,conditions:operators.map(({op})=>({operatorId:op.id,name:JSON.parse(op.profile_json).name,health:op.health,fatigue:op.fatigue,morale:op.morale}))});
  event('mission_stage','Etapa processada · '+name,c.title+' · relatório disponível.');
  if(outcome==='delay'){m.delays++;m.stage_due_turn=turn+1;continue;}
  m.success_points+=outcome==='success'||outcome==='complication'?2:outcome==='partial'?1:0;m.completed_stages++;m.stage_index++;m.stage_due_turn=turn+1;
  if(m.stage_index>=config.stages.length)finish(m,m.success_points>=config.minimumSuccessPoints?'completed':'failed');
 }
 if(turn%28===0){const generated=await offers(seed,turn/28,digest,difficultyProfile);o.contracts.push(...generated.filter(c=>!o.contracts.some(old=>old.id===c.id)));event('contracts_refreshed','Novos contratos comerciais','O catálogo semanal foi renovado.');}
 return {operations:o,personnel:p,cash,reputation,ledger,reports,events,history,critical};
}
