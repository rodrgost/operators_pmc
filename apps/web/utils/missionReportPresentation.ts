export function missionReportTitle(title:string){
 return title.replace(/ · (sucesso|resultado parcial|atraso|falha|complicação)$/i,'')
}

export function missionReportOutcome(outcome:string){
 switch(outcome){
  case 'success': return {label:'Sucesso',status:'ready'}
  case 'partial': return {label:'Parcial',status:'planned'}
  case 'delay': return {label:'Atraso',status:'planned'}
  case 'failure': return {label:'Falha',status:'failed'}
  case 'complication': return {label:'Complicação',status:'planned'}
  case 'decision': return {label:'Decisão solicitada',status:'awaiting_decision'}
  default: return null
 }
}

export function missionCrewMetrics(operator?:{health?:number;fatigue?:number;morale?:number}){
 return [
  {label:'Saúde',value:operator?.health},
  {label:'Fadiga',value:operator?.fatigue},
  {label:'Moral',value:operator?.morale},
 ]
}

export function missionKitMetrics(kit:{condition:number;supplies:number}){
 return [{label:'Condição',value:kit.condition},{label:'Suprimentos',value:kit.supplies}]
}
