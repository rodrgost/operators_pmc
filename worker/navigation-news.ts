import type {Database} from './persistence.ts';
// Routes point to the section that actually presents the event's result.
export function eventSections(type:string):string[]{
 if(['turn_completed','weekly_close'].includes(type))return [];
 const sections=['overview'];
 const add=(...keys:string[])=>sections.push(...keys);
 if(type.startsWith('world_')){
  add('world.news','world.regions');
  if(type.startsWith('world_rival'))add('world.rivals','contracts');
  if(['world_control_changed','world_ceasefire'].includes(type))add('world.organizations');
 }
 else if(type.startsWith('intelligence_'))add('world.intelligence');
 else if(type==='recruitment_refreshed')add('operators.recruitment');
 else if(type==='activity_completed')add('operators.roster','operators.squads');
 else if(type==='employment_expired')add('operators.roster');
 else if(type.startsWith('salary_'))add('finance.ledger','finance.summary','operators.roster');
 else if(type.startsWith('hq_'))add('infrastructure.headquarters',...(type.includes('maintenance')?['finance.ledger','finance.summary']:[]));
 else if(type==='equipment_ready')add('infrastructure.inventory');
 else if(type.startsWith('contract'))add('contracts');
 else if(['mission_completed','mission_failed','mission_withdrawn'].includes(type))add('operations.history','operators.roster','operators.squads','infrastructure.inventory','finance.ledger','finance.summary');
 else if(type==='critical_decision')add('operations.decisions','operations.missions');
 else if(type==='decision_fallback')add('operations.decisions','operations.missions');
 else if(type.startsWith('mission_')||['leader_replaced','automatic_withdrawal'].includes(type))add('operations.missions');
 return sections;
}
export function orderSections(kind:string):string[]{
 const routes:Record<string,string[]>={hire:['operators.roster','finance.ledger','finance.summary'],renew:['operators.roster','finance.ledger'],activity:['operators.roster'],activity_cancel:['operators.roster'],squad_training:['operators.roster','operators.squads'],purchase:['infrastructure.inventory','finance.ledger','finance.summary'],maintenance:['infrastructure.inventory','finance.ledger'],resupply:['infrastructure.inventory','finance.ledger'],upgrade:['infrastructure.headquarters','finance.ledger','finance.summary'],accept:['contracts'],cancel:['contracts'],start:['operations.missions','contracts','finance.ledger'],withdraw:['operations.missions'],decision:['operations.decisions','operations.missions'],analysis:['world.intelligence','finance.ledger']};
 return routes[kind]??[];
}
export async function navigationNews(db:Database,id:string){
 const rows=await db.prepare('SELECT event_type AS type,MAX(turn*1000000+sequence+1) AS cursor FROM online_events WHERE game_id=? GROUP BY event_type').bind(id).all();
 const latest:Record<string,number>={};for(const row of rows.results)for(const section of eventSections(row.type))latest[section]=Math.max(latest[section]??0,row.cursor);
 const committed=await db.prepare("SELECT kind,MAX(committed_turn*1000000+900000) AS cursor FROM online_pending_orders WHERE game_id=? AND status='committed' GROUP BY kind").bind(id).all();
 for(const row of committed.results)for(const section of orderSections(row.kind))latest[section]=Math.max(latest[section]??0,row.cursor);
 return latest;
}
