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
