import type {GameLabelIcon} from './gameLabels'

export type AgendaItem={
 id:string
 title:string
 dueTurn:number
 tab:string
 requiresAction?:boolean
 labelIcon?:GameLabelIcon
 targetId?:string
}
