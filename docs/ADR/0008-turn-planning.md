# ADR 0008 — Planejar antes de confirmar o turno

Status: implementado por solicitação do usuário em 2026-11-09.

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

O dispatcher de produção usa execução `queued` por padrão. Não há header, query ou variável de runtime que habilite comandos imediatos. Os testes antigos de regras dos subsistemas optam explicitamente pelo dispatcher interno `immediate`, preservando suas verificações de regras e resolução sem acoplar os fixtures ao novo protocolo. A suíte `planning.test.ts` usa exclusivamente a API pública padrão e cobre fila, reversão, atomicidade, dependências, inteligência, missões, concorrência e cobrança única. A API Fastify normalizada compartilha a mesma execução pública deferida.
