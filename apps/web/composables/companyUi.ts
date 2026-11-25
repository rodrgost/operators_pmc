const normalizedName=(name:string)=>name.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu,'')
export function matchesPersonnel(person:{name?:string;callsign?:string;specialization?:string},specialty='',search=''){
 return (!specialty||person.specialization===specialty)&&normalizedName([person.name,person.callsign].join(' ')).includes(normalizedName(search))
}
export function candidateList(candidates:any[],specialty='',sort='salary',search=''){
 const values=candidates.filter(candidate=>matchesPersonnel(candidate,specialty,search))
 return [...values].sort((a,b)=>sort==='level'?b.level-a.level||a.salaryCents-b.salaryCents:sort==='bonus'?a.signingBonusCents-b.signingBonusCents:sort==='leadership'?(b.attributes?.leadership??0)-(a.attributes?.leadership??0):a.salaryCents-b.salaryCents)
}
export function kitCatalogGroups(catalog:any[],category=''){
 const groups=new Map<string,any[]>()
 for(const item of catalog){if(category&&item.category!==category)continue;const variants=groups.get(item.category)??[];variants.push(item);groups.set(item.category,variants)}
 return [...groups].map(([category,variants])=>({category,variants:[...variants].sort((a,b)=>a.quality-b.quality)}))
}
export function squadStatus(squad:any,operators:any[]){
 const crew=squad.memberIds.map((id:string)=>operators.find(o=>o.id===id))
 const available=crew.filter((o:any)=>o?.availability==='available').length
 const issues:string[]=[]
 if(squad.memberIds.length<2)issues.push('Inclua pelo menos dois membros.')
 if(!squad.effectiveLeaderId)issues.push('Nenhum líder ou substituto disponível.')
 if(available<crew.length)issues.push((crew.length-available)+' membro(s) indisponível(is).')
 return {available,total:crew.length,issues}
}
export function kitPurchaseIssue(item:any,quantity:number,data:any,cash:number){
 if(data.headquarters.arrearsCents)return 'Quite a manutenção da sede antes de comprar.'
 if(!Number.isInteger(quantity)||quantity<1||quantity>10)return 'Escolha uma quantidade entre 1 e 10.'
 if(cash<item.priceCents*quantity)return 'Caixa insuficiente para esta compra.'
 if(data.load+item.weight*quantity>data.loadCapacity)return 'A compra excede a capacidade de armazenagem.'
 return ''
}
