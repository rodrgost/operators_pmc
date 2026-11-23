import {campaignDateTime,campaignDayOffset,campaignDuration,campaignTimeAt} from '../../../packages/rules/campaign-time.ts'
import {rules} from '../../../packages/rules/index.ts'

type CampaignClock = {date:string;currentTurn:number}

export function campaignAgendaWeek<T extends {dueTurn:number}>(game:CampaignClock,items:T[],weeksAhead:number) {
 const today=new Date(game.date)
 const weekday=today.getUTCDay()
 const firstDay=weeksAhead*7-weekday
 const days=Array.from({length:7},(_,index)=>{
  const offset=firstDay+index
  const date=new Date(today)
  date.setUTCHours(0,0,0,0)
  date.setUTCDate(date.getUTCDate()+offset)
  return {date,isToday:offset===0,items:[] as T[]}
 })
 for(const item of [...items].sort((a,b)=>a.dueTurn-b.dueTurn)){
  const date=campaignTimeAt(game.date,game.currentTurn,item.dueTurn)
  const index=campaignDayOffset(date,today)-firstDay
  days[index]?.items.push(item)
 }
 return days
}

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

export function campaignWeek(turn:number) {
 return Math.floor(turn/rules.turnsPerWeek)+1
}

export function nextCampaignWeek(turn:number) {
 return campaignWeek(turn)*rules.turnsPerWeek
}
