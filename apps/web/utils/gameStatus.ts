export function gameStatus(status:string){
 if(['available','ready','completed'].includes(status))return {tone:'ready',icon:'check'}
 if(['failed','destroyed','exhausted','recovery_needed','financial_crisis'].includes(status))return {tone:'danger',icon:'alert'}
 if(['planned','accepted','awaiting_decision','contract_pending','unready','maintenance','in_delivery'].includes(status))return {tone:'attention',icon:status==='awaiting_decision'?'alert':'clock'}
 if(['active','mission','reserved','in_use','training','rest','recovery','returning'].includes(status))return {tone:'active',icon:'clock'}
 return {tone:'neutral',icon:'info'}
}
