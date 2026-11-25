import rules from '../../../packages/rules/operations.json' with {type:'json'}

export type RosterAction='renew'|'recovery'|'rest'

type RosterCondition={
 employment?:{end_turn:number}|null
 reservation?:unknown
 availability?:string
 health:number
 fatigue:number
 restTurns:number
}

export function rosterRecommendation(operator:RosterCondition,currentTurn:number,recoveryTurns:number,hasOrders:boolean):RosterAction|null{
 if(hasOrders)return null
 if(!operator.employment)return 'renew'
 if(operator.reservation)return null

 const recoveryFirst=operator.availability==='recovery_needed'||(operator.health<100&&operator.availability!=='exhausted')
 const activity=recoveryFirst?'recovery':operator.fatigue>0?'rest':null
 const duration=activity==='recovery'?recoveryTurns:activity==='rest'?operator.restTurns:0
 const timeLeft=operator.employment.end_turn-currentTurn
 if(timeLeft<duration)return 'renew'
 if(operator.availability==='recovery_needed'||operator.availability==='exhausted')return activity
 return timeLeft<=rules.maxMissionTurns?'renew':activity
}
