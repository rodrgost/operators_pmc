export function nextTurnCount(currentTurn:number,command:any):number {
 const pending=command?.pendingOrders??[]
 // An instant commitment (or an old order with no forecast) still needs one period.
 if(pending.some((order:any)=>order.dueTurn==null))return 1
 const remaining=[...(command?.agenda??[]),...pending].map((item:any)=>({turns:item.dueTurn-currentTurn,requiresAction:item.requiresAction})).filter(item=>Number.isFinite(item.turns)&&item.turns>0).map(item=>Math.max(1,item.turns-(item.requiresAction?1:0)))
 return remaining.length?Math.max(1,Math.min(28,Math.ceil(Math.min(...remaining)))):1
}
