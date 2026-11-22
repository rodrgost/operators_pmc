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
 const minutes = date.getUTCMinutes()
 return date.getUTCHours() + 'h' + (minutes ? String(minutes).padStart(2, '0') : '')
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
