# Estado de implementação — fundação 0.1.1, revisão local

## Concluído neste incremento

- [x] Monorepo TypeScript, Fastify, Nuxt, SQLite, Zod e Vitest.
- [x] Migration inicial, seed Asterra, parâmetros e ADR.
- [x] Criar, listar, abrir e persistir partidas.
- [x] Avançar 1–28 turnos, confirmar por turno e manter histórico.
- [x] RNG por chave, hash e equivalência de lote/individual.
- [x] Idempotência, conflito de versão, rollback, falha parcial e retomada.
- [x] Interrupção por evento importante.
- [x] Dashboard, mundo inicial e ledger de capital inicial.

## Pendente da Fase 1 completa

- [ ] Decisões críticas, prazo e fallback: integrar ao motor de missões.
- [ ] Snapshot/replay de toda a campanha: hoje existem estado atual, eventos e resumos por turno.
- [x] Smoke test de UI em navegador: criar campanha e avançar quatro turnos. Revisão completa de responsividade e fluxos de falha no navegador continua pendente.

## Demais fases do MVP

- [ ] Operadores, recrutamento, emprego, salários e equipes.
- [ ] Contratos, planejamento, missões, autonomia e decisões.
- [ ] Simulação mundial causal, conflitos e rivais.
- [ ] Kits, logística, sede e atividades.
- [ ] Inteligência progressiva e projeções completas.
- [ ] Balanceamento e campanha jogável de 336 turnos com todos os subsistemas.

O teste de 336 turnos atual cobre somente a fundação; não representa o aceite de campanha completa do MVP.

## Correções locais da fundação

- [x] Preview com porta padrão válida, bind em loopback e verificação de origem.
- [x] Regras temporais puras compartilhadas entre Node e Worker.
- [x] Falha parcial online com retomada explícita e liberação de lock.
- [x] Proteção contra colisão de IDs com propriedades herdadas.
- [x] Retry de criação na interface preserva requestId.
- [x] 21 testes, typecheck e build online aprovados; ver docs/VALIDATION.md.
- [x] Normalizar persistência online antes de ampliar subsistemas (ADR 0004).

A revisão anterior preservou o schema. A normalização subsequente adiciona tabelas e migration, preservando a versão das regras e o site publicado.

## Persistência normalizada — revisão local

- [x] Estado atual, comandos, eventos, resumos e ledger em tabelas dedicadas.
- [x] Migration Drizzle incremental e runner de preview corrigido.
- [x] Transação por turno com revisão interna e token para escritas concorrentes.
- [x] Importação atômica de saves antigos com preservação do JSON original.
- [x] Paginação SQL; remoção do limite artificial de 1,5 MB por campanha.
- [x] 31 testes, checagem de tipos e build online aprovados.
- [x] Campanha de QA local importada no turno 4 e avançada uma vez para o turno 5; retry sem duplicação.
- [ ] Validar futura implantação com D1 real; banco hospedado não foi alterado.

Operadores, recrutamento e demais subsistemas da Fase 2 continuam pendentes.
