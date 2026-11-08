import config from '../rules/logistics.json' with {type:'json'};
import type {Personnel} from './personnel.ts';
export {config};
export interface Logistics {headquarters:any;modules:any[];equipment:any[];assignments:any[];progress:any[];activities:any[]}
export const catalog=config.categories.flatMap(c=>[1,2,3].map(q=>({id:c.id+'-'+q,category:c.id,name:c.name+' '+['I','II','III'][q-1],quality:q,weight:c.weight,priceCents:c.priceCents*q*q,deliveryTurns:config.deliveryTurns})));
export const itemType=(item:any)=>catalog.find(c=>c.id===item.catalog_id)!;
export function moduleLevel(l:Logistics,type:string){return l.modules.find(m=>m.type===type)?.level??1}
export function moduleCapacity(l:Logistics,type:string){return config.modules.find(m=>m.id===type)!.capacities[moduleLevel(l,type)-1]}
export function equipmentLoad(l:Logistics){return l.equipment.filter(k=>k.status!=='destroyed').reduce((n,k)=>n+itemType(k).weight,0)}
export function weeklyMaintenance(l:Logistics){return config.modules.reduce((n,m)=>n+m.weeklyBaseCents*moduleLevel(l,m.id),0)+Math.max(0,equipmentLoad(l)-moduleCapacity(l,'depot'))*config.overflowWeeklyCents}
export function seedLogistics(turn:number):Logistics{return {headquarters:{name:'Sede central',activated_turn:turn,arrears_cents:0,last_bill_turn:Math.floor(turn/28)*28},modules:config.modules.map(m=>({type:m.id,level:1,target_level:null,due_turn:null})),equipment:[],assignments:[],progress:[],activities:[]}}
export function ready(k:any){return k.status==='available'&&k.condition>=config.minimumCondition&&k.supplies>=config.minimumSupplies}
export function missionLoad(kits:any[]){return kits.reduce((n,k)=>n+itemType(k).weight,0)}
export function missionLoadCapacity(kits:any[]){return Math.min(config.maximumMissionLoad,config.baseMissionLoad+Math.floor(kits.filter(k=>itemType(k).category==='logistics').sort((a,b)=>itemType(b).quality-itemType(a).quality).reduce((n,k,i)=>n+itemType(k).quality*config.logisticsLoadBonus/(1+i),0)))}
export function serviceCost(k:any,task:string){const c=itemType(k);return Math.ceil(c.priceCents*(100-(task==='maintenance'?k.condition:k.supplies))/(task==='maintenance'?200:500))}
export function logisticsStart(l:Logistics,turn:number){const events:any[]=[];
 for(const m of l.modules)if(m.target_level&&m.due_turn<=turn){m.level=m.target_level;m.target_level=null;m.due_turn=null;events.push({type:'hq_upgrade_completed',title:'Melhoria concluída',description:config.modules.find(c=>c.id===m.type)!.name+' agora no nível '+m.level+'.',important:true})}
 for(const k of l.equipment)if(k.due_turn!==null&&k.due_turn<=turn){if(k.task==='maintenance')k.condition=100;if(k.task==='resupply')k.supplies=100;k.status='available';k.due_turn=null;k.task=null;events.push({type:'equipment_ready',title:'Kit disponível',description:itemType(k).name+' liberado no depósito.',important:false})}
 return events;
}
export function stageEquipment(l:Logistics,missionId:string,stage:number,type:string,crew:any[]){
 const kits=l.assignments.filter(a=>a.mission_id===missionId&&a.status==='assigned').map(a=>l.equipment.find(k=>k.id===a.equipment_id)).filter(k=>k&&k.condition>0&&k.supplies>0).sort((a,b)=>itemType(b).quality-itemType(a).quality||a.id.localeCompare(b.id));let capacity=0,injuryReduction=0,fatigueReduction=0;const counts:Record<string,number>={};
 const used:any[]=[];for(const k of kits){const item=itemType(k),rule=config.categories.find(c=>c.id===item.category)!;k.status='in_use';const duplicate=counts[item.category]??0;counts[item.category]=duplicate+1;
  const specialist=crew.some(a=>JSON.parse(a.snapshot_json).specialization===rule.specialization)?1.2:1;
  const factor=item.quality*(k.condition/100)*(k.supplies/100)*specialist/(1+duplicate);
  if(rule.stages.includes(stage)){
   if(rule.types.includes(type))capacity+=rule.capacityBonus*factor;
   if(item.category==='medical')injuryReduction+=0.15*factor;
   if(item.category==='logistics')fatigueReduction+=factor;
  }
  k.condition=Math.max(0,k.condition-config.stageWear);k.supplies=Math.max(0,k.supplies-config.stageConsumption);used.push({id:k.id,name:item.name,condition:k.condition,supplies:k.supplies});
 }
 return {capacity,injuryReduction:Math.min(0.6,injuryReduction),fatigueReduction:Math.min(3,Math.floor(fatigueReduction)),used};
}
export function returnEquipment(l:Logistics,missionId:string,turn:number){for(const a of l.assignments.filter(a=>a.mission_id===missionId&&a.status==='assigned')){const k=l.equipment.find(k=>k.id===a.equipment_id)!;a.status='returned';a.returned_turn=turn;k.status=k.condition===0?'destroyed':'available';k.mission_id=null;}}
export function facilityTurn(l:Logistics,p:Personnel,turn:number){const managed:string[]=[];
 for(const a of l.activities.filter(a=>a.status==='active')){const r=p.reservations.find(r=>r.operator_id===a.operator_id&&r.source_id===a.request_id),op=p.operators.find(o=>o.id===a.operator_id);if(!r||!op){a.status='cancelled';continue;}managed.push(op.id);
  if(a.kind==='rest')op.fatigue=Math.max(0,op.fatigue-config.restFatiguePerTurn);
  if(a.kind==='recovery')op.health=Math.min(100,op.health+config.infirmaryHealing[moduleLevel(l,'infirmary')-1]);
  if(a.kind==='training'){const profile=JSON.parse(op.profile_json);let progress=l.progress.find(t=>t.operator_id===op.id&&t.attribute===a.attribute);if(!progress){progress={operator_id:op.id,attribute:a.attribute,progress:0};l.progress.push(progress)}
   const value=profile.attributes[a.attribute];progress.progress+=Math.max(1,Math.floor(config.trainingProgressPerTurn*config.trainingEfficiency[moduleLevel(l,'training')-1]/100*(1-value/125)));
   while(progress.progress>=100){progress.progress-=100;profile.attributes[a.attribute]=Math.min(100,profile.attributes[a.attribute]+1);}op.profile_json=JSON.stringify(profile);op.fatigue=Math.min(100,op.fatigue+2);
  }
  if(r.end_turn<=turn)a.status='completed';
 }return managed;
}
export function facilitiesFinance(l:Logistics,turn:number,cash:number){const ledger:any[]=[],events:any[]=[];const h=l.headquarters;
 if(turn%28===0&&turn>h.last_bill_turn&&turn>h.activated_turn){h.arrears_cents+=weeklyMaintenance(l);h.last_bill_turn=turn;}
 if(h.arrears_cents>0&&cash>=h.arrears_cents){const cost=h.arrears_cents;cash-=cost;h.arrears_cents=0;ledger.push({sourceId:'hq:'+turn,entryType:'headquarters_maintenance',turn,amountCents:-cost});events.push({type:'hq_maintenance_paid',title:'Manutenção da sede paga',description:'Custos de infraestrutura quitados.',important:false})}
 else if(turn%28===0&&h.arrears_cents>0)events.push({type:'hq_maintenance_unpaid',title:'Manutenção da sede em atraso',description:'Dívida acumulada. Novos investimentos, missões e treinos suspensos; retornos e tratamento preservados.',important:true});
 return {cash,ledger,events};
}
export function logisticsCanonical(l:Logistics){return {headquarters:l.headquarters,...Object.fromEntries(['modules','equipment','assignments','progress','activities'].map(k=>[k,[...(l as any)[k]].filter((a:any)=>k!=='assignments'||a.status==='assigned').sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'))]))}}
