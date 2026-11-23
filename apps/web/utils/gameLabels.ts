import logisticsRules from '../../../packages/rules/logistics.json' with {type:'json'}

export type GameLabelIcon = {kind:'kit'|'mission';code?:string}

export const kitNames: Record<string, string> = Object.fromEntries(
 logisticsRules.categories.map(({id,name})=>[id,name]),
)

export const missionTypeNames: Record<string, string> = {
 security:'Segurança',
 escort:'Escolta',
 reconnaissance:'Reconhecimento',
 extraction:'Extração',
 recovery:'Recuperação',
 rescue:'Resgate',
}

export function reportedKitCategory(name:string){
 // Older reports store the displayed kit name and quality, without its category.
 const baseName=name.replace(/ (?:III|II|I)$/,'')
 return logisticsRules.categories.find(category=>category.name===baseName)?.id
}
