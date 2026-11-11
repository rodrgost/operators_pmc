# ADR 0008 — Planejar antes de confirmar o turno

Status: implementado por solicitação do usuário em 2026-11-09.

## Revisão em 2026-11-11 — decisões sem avanço e execução por período

Renovar vínculo, aceitar/cancelar contrato não iniciado, responder decisão, ordenar retirada e interromper atividade são confirmações imediatas. Não avançam o relógio. Retirada e decisões alteram a ordem em vigor, mas a próxima etapa, retorno e acerto financeiro só acontecem ao simular o período seguinte. Interrupção preserva cura, atributo e progresso já obtidos, sem reembolso. Ferimentos graves exigem oito turnos mínimos de tratamento antes da interrupção. Conflitos com ordens planejadas do mesmo alvo exigem remover a ordem pendente primeiro.

Contratações continuam reversíveis no planejamento por envolverem custo, podendo encadear formação e missão. Renovar um vínculo de uma contratação ainda planejada também depende dessa confirmação. Comandos administrativos já salvos na fila continuam no protocolo anterior, incluindo repetição após confirmação, para preservar campanhas e idempotência.

Aceitar contrato registra imediatamente `acceptedTurn` e `mobilizationDueTurn` dentro do JSON de contexto já persistido. O prazo de mobilização é de oito turnos (dois dias), contado do aceite; o vencimento original continua sendo o prazo para aceitar a oferta. Contratos aceitos em saves antigos sem esses campos mantêm o prazo original. Missões iniciadas dentro da janela podem prosseguir depois dela.

Tratamento recupera saúde por período até 100, com previsão variável e mínimo para ferimentos graves. Descanso segue até fadiga zero. Ambos recalculam a conclusão conforme os efeitos efetivos. Treinamento mantém sessões de quatro turnos; a UI prevê atributo e progresso ao final, esclarecendo que uma sessão pode terminar sem aumentar o atributo. O cálculo da previsão reutiliza a progressão real, incluindo melhoria de treinamento já prevista durante a sessão.

A sugestão de avanço considera prazos ativos e conclusões/etapas de ordens planejadas. Compromissos sem duração (ou ordens antigas sem previsão) sugerem um período; não existe período adicional de confirmação. A agenda inclui o prazo de mobilização dos contratos aceitos. A sugestão para prazos que exigem ação para um período antes do vencimento, deixando uma oportunidade de decisão.

O painel de avanço mostra compromissos financeiros conhecidos para os 1–28 períodos selecionados: ordens confirmadas, salários, sede, dívidas atuais e devoluções de adiantamento de missões já em retorno. Usa pessoal e logística projetados, incluindo contratações e melhorias pendentes. Receitas incertas de missões são excluídas; saldo após compromissos é capacidade financeira estimada, podendo ser negativo, e não promessa de pagamentos efetivos ou duração integral do lote. Planejamento inválido mantém suas ordens visíveis e desabilita a previsão financeira até correção.

## Revisão em 2026-11-11 — execução desde o primeiro avanço

Planejar não consome tempo. As ordens são aplicadas antes da resolução do período, e o primeiro avanço já conta para duração e efeitos. A fila e os cards mostram previsão de conclusão (ou próxima etapa), incluindo esse primeiro período.

Descanso recupera fadiga a cada turno até zerar, com duração estimada pela fadiga atual. Interromper um descanso ativo é imediato e preserva a recuperação obtida. Descansos existentes passam a seguir essa regra no próximo avanço. A revisão acima substitui a duração fixa do tratamento e mantém sessões de treinamento.

Equipes com contratações pendentes são planejadas junto delas; a organização com operadores já contratados continua imediata. A projeção de pessoal permite selecionar os futuros integrantes e a equipe ao planejar uma missão. A revisão de formação usa o mesmo estado virtual da fila, permitindo contratar, montar equipe, aceitar contrato e enviar na mesma confirmação, desde que os recursos necessários já estejam disponíveis. Remover uma dependência não remove outras ordens silenciosamente: elas continuam visíveis e impedem a confirmação até a correção.

A API pública passa a enfileirar os comandos mutáveis de domínio. `online_pending_orders` guarda comando, chave idempotente, escopo, alvo, custo líquido estimado, título, estado e turno de confirmação. A migration é aditiva; histórico financeiro e saves existentes são preservados.

## Validação e atomicidade

`worker/planning.ts` cria um contexto de simulação com clones das projeções internas autorizadas de domínio. Reutiliza as validações das ações existentes por um adaptador sem escrita: `getGame` e leituras de domínio consultam o contexto; `mutate` somente registra builders e atualiza o estado virtual. Isso evita uma segunda implementação das regras.

Cada ordem é validada sobre o resultado virtual anterior. Revalidar antes de registrar o avanço; durante o turno, repetir a preparação sobre o snapshot congelado. A fila fica bloqueada enquanto há lote ativo. Resolução e ordens são confirmadas no mesmo `commitTurn`, sob a revisão CAS e token transacional existentes.

Estados finais de pessoal, operações, mundo, logística e inteligência são persistidos uma vez, em ordem de FK. Dos builders capturados, conservar apenas fatos imutáveis de ledger, histórico de pessoal e idempotência das ações. Marcar ordens confirmadas no mesmo batch. Falha SQL desfaz tudo, mantendo a fila para correção/retomada.

Registrar cobranças no turno confirmado, sem duplicação por retry. O resumo de avanço inclui fatos das ordens confirmadas e fatos automáticos, sem ser alterado por ordens futuras. Manter limite de 20 ordens por confirmação nesta versão.

## Reversibilidade

POST das rotas existentes retorna `queued: true`, `orderId`, estado efetivo inalterado e custo previsto. GET `/games/:id/orders` lista pendentes. POST `/games/:id/orders/:orderId/cancel` remove idempotentemente uma ordem ainda pendente. Remover não cobra e não apaga dependências silenciosamente; conjunto inválido bloqueia o avanço com indicação da causa. Editar significa remover e agendar novamente.

## UI

Saldo e previsão no topo; TurnDock compartilhado em todas as páginas, seguro para área do sistema no celular. ResizeObserver reserva no conteúdo a altura real do painel, inclusive expandido. A agenda exibe diferenças de turnos, distinguindo conclusão, próxima etapa de missão e compromissos financeiros.

## Testes e compatibilidade

O dispatcher de produção mantém o planejamento como padrão para atividades e investimentos, com as ações administrativas imediatas definidas acima. Não há header, query ou variável de runtime que altere essa classificação. Os testes antigos de regras dos subsistemas optam explicitamente pelo dispatcher interno `immediate`, preservando suas verificações de regras e resolução sem acoplar os fixtures ao novo protocolo. A suíte `planning.test.ts` usa exclusivamente a API pública padrão e cobre fila, reversão, atomicidade, dependências, inteligência, missões, concorrência e cobrança única. A API Fastify normalizada compartilha a mesma classificação pública de ações.
