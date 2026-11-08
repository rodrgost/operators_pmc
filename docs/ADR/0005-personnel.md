# ADR 0005 — Operadores, vínculos e equipes

Status: adotado em 2026-11-08; implementação 0.2.0.

Dados: candidatos semanais com oferta persistida; operadores com atributos e condições; vínculos com vigência, próximo vencimento salarial e dívida; equipes, membros com histórico, familiaridade em pares canônicos; reservas exclusivas de agenda; histórico pessoal e comandos idempotentes. Todas as relações pertencem à campanha; transações usam revisão/token e versão pública também avança em ações do jogador.

Parâmetros iniciais configuráveis: seis candidatos por semana; capacidade administrativa 12; equipes de 2–6, admitindo rascunho abaixo de dois; vínculos 4/8/12 semanas; bônus de assinatura de um salário semanal. Faixas salariais seguem os exemplos do MVP. Não há operadores iniciais gratuitos. Mercado é congelado ao surgir, com sorteios por seed, versão de pessoal, semana e índice; reputação afeta qualidade. IDs são determinísticos por campanha, sem expor seed.

Pagamento a cada 28 turnos do vínculo, inclusive o último vencimento no final do contrato; depois expira. Salários são inteiros em centavos. Falta de caixa gera dívida e reduz moral/lealdade somente nos vencimentos; dívida é quitada automaticamente quando há caixa, inclusive após expiração. Ledger registra apenas movimentos efetivos. Crise financeira sem game over. Renovação estende vínculo ativo pelo mesmo salário, sem novo bônus; vínculo expirado pode ser renovado se não houver dívida, criando outro registro. Sem cancelamento/desligamento antecipado nesta fase.

Disponibilidade deriva do vínculo, saúde e reserva de agenda, nunca de booleano. Uma reserva exclusiva impede missão/atividade simultâneas. Atividades básicas de descanso, recuperação e treino conjunto duram quatro turnos, com efeitos conservadores configuráveis; treinamento conjunto aumenta familiaridade entre os pares efetivamente presentes. Progressão avançada, módulos da sede, missões e reforços efetivamente enviados pertencem às fases posteriores. Equipes guardam diretrizes, líder titular e substituto; líder efetivo exige presença e aptidão. Trocas preservam histórico e pares familiares.

Compatibilidade: regras temporais legadas continuam válidas; módulo de pessoal tem versão própria persistida. A inicialização é idempotente no primeiro acesso ao módulo e não muda o turno. Saves sem pessoal continuam reproduzindo hashes legados; após ativação, hash inclui estado canônico de pessoal. Novas tabelas são migration schema-only. Interface e API local de desenvolvimento usam a mesma aplicação normalizada que o Worker; base Fastify original fica preservada como legado.

Testes: determinismo, mercado semanal e expiração, dinheiro/capacidade, retry e concorrência, rollback, salários/dívida/último vencimento, renovação, equipes/histórico/liderança, agenda exclusiva e familiaridade, isolamento de dono, retomada e save antigo. Publicar somente após testes, typecheck, build e smoke da interface.


Implementação: migration 0002_secret_mach_iv.sql, schema-only; API de criação/edição de equipes e inclusão/remoção de membros com histórico. Trocar formação não modifica reservas de atividades em andamento: familiaridade usa os participantes reservados, não a formação atual. Histórico de operadores e equipes é paginado. Parâmetros financeiros e de condições centralizados em JSON. Comandos da UI pendentes sobrevivem à troca de aba dentro da sessão; recarregar o aplicativo descarta a memória da UI, mas não o resultado persistido no servidor.

Validação local: 47 testes, typecheck e build, mais smoke de contratação de dois operadores, formação com líder/substituto e conclusão de treino conjunto. Layout inspecionado em 390 px. Não há simulação de combate ou reforços enviados sem o motor de missões.
