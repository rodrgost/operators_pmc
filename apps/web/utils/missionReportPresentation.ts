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

export function missionCashImpact(missionId:string,ledger:{sourceId:string;entryType:string;amountCents:number}[]){
 const prefix='mission:'+missionId+':'
 const entries=ledger.filter(entry=>entry.sourceId.startsWith(prefix))
 const mobilization=entries.find(entry=>entry.entryType==='mission_mobilization')
 if(!mobilization)return null
 return {netCents:entries.reduce((sum,entry)=>sum+entry.amountCents,0),mobilizationCents:-mobilization.amountCents}
}

const stageResults: Record<string, string> = {
 success:'sucesso', partial:'parcial', delay:'atraso', failure:'falha',
}

const decisiveFactors: Record<string, string> = {
 condition:'A condição da equipe, que inclui saúde, fadiga e moral, reduziu o desempenho.',
 leadership:'A liderança elevou o desempenho o suficiente para cumprir a etapa.',
 familiarity:'O entrosamento elevou o desempenho o suficiente para cumprir a etapa.',
 approach:'A abordagem adotada foi decisiva para o resultado da etapa.',
 equipment:'Os kits elevaram o desempenho o suficiente para cumprir a etapa.',
}

export function missionStageReason(report: {
 assessment?: {baseOutcome: string; rolledOutcome: string}
 decisiveFactor?: string
}) {
 const assessment=report.assessment
 if(!assessment)return ''
 const {baseOutcome,rolledOutcome}=assessment
 if(baseOutcome!==rolledOutcome&&stageResults[baseOutcome]&&stageResults[rolledOutcome])
  return 'O sorteio mudou o resultado de '+stageResults[baseOutcome]+' para '+stageResults[rolledOutcome]+'.'
 if(report.decisiveFactor&&decisiveFactors[report.decisiveFactor])
  return decisiveFactors[report.decisiveFactor]
 switch(rolledOutcome){
  case 'success': return 'A capacidade da equipe atingiu a exigência da etapa.'
  case 'partial': return 'A capacidade da equipe ficou abaixo do necessário para cumprir toda a etapa.'
  case 'delay': return 'A capacidade ficou abaixo do necessário e a etapa precisou de mais um turno.'
  case 'failure': return 'A equipe ficou abaixo do necessário para concluir a etapa ou tentar novamente.'
  default: return ''
 }
}

export function missionClosingReason(
 closing: {outcome:string;description:string;earlyPartial?:boolean;successPoints?:number;requiredSuccessPoints?:number;maximumSuccessPoints?:number;evacuationChoice?:{automatic?:boolean}},
 execution?: {outcome:string},
 withdrawal?: {description:string},
) {
 if(closing.outcome==='withdrawn')return withdrawal?.description??'A equipe retornou antes de concluir a operação.'
 if(closing.earlyPartial||closing.description==='A equipe encerrou a evacuação com parte do objetivo cumprida.')
  return closing.description+' '+(closing.evacuationChoice?.automatic?'O prazo da decisão venceu e o encerramento parcial foi aplicado automaticamente.':'O comandante escolheu encerrar após o atraso no transporte.')
 if(closing.successPoints===undefined||closing.requiredSuccessPoints===undefined||closing.maximumSuccessPoints===undefined)
  return closing.description
 const score=closing.successPoints+' de '+closing.maximumSuccessPoints+' pontos (mínimo de '+closing.requiredSuccessPoints+').'
 if(closing.outcome==='failed')return 'A operação fracassou porque a pontuação ficou abaixo do mínimo. A equipe somou '+score
 if(execution?.outcome==='failure')return 'A Execução falhou. A pontuação das demais etapas permitiu concluir o contrato com '+score
 if(execution?.outcome==='partial')return 'A Execução foi parcial. A pontuação prevista no contrato permitiu concluir a operação com '+score
 return 'A equipe atingiu a pontuação de conclusão da operação com '+score
}
