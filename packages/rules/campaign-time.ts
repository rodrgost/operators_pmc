import { rules } from './index.ts'

const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' })
const month = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' })
const dayMs = 86_400_000

export function campaignTimeAt(date: string, currentTurn: number, targetTurn: number) {
 return new Date(Date.parse(date) + (targetTurn - currentTurn) * rules.hoursPerTurn * 3_600_000)
}

export function campaignDay(date: Date) {
 return `${weekday.format(date).replace('.', '')}, ${date.getUTCDate()} ${month.format(date).replace('.', '')}`
}

export function campaignHour(date: Date) {
 return formatClock(date.getUTCHours(),date.getUTCMinutes())
}
function formatClock(hours:number|string,minutes:number|string) {
 return String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0')
}

// Pending orders can carry a preview saved before the clock format changed.
export function normalizeSavedClock(text?:string) {
 return text?.replace(/(\b\d{1,2} [\p{L}]{3}(?: \d{4})? · )(\d{1,2})h(\d{2})?\b/gu,
  (_,date,hours,minutes)=>date+formatClock(hours,minutes??0))
}

export function campaignDateTime(date: Date, includeYear = false) {
 if (!Number.isFinite(date.getTime())) return 'Data indisponível'
 return `${campaignDay(date)}${includeYear ? ' ' + date.getUTCFullYear() : ''} · ${campaignHour(date)}`
}

export function campaignDayOffset(date: Date, today: Date) {
 return Math.floor(date.getTime() / dayMs) - Math.floor(today.getTime() / dayMs)
}

export function campaignDuration(turns: number) {
 if (turns === rules.turnsPerWeek) return '1 semana'
 const hours = turns * rules.hoursPerTurn
 const days = Math.floor(hours / 24)
 const remainder = hours % 24
 if (!days) return hours + 'h'
 return days + (days === 1 ? ' dia' : ' dias') + (remainder ? ' e ' + remainder + 'h' : '')
}
