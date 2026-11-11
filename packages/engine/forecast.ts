import {weeklyMaintenance,type Logistics} from './logistics.ts';
import type {Personnel} from './personnel.ts';
import type {Operations} from './operations.ts';

// Known commitments only: mission outcomes and future market decisions are not income forecasts.
export function financialForecast(turn:number,cashCents:number,personnel:Personnel|null,logistics:Logistics|null,operations:Operations|null=null){
 const contracts=structuredClone(personnel?.contracts??[]),l=logistics?structuredClone(logistics):null;
 const debtCents=contracts.reduce((n,c)=>n+c.arrears_cents,0)+(l?.headquarters.arrears_cents??0);
 let salaryCents=0,headquartersCents=0;
 return Array.from({length:28},(_,index)=>{
  const current=turn+index+1;
  for(const c of contracts)if(c.status==='active'&&c.start_turn<current&&c.next_pay_turn<=current&&c.next_pay_turn<=c.end_turn){salaryCents+=c.salary_cents;c.next_pay_turn+=28;}
  if(l){
   for(const m of l.modules)if(m.target_level&&m.due_turn<=current){m.level=m.target_level;m.target_level=null;}
   if(current%28===0&&current>l.headquarters.last_bill_turn&&current>l.headquarters.activated_turn){headquartersCents+=weeklyMaintenance(l);l.headquarters.last_bill_turn=current;}
  }
  const refundCents=(operations?.missions??[]).filter(m=>m.status==='returning'&&m.stage_due_turn<=current).reduce((n,m)=>n+m.advance_cents,0);
  const obligationsCents=debtCents+salaryCents+headquartersCents+refundCents;
  return {turns:index+1,throughTurn:current,salaryCents,headquartersCents,debtCents,refundCents,obligationsCents,cashAfterObligationsCents:cashCents-obligationsCents};
 });
}
