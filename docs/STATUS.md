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

- [x] Operadores, recrutamento, emprego, salários e equipes (incremento 0.2.0).
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

Na revisão de normalização, a Fase 2 ainda estava pendente; seu incremento implementado está registrado abaixo.

## Fase 2 — 0.2.0

- [x] Operadores com seis atributos, nível/XP, especialização, traços e condições.
- [x] Mercado semanal determinístico com reputação e ofertas persistidas.
- [x] Contratar, renovar, expirar vínculos e respeitar caixa/capacidade.
- [x] Salários, dívida por inadimplência e ledger reconciliado, com rollback/retry.
- [x] Equipes, diretrizes, líder/substituto, prontidão e histórico de membros.
- [x] Reserva exclusiva de agenda e atividades básicas de descanso/recuperação/treino.
- [x] Familiaridade persistida por pares participantes de treino conjunto.
- [x] UI mobile e API local compartilhada com Worker.
- [x] 47 testes e smoke de interface; ver VALIDATION.md.
- [ ] Integração efetiva de reforços, snapshots e alocação em missões: Fase 3.
- [ ] Progressão avançada de treinamento, módulos da sede e logística: fases posteriores.

Próximo incremento: contratos comerciais e missões autônomas.

## Fase 3 — 0.3.0

- [x] Seis templates comerciais, renovação semanal e estimativas persistidas.
- [x] Aceite/cancelamento, planejamento sem efeitos e início transacional.
- [x] Snapshot de formação, reforços, liderança e agenda exclusiva.
- [x] Etapas com autonomia por utilidade, efeitos, XP e familiaridade.
- [x] Decisões críticas, interrupção obrigatória, prazo e fallback único.
- [x] Retirada, retorno seguro, pagamento/reputação e devolução de adiantamento.
- [x] Relatórios públicos separados da auditoria interna; ledger reconciliado.
- [x] Interface mobile de contratos, planejamento, operações e decisões.
- [ ] Geração causal de contratos emergentes: Fase 4; modelo source/originEventId e motor compartilhado já testados com fixture.
- [ ] Kits e módulos da sede: Fase 5; ofertas atuais não exigem kits.

Próximo incremento efetivo: mundo dinâmico causal e rivais abstratos.
