export interface PreparationStep {id:string;title:string;done:boolean;tab:string}
export function firstMissionGuide(command:{steps?:PreparationStep[];pendingOrders?:{kind:string}[];agenda?:{tab:string;dueTurn:number;title:string}[]}|null,employed=0){
 const steps=(command?.steps??[]).map(step=>step.id==='squad'?{...step,title:'Montar equipe e definir o líder'}:step)
 if(!steps.length||steps.some(step=>step.id==='mission'&&step.done))return null
 const next=steps.find(step=>!step.done)
 if(!next)return null
 const content:Record<string,{description:string;action:string;section:string}>={
  recruit:{description:'Escolha pelo menos dois operadores. As contratações ficam agendadas até você avançar o tempo.',action:'Recrutar operadores',section:'recruitment'},
  squad:{description:'Reúna pelo menos dois membros e escolha um deles como líder. Você também pode usar contratações planejadas.',action:'Montar equipe',section:'squads'},
  kits:{description:'Consulte os contratos para saber quais kits serão exigidos. Agende a compra e avance o tempo para receber a entrega.',action:'Escolher kits',section:'catalog'},
  mission:{description:'Escolha um contrato, confira os requisitos e prepare a equipe. Aceitar inicia o prazo de mobilização.',action:'Encontrar contrato',section:''}
 }
 const hint=content[next.id]??{description:'Continue a preparação da companhia.',action:'Continuar',section:''}
 const queuedHires=command?.pendingOrders?.filter(order=>order.kind==='hire').length??0
 const waitingForHires=next.id==='recruit'&&employed+queuedHires>=2
 const delivery=next.id==='kits'?command?.agenda?.find(item=>item.tab==='infrastructure'&&item.title.includes('entrega')):null
 return {steps,completed:steps.filter(step=>step.done).length,total:steps.length,next:{...next,...hint,...(waitingForHires?{title:'Confirme as contratações',description:'Você já agendou os operadores necessários. Avance 1 turno para confirmar as ordens; confira os custos antes de avançar.',action:'Revisar operadores',section:'roster'}:{}),...(delivery?{title:'Acompanhe a entrega dos kits',description:'Há kits em entrega. Confira os prazos no estoque e avance o tempo até a chegada. Cada contrato pode exigir categorias diferentes.',action:'Ver entregas',section:'inventory'}:{})}}
}
