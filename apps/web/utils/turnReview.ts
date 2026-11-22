export function turnDuration(turns:number){
 const hours=turns*6
 return hours===168?'1 semana':hours%24===0?(hours/24)+' '+(hours===24?'dia':'dias'):hours+'h'
}
export function turnReview(currentTurn:number,turns:number,command:any){
 const orders=command?.pendingOrders??[]
 const throughTurn=currentTurn+turns
 const agenda=command?.agenda??[]
 const startingActivities=agenda.filter((item:any)=>item.firstPeriodPending)
 const milestones=agenda.filter((item:any)=>!item.firstPeriodPending&&item.dueTurn<=throughTurn)
 const forecast=command?.advanceForecasts?.find((f:any)=>f.turns===turns)??null
 const requiresReview=orders.length>0||startingActivities.length>0||turns>=4||milestones.some((item:any)=>item.requiresAction)||(forecast?.cashAfterObligationsCents??0)<0
 const duration=turnDuration(turns)
 return {orders,throughTurn,startingActivities,milestones,forecast,requiresReview,duration,label:orders.length?'Confirmar '+orders.length+' '+(orders.length===1?'ordem':'ordens')+' · +'+duration:'Avançar '+duration}
}
