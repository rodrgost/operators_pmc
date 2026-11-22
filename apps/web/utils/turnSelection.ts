import {rules} from '../../../packages/rules/index.ts'

type Milestone = {id?:string;title?:string;tab?:string;dueTurn?:number|null;requiresAction?:boolean}
type AdvanceSuggestion = {turns:number;item?:Milestone;beforeDeadline?:boolean}

export function nextAdvance(currentTurn:number,command:{agenda?:Milestone[];pendingOrders?:Milestone[]}|null|undefined):AdvanceSuggestion {
 const pending=command?.pendingOrders??[]
 if(pending.some(order=>order.dueTurn==null))return {turns:1}

 let next:{turns:number;item:Milestone;beforeDeadline:boolean}|undefined
 for(const item of [...(command?.agenda??[]),...pending]){
  if(item.dueTurn==null)continue
  const remaining=item.dueTurn-currentTurn
  if(!Number.isFinite(remaining)||remaining<=0)continue
  const beforeDeadline=!!item.requiresAction&&remaining>1
  const turns=Math.ceil(remaining-(beforeDeadline?1:0))
  if(!next||turns<next.turns||(turns===next.turns&&beforeDeadline&&!next.beforeDeadline)){
   next={turns,item,beforeDeadline}
  }
 }
 if(next&&next.turns<=rules.maxBatch)return next
 return {turns:next?rules.maxBatch:1}
}

export function nextTurnCount(currentTurn:number,command:Parameters<typeof nextAdvance>[1]):number {
 return nextAdvance(currentTurn,command).turns
}
