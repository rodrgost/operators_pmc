export function nextTurnCount(currentTurn:number,command:any):number {
 if(command?.pendingOrders?.length)return 1
 const remaining=(command?.agenda??[]).map((item:any)=>item.dueTurn-currentTurn).filter((turns:number)=>Number.isFinite(turns)&&turns>0)
 return remaining.length?Math.max(1,Math.min(28,Math.ceil(Math.min(...remaining)))):1
}
