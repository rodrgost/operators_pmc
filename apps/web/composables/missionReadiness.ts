// Advisory checks for preparation. The server validates availability, costs and load again.
export function missionReadiness(contract:any,people:any,plan:any,inventory:any[]){
 const teamIssues:string[]=[],members:string[]=plan.memberIds??[],reinforcements:string[]=plan.reinforcementIds??[],ids=[...members,...reinforcements]
 const squad=people.squads.find((s:any)=>s.id===plan.squadId)
 if(!squad)teamIssues.push('Selecione uma equipe permanente.')
 if(ids.length<(contract?.minimumOperators??2))teamIssues.push('Selecione pelo menos '+(contract?.minimumOperators??2)+' operadores.')
 if(new Set(ids).size!==ids.length)teamIssues.push('Um operador aparece mais de uma vez na formação.')
 if(members.some(id=>!squad?.memberIds.includes(id)))teamIssues.push('Atualize os membros da equipe selecionada.')
 if(ids.some(id=>!people.operators.some((o:any)=>o.id===id&&o.availability==='available')))teamIssues.push('Há operadores indisponíveis. Ajuste a formação ou consulte o efetivo.')
 if(!plan.leaderId||!ids.includes(plan.leaderId))teamIssues.push('Escolha um líder entre os operadores enviados.')
 if(plan.deputyId&&(!ids.includes(plan.deputyId)||plan.deputyId===plan.leaderId))teamIssues.push('O substituto deve estar presente e ser diferente do líder.')
 const kits=inventory.filter(k=>(plan.equipmentIds??[]).includes(k.id)&&k.ready)
 const missingEquipment:string[]=(contract?.requiredEquipment??[]).filter((category:string)=>!kits.some(k=>k.category===category))
 return {teamIssues,missingEquipment}
}

type SupplyKit={id:string;category:string;status:string;dueTurn:number|null}
type SupplyOrder={kind:string;target:string;dueTurn?:number|null;labelIcon?:{code:string};command?:{catalogId?:string}}

export function kitSupplyOptions(categories:string[],inventory:SupplyKit[],orders:SupplyOrder[]){
 return categories.map(category=>{
  const kits=inventory.filter(kit=>kit.category===category)
  const arriving=kits.filter(kit=>kit.status==='in_delivery'||kit.status==='maintenance')
   .sort((a,b)=>(a.dueTurn??Infinity)-(b.dueTurn??Infinity))[0]
  if(arriving)return {category,section:'inventory',action:arriving.status==='in_delivery'?'Ver entrega':'Ver serviço',dueTurn:arriving.dueTurn}
  const service=orders.find(order=>['maintenance','resupply','refurbish'].includes(order.kind)&&kits.some(kit=>kit.id===order.target))
  if(service)return {category,section:'inventory',action:'Ver serviço agendado',dueTurn:service.dueTurn}
  const purchase=orders.find(order=>order.kind==='purchase'&&order.labelIcon?.code===category)
  if(purchase)return {category,section:'catalog',action:'Ver compra agendada',dueTurn:purchase.dueTurn,catalogId:purchase.command?.catalogId}
  if(kits.some(kit=>kit.status==='available'))return {category,section:'inventory',action:'Preparar kit'}
  return {category,section:'catalog',action:'Comprar kit'}
 })
}
