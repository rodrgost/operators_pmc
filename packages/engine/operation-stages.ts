const stages: Record<string, readonly (readonly [string, string])[]> = {
 security: [
  ["Assumir o posto","A equipe assume a cobertura da instalação."],
  ["Conferir a instalação","A equipe confirma as áreas e os horários do contrato."],
  ["Manter a cobertura","A equipe cumpre o período de proteção contratado."],
  ["Entregar o posto","O líder registra as ocorrências e devolve o posto ao cliente."],
 ],
 escort: [
  ["Encontrar o grupo","A equipe se apresenta no ponto de partida."],
  ["Conferir o grupo","O líder confirma quem deve chegar ao destino e verifica o prazo."],
  ["Acompanhar o deslocamento","A equipe acompanha o grupo até o destino."],
  ["Confirmar a chegada","O destinatário confirma a chegada e o líder registra eventuais atrasos."],
 ],
 reconnaissance: [
  ["Chegar à região","A equipe se posiciona para iniciar o levantamento."],
  ["Verificar os dados iniciais","A equipe identifica quais dados precisam de confirmação."],
  ["Coletar informações","A equipe reúne os dados solicitados pelo cliente."],
  ["Entregar o relatório","O líder apresenta os dados confirmados e aponta as lacunas."],
 ],
 extraction: [
  ["Reunir a equipe","O líder confirma a formação e a disponibilidade de transporte."],
  ["Confirmar o encontro","A equipe verifica se o pessoal previsto está no local combinado."],
  ["Concluir a evacuação","A equipe acompanha a saída do pessoal previsto no contrato."],
  ["Conferir os evacuados","O líder registra quem chegou e se a evacuação ficou incompleta."],
 ],
 recovery: [
  ["Chegar à área","A equipe se apresenta no local indicado pelo cliente."],
  ["Localizar o item","A equipe verifica se o objeto corresponde à descrição."],
  ["Recuperar o item","A equipe recolhe o objeto e registra sua condição."],
  ["Entregar ao cliente","O cliente confere o recebimento e o estado do item."],
 ],
 rescue: [
  ["Mobilizar para a busca","A equipe parte com as informações disponíveis."],
  ["Localizar a pessoa","A equipe confirma sua identidade e condição."],
  ["Retirar a pessoa","A equipe acompanha a pessoa até o ponto de entrega."],
  ["Confirmar o atendimento","O responsável confirma o recebimento e o líder encerra a operação."],
 ],
}

export function operationStage(type: string | null | undefined, index: number) {
 const stage = type && stages[type]?.[index]
 return stage ? {name: stage[0], description: stage[1]} : undefined
}
