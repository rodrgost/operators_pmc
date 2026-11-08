# Estado de implementação — 0.1.0

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
- [ ] Teste de UI em navegador. Esta entrega tem testes da API, domínio, persistência, typecheck e build; não alegar validação visual.

## Demais fases do MVP

- [ ] Operadores, recrutamento, emprego, salários e equipes.
- [ ] Contratos, planejamento, missões, autonomia e decisões.
- [ ] Simulação mundial causal, conflitos e rivais.
- [ ] Kits, logística, sede e atividades.
- [ ] Inteligência progressiva e projeções completas.
- [ ] Balanceamento e campanha jogável de 336 turnos com todos os subsistemas.

O teste de 336 turnos atual cobre somente a fundação; não representa o aceite de campanha completa do MVP.
