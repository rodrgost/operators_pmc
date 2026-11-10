import {NORMAL_V1,eventProbability,rivalActs,rivalWindow,reward,type DifficultyProfile} from './difficulty.ts';
import config from '../rules/world.json' with {type:'json'};

import {countries,organizations} from '../rules/index.ts';

import {config as operationConfig,type Operations} from './operations.ts';

import type {Digest} from './personnel.ts';

export {config};

export interface World {regions:any[];organizations:any[];influences:any[];relations:any[];events:any[];conflicts:any[];participants:any[];rivals:any[];jobs:any[]}

const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));

const relationClamp=(v:number)=>Math.max(-100,Math.min(100,Math.round(v)));

const metrics=['stability','security','economy','tension'] as const;

const random=(hex:string)=>parseInt(hex.slice(0,8),16)/0x100000000;

export function shiftInfluence(w:World,regionId:string,organizationId:string,amount:number){

 let target=w.influences.find(f=>f.region_id===regionId&&f.organization_id===organizationId);

 if(!target){target={region_id:regionId,organization_id:organizationId,score:0};w.influences.push(target);}

 const donor=w.influences.filter(f=>f.region_id===regionId&&f.organization_id!==organizationId).sort((a,b)=>b.score-a.score||a.organization_id.localeCompare(b.organization_id))[0];

 if(donor){const change=Math.min(amount,donor.score);donor.score-=change;target.score+=change;}

}

export function validateWorld(w:World){for(const r of w.regions){if(metrics.some(m=>r[m]<0||r[m]>100))throw Error('World indicator bounds');if(w.influences.filter(f=>f.region_id===r.id).reduce((n,f)=>n+f.score,0)!==100)throw Error('World influence total');}}

export async function refreshIntel(w:World,seed:string,turn:number,digest:Digest,force=false){

 for(const r of w.regions){if(!force&&turn%config.intelCadence!==0&&!w.events.some(e=>e.region_id===r.id&&e.created_turn===turn))continue;

  const hex=await digest([seed,config.version,'public-intel',r.id,turn]);const indicators:any={};

  metrics.forEach((m,i)=>{const center=clamp(r[m]+parseInt(hex.slice(i*4,i*4+4),16)%9-4);indicators[m]={min:Math.max(0,center-config.intelRadius),max:Math.min(100,center+config.intelRadius)};});

  const presence=w.influences.filter(f=>f.region_id===r.id).map(f=>({organizationId:f.organization_id,score:Math.floor(f.score/5)*5,remainder:f.score%5})).sort((a,b)=>b.remainder-a.remainder||a.organizationId.localeCompare(b.organizationId));

  let remaining=100-presence.reduce((n,f)=>n+f.score,0);for(let i=0;remaining>0;i++,remaining-=5)presence[i%presence.length].score+=5;

  r.intel_json=JSON.stringify({indicators,controllerId:r.controller_id,presence:presence.filter(f=>f.score).map(f=>({organizationId:f.organizationId,estimatedShare:f.score})),confidence:config.intelConfidence,source:'Boletim regional',collectedTurn:turn});

 }

}

export async function seedWorld(seed:string,turn:number,digest:Digest):Promise<World>{

 const w:World={regions:[],organizations:organizations.map(o=>({...o,goal:o.type==='government'?'stability':o.type==='armed_faction'?'expansion':o.type==='corporation'?'profit':o.type==='civil'?'relief':'contracts',resources:60,company_relation:0})),influences:[],relations:[],events:[],conflicts:[],participants:[],rivals:config.rivals.map(r=>({id:r.id,capacity:r.capacity,budget_cents:r.budgetCents,reputation:r.reputation,specialization:r.specialization,completed:0,failed:0})),jobs:[]};

 for(const c of countries)for(let i=0;i<c.regions.length;i++){

  const id=c.id+'-'+i,h=await digest([seed,config.version,'region',id]);const initial=config.initial[c.id as keyof typeof config.initial];

  const r:any={id,country_id:c.id,name:c.regions[i],controller_id:'gov-'+c.id,cooldown_until:turn,last_event_id:null,last_event_type:null,intel_json:'{}'};

  metrics.forEach((m,j)=>r[m]=clamp(initial[j]+parseInt(h.slice(j*4,j*4+4),16)%9-4));

  if(id==='karsen-0')Object.assign(r,{stability:32,security:41,economy:76,tension:84});w.regions.push(r);

  const corporate=c.id==='solmar'?'corp-helion':c.id==='arken'?'corp-nexa':'corp-meridian';

  const shares=id==='karsen-0'?[[r.controller_id,50],['faction-north',45],['civil-relief',5]]:[[r.controller_id,75],[corporate,15],['civil-relief',10]];

  for(const [organization_id,score] of shares)w.influences.push({region_id:id,organization_id,score});

 }

 const ids=w.organizations.map(o=>o.id).sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){

  const a=w.organizations.find(o=>o.id===ids[i]),b=w.organizations.find(o=>o.id===ids[j]);const hostile=[a.type,b.type].includes('armed_faction')&&[a.type,b.type].includes('government');

  w.relations.push({org_low:ids[i],org_high:ids[j],value:hostile?-65:[a.type,b.type].includes('corporation')?20:0});

 }

 await refreshIntel(w,seed,turn,digest,true);validateWorld(w);return w;

}

export function worldEvent(w:World,r:any,turn:number,type:string,category:string,summary:string,originId:string|null=null,contractId:string|null=null,effects:any={},duration=0,id='world-'+type+'-'+r.id+'-'+turn){

 const existing=w.events.find(e=>e.id===id);if(existing)return existing;

 const e={id,region_id:r.id,type,category,created_turn:turn,end_turn:turn+duration,status:duration?'active':'completed',origin_id:originId,contract_id:contractId,summary,effects_json:JSON.stringify(effects)};w.events.push(e);return e;

}

function change(r:any,effects:any){for(const m of metrics)r[m]=clamp(r[m]+(effects[m]??0));}

export async function worldTurn(original:World,operations:Operations,turn:number,seed:string,digest:Digest,profile:DifficultyProfile=NORMAL_V1){

 const w:World=structuredClone(original),o:Operations=structuredClone(operations);

 for(const e of w.events)if(e.status==='active'&&e.end_turn<=turn)e.status='completed';

 for(const conflict of w.conflicts){

  if(conflict.status!=='active')continue;const r=w.regions.find(r=>r.id===conflict.region_id)!;

  const sides=w.participants.filter(p=>p.conflict_id===conflict.id).map(p=>p.organization_id).sort();

  const hostility=w.relations.find(x=>x.org_low===sides[0]&&x.org_high===sides[1])?.value??-50;

  conflict.intensity=clamp(conflict.intensity+(hostility<-40?1:-1));change(r,{stability:-config.conflictPressure,security:-config.conflictPressure,economy:-config.conflictPressure,tension:config.conflictPressure});

  shiftInfluence(w,r.id,'faction-north',1);

  if(conflict.intensity<=config.conflictEndIntensity||turn-conflict.started_turn>=config.conflictDuration){

   conflict.status='resolved';conflict.ended_turn=turn;conflict.intensity=0;change(r,{tension:-6,security:3});worldEvent(w,r,turn,'ceasefire','conflict','Trégua registrada em '+r.name+'.',conflict.cause_id);

   const relation=w.relations.find(x=>x.org_low===sides[0]&&x.org_high===sides[1]);if(relation)relation.value=relationClamp(relation.value+2);

  }

 }

 for(const job of w.jobs){

  if(job.status!=='active'||job.completes_turn>turn)continue;const rival=w.rivals.find(r=>r.id===job.rival_id)!,c=o.contracts.find(c=>c.id===job.contract_id),r=w.regions.find(r=>r.id===job.region_id)!;

  if(!c)throw Error('Missing rival contract');

  const chance=Math.max(0.15,Math.min(0.9,0.55+rival.reputation/250+(rival.specialization===c.type?0.08:0)-c.risk/400-c.difficulty/500));

  const success=random(await digest([seed,config.version,turn,'rival-result',job.id]))<chance;

  job.status=success?'completed':'failed';c.status=success?'rival_completed':'rival_failed';rival.reputation=clamp(rival.reputation+(success?2:-2));rival[success?'completed':'failed']++;

  if(success){rival.budget_cents=Math.min(config.rivalBudgetCapCents,rival.budget_cents+c.reward_cents);change(r,{security:rival.id==='pmc-aegis'?4:rival.id==='pmc-wolf'?1:3,tension:rival.id==='pmc-wolf'?2:-3,economy:rival.id==='pmc-iron'?2:0});shiftInfluence(w,r.id,rival.id,config.rivalInfluenceGain);}

  else change(r,{security:-2,tension:3});

  worldEvent(w,r,turn,'rival_result','security',w.organizations.find(x=>x.id===rival.id)!.name+(success?' concluiu ':' falhou em ')+c.title+'.',job.origin_id,c.id,{success,rivalId:rival.id});

  if(success&&c.origin_event_id){const origin=w.events.find(e=>e.id===c.origin_event_id);if(origin){origin.status='resolved';origin.end_turn=turn;}}

 }

 for(const r of w.regions){

  const activeConflict=w.conflicts.find(c=>c.region_id===r.id&&c.status==='active');

  if(turn%config.recoveryCadence===0&&!activeConflict){const target=config.initial[r.country_id as keyof typeof config.initial];metrics.forEach((m,i)=>r[m]=clamp(r[m]+Math.sign(target[i]-r[m])));}

  const governor=w.organizations.find(o=>o.id==='gov-'+r.country_id)!;

  if(turn%28===0){governor.resources=clamp(governor.resources+(r.stability>=50?1:-1));}

  const activeEvents=w.events.filter(e=>e.region_id===r.id&&e.status==='active').length;

  if(r.cooldown_until<=turn&&activeEvents<config.maxActiveEventsPerRegion){

   for(const definition of config.events){

    const eligible=definition.type==='industrial_crisis'?r.tension>=55&&r.economy>=50&&r.last_event_type!=='industrial_crisis'&&!activeConflict:

     definition.type==='armed_conflict'?r.tension>=70&&r.security<=45&&!activeConflict:

     definition.type==='humanitarian_need'?r.security<40||r.economy<40:

     definition.type==='security_incident'?r.tension>=45:

     definition.type==='political_reform'?r.stability<65&&governor.resources>=45:

     r.stability>=65&&r.security>=60&&w.organizations.some(o=>o.type==='corporation'&&o.resources>=55);

    if(!eligible||random(await digest([seed,config.version,turn,'event',r.id,definition.type]))>=eventProbability(definition.chance,definition.type==='political_reform'||definition.type==='corporate_investment'?'positive':'negative',profile))continue;

    const e=worldEvent(w,r,turn,definition.type,definition.category,definition.title+' em '+r.name+'. '+(r.last_event_id?'Evolução de acontecimentos anteriores.':'Condições regionais provocaram nova demanda.'),r.last_event_id,null,definition.effects,definition.duration);

    change(r,definition.effects);r.cooldown_until=turn+config.cooldownTurns;r.last_event_id=e.id;r.last_event_type=e.type;

    if(e.type==='armed_conflict'){

     const conflict={id:'conflict-'+e.id,region_id:r.id,intensity:35,status:'active',started_turn:turn,ended_turn:null,cause_id:e.id};w.conflicts.push(conflict);

     const pair=['gov-'+r.country_id,'faction-north'].sort();w.participants.push(...pair.map((organization_id,i)=>({conflict_id:conflict.id,organization_id,side:organization_id.startsWith('gov-')?'government':'opposition'})));

     const relation=w.relations.find(x=>x.org_low===pair[0]&&x.org_high===pair[1]);if(relation)relation.value=relationClamp(relation.value-3);

    }

    if(e.type==='political_reform')governor.resources=clamp(governor.resources-2);

    break;

   }

  }

  const armed=w.influences.find(f=>f.region_id===r.id&&f.organization_id==='faction-north');

  const government=w.influences.find(f=>f.region_id===r.id&&f.organization_id==='gov-'+r.country_id);

  const controller=armed?.score>=config.controlThreshold&&r.stability<30?'faction-north':government?.score>=config.controlThreshold&&r.stability>=50&&r.security>=55?'gov-'+r.country_id:r.controller_id;

  if(controller!==r.controller_id){r.controller_id=controller;worldEvent(w,r,turn,'control_changed','political','Mudança de controle político em '+r.name+'.',r.last_event_id);}

 }

 if(turn%28===0)for(const org of w.organizations.filter(o=>o.type==='corporation'))org.resources=clamp(org.resources+(w.regions.reduce((n,r)=>n+r.economy,0)/w.regions.length>=55?1:-1));

 if(turn%28===0)for(const r of w.rivals)r.budget_cents=Math.max(0,r.budget_cents-config.rivalWeeklyCents);

 if(rivalActs(turn,config.rivalCadence,profile)){

  const ordered=[...w.rivals].sort((a,b)=>a.id.localeCompare(b.id)),offset=(rivalWindow(turn,config.rivalCadence,profile)-1)%ordered.length;

  for(let i=0;i<ordered.length;i++){

   const rival=ordered[(offset+i)%ordered.length];if(rival.budget_cents<config.rivalCostCents||w.jobs.filter(j=>j.rival_id===rival.id&&j.status==='active').length>=rival.capacity)continue;

   const available=o.contracts.filter(c=>c.status==='available'&&c.offered_turn<=turn-config.offerGraceTurns&&c.expires_turn>turn).sort((a,b)=>Number(b.type===rival.specialization)-Number(a.type===rival.specialization)||a.id.localeCompare(b.id));

   const c=available[0];if(!c)continue;const r=w.regions.find(r=>r.id===c.region_id)!;

   const id='rival-job-'+c.id,e=worldEvent(w,r,turn,'rival_claimed','corporate',w.organizations.find(o=>o.id===rival.id)!.name+' assumiu '+c.title+'.',c.origin_event_id,c.id,{},0,'claim-'+id);

   c.status='rival_active';rival.budget_cents-=config.rivalCostCents;w.jobs.push({id,rival_id:rival.id,contract_id:c.id,region_id:c.region_id,started_turn:turn,completes_turn:turn+config.rivalJobTurns,status:'active',origin_id:e.id});break;

  }

 }

 validateWorld(w);return {world:w,operations:o};

}

export function applyMissionResults(w:World,o:Operations,turn:number){

 for(const m of o.missions.filter(m=>m.ended_turn===turn&&['completed','failed','withdrawn'].includes(m.status))){

  const c=o.contracts.find(c=>c.id===m.contract_id),r=w.regions.find(r=>r.id===c?.region_id);if(!c||!r)continue;

  const effects=m.status==='completed'?{security:config.missionSecurityGain,stability:config.missionStabilityGain,economy:config.missionEconomyGain,tension:-config.missionTensionReduction}:m.status==='failed'?{security:-config.failureSecurityLoss,tension:config.failureTensionGain}:{};

  change(r,effects);const client=w.organizations.find(o=>o.id===c.client_id);if(client)client.company_relation=relationClamp(client.company_relation+(m.status==='completed'?config.missionRelationGain:m.status==='failed'?-config.missionRelationGain:-2));

  if(m.status==='completed'){

   shiftInfluence(w,r.id,c.client_id,config.missionInfluenceGain);

   for(const conflict of w.conflicts.filter(x=>x.region_id===r.id&&x.status==='active')){conflict.intensity=clamp(conflict.intensity-config.missionConflictReduction);if(conflict.intensity<=config.conflictEndIntensity){conflict.status='resolved';conflict.ended_turn=turn;}}

   const origin=w.events.find(e=>e.id===c.origin_event_id);if(origin){origin.status='resolved';origin.end_turn=turn;}

  }

  worldEvent(w,r,turn,'player_mission_'+m.status,'security','A companhia '+(m.status==='completed'?'concluiu':m.status==='failed'?'fracassou em':'retirou-se de')+' '+c.title+'.',c.origin_event_id,c.id,effects,0,'consequence-'+m.id);

 }

 validateWorld(w);

}

export async function publishWorldContracts(w:World,o:Operations,seed:string,turn:number,digest:Digest,profile:DifficultyProfile=NORMAL_V1){

 for(const e of w.events.filter(e=>e.created_turn===turn&&!e.contract_id)){

  const definition=config.events.find(d=>d.type===e.type);if(!definition?.contract)continue;

  const r=w.regions.find(r=>r.id===e.region_id)!,template=operationConfig.templates.find(t=>t.type===definition.contract)!;

  const id='emergent-'+e.id;if(o.contracts.some(c=>c.id===id))continue;

  const difficulty=Math.max(1,clamp((100-r.security+template.baseDifficulty)/2)),risk=Math.max(1,clamp(r.tension*0.6+(100-r.security)*0.4));

  const h=await digest([seed,config.version,e.id,'offer-intel']);const estimate=(v:number,i:number)=>{const center=clamp(v+parseInt(h.slice(i,i+4),16)%9-4);return {min:Math.max(1,center-12),max:Math.min(100,center+12)}};

  o.contracts.push({id,type:template.type,title:template.title+' · '+r.name,region_id:r.id,client_id:'gov-'+r.country_id,source:'world_event',origin_event_id:e.id,offered_turn:turn,expires_turn:turn+28,difficulty,risk,intel_json:JSON.stringify({estimatedDifficulty:estimate(difficulty,0),estimatedRisk:estimate(risk,4),confidence:45,source:'Contratante / notícia regional',collectedTurn:turn}),reward_cents:reward(Math.round(template.rewardCents*(1+r.tension/200)),profile),minimum_operators:2,status:'available'});e.contract_id=id;

 }

 for(const c of o.contracts.filter(c=>c.source==='commercial'&&c.offered_turn===turn&&c.status==='available')){

  const r=w.regions.find(r=>r.id===c.region_id);if(!r)continue;

  c.risk=Math.max(1,clamp(c.risk+(r.tension-50)/8));c.difficulty=Math.max(1,clamp(c.difficulty+(50-r.security)/10));

  const intel=JSON.parse(c.intel_json),h=await digest([seed,config.version,c.id,'commercial-intel']);const estimate=(v:number,i:number)=>{const center=clamp(v+parseInt(h.slice(i,i+4),16)%9-4);return {min:Math.max(1,center-12),max:Math.min(100,center+12)}};intel.estimatedRisk=estimate(c.risk,0);intel.estimatedDifficulty=estimate(c.difficulty,4);c.intel_json=JSON.stringify(intel);

 }

}

export function worldCanonical(w:World){const state={...w,events:w.events.filter(e=>e.status==='active'),conflicts:w.conflicts.filter(c=>c.status==='active'),jobs:w.jobs.filter(j=>j.status==='active')};return Object.fromEntries(Object.entries(state).map(([k,rows])=>[k,[...rows].sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'))]));}

export function worldNotifications(w:World,turn:number){return w.events.filter(e=>e.created_turn===turn).map(e=>({type:'world_'+e.type,title:config.events.find(d=>d.type===e.type)?.title??(e.type==='rival_claimed'?'Rival assumiu contrato':e.type==='rival_result'?'Resultado de rival':e.type==='ceasefire'?'Trégua regional':e.type==='control_changed'?'Controle político mudou':'Consequência regional'),description:e.summary,important:['armed_conflict','control_changed'].includes(e.type)}));}

