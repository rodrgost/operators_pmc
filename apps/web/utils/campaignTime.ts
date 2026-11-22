import {campaignDateTime,campaignDuration,campaignTimeAt} from '../../../packages/rules/campaign-time.ts'
import {rules} from '../../../packages/rules/index.ts'

type CampaignClock = {date:string;currentTurn:number}

export function formatCampaignTurn(game:CampaignClock,turn:number|null|undefined,includeYear=false) {
 if(turn==null)return 'Data indisponível'
 const time=campaignTimeAt(game.date,game.currentTurn,turn)
 return campaignDateTime(time,includeYear||time.getUTCFullYear()!==new Date(game.date).getUTCFullYear())
}

export function formatCampaignDuration(turns:number) {
 return campaignDuration(turns)
}

export function formatCampaignEvent(game:CampaignClock,event:{type:string;description:string}) {
 if(event.type==='critical_decision'){
  return event.description.replace(/até T(\d+)\.$/,(_,turn)=>'até '+formatCampaignTurn(game,Number(turn))+'.')
 }
 if(event.type==='orders_committed'){
  return event.description.replace(/ no início do turno\.$/,' no início do avanço.')
 }
 return event.description
}

export function formatCampaignReport(description:string|undefined) {
 return description
  ?.replace('O andamento desta fase exigiu um turno adicional.',`O andamento desta fase exigiu mais ${campaignDuration(1)}.`)
  .replace('O objetivo desta fase não foi resolvido dentro do turno previsto.','O prazo previsto para esta fase terminou com o objetivo pendente.')
  .replace(/ Consulte as condições atuais da formação\.$/,'')
}

export function nextCampaignWeek(turn:number) {
 return (Math.floor(turn/rules.turnsPerWeek)+1)*rules.turnsPerWeek
}
