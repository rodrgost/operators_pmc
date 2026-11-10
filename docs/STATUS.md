# Estado atual — 0.7.0

- Fases 1–6 implementadas: persistência, pessoal, missões/decisões, mundo/rivais, kits/sede e inteligência.
- Primeira revisão de UX/qualidade da Fase 7: alertas, agenda, despesas completas, resumo recuperável de lote e filtros.
- 117 testes, tipos/build e campanha integrada de 336 turnos. Relatório: QUALITY-REPORT.md.
- Balanceamento numérico preservado e ainda provisório. A simulação de uma semente não substitui validação do jogador nem prova todas as escolhas.
- Replay integral/exportação de campanha e auditoria ampla de acessibilidade permanecem fora desta entrega.

## Histórico das entregas

Os registros abaixo preservam o estado de cada revisão na época; pendências antigas podem ter sido resolvidas em incrementos posteriores.

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


## Incremento 0.4.0 — mundo causal (2026-11-08)

Implementados indicadores regionais estimados, influência normalizada, controle político, organizações/relações, conflitos com participantes, notícias com origem consultável, demandas emergentes e três PMCs rivais agregadas. Rivais consomem somente ofertas disponíveis após quatro turnos e usam orçamento próprio. Missões do jogador produzem consequências regionais/diplomáticas no mesmo commit do pagamento. Ativação no primeiro acesso aos dados mundiais, a partir do turno atual, sem retroatividade.

Regras provisórias em packages/rules/world.json; ADR 0007; migration incremental 0004_parallel_scream.sql, nove tabelas novas (29 no total). Estado atual carregado separadamente do histórico paginado. Estimativas persistidas atualizam a cada quatro turnos ou notícia; valores internos e RNG não são enviados ao navegador. Não há novos backups. Próximo incremento: Fase 5, logística, equipamentos/kits e sede.


## Incremento 0.5.0 — logística e infraestrutura (2026-11-08)

Implementados catálogo de 18 kits, estoque por instância, compra/entrega, carga, requisitos de missão e alocação exclusiva com snapshot imutável. Etapas consomem suprimentos e desgastam condição sem nova cobrança; retorno libera kits; reparo e reposição são serviços separados. Efeitos dependem de categoria, etapa/tipo, qualidade, condição, suprimentos, especialização enviada e duplicatas.

Uma sede, cinco módulos níveis 1–5, melhorias sequenciais com prazo e capacidade antiga preservada; manutenção semanal após salários, dívida e quitação automática. Treino/enfermaria respeitam vagas; treinamento por atributo preserva progresso ao interromper; tratamento grave tem mínimo de oito turnos. Visão geral → Sede e logística; planejamento permite selecionar kits. Ativação sem retroatividade ao abrir logística (a interface inicializa ao selecionar a campanha), mantendo missões já enviadas. Regras provisórias em packages/rules/logistics.json, ADR 0008 e migration 0005_new_proudstar.sql (35 tabelas). Próximo incremento: inteligência progressiva.


## Incremento 0.6.0 — inteligência progressiva (2026-11-08)

Conhecimento separado da verdade oculta: registros imutáveis com assunto/alvo, nível 0–3, intervalo, confiança, fonte, coleta/validade e histórico encadeado. Índice corrente por fonte e histórico paginado. Fontes públicas e do contratante, análises remuneradas (USD 250, dois turnos, duas vagas), reconhecimento por missão independente e durante missão. Risco e tensão envelhecem mais rapidamente que economia/infraestrutura. Fontes conflitantes permanecem visíveis; leituras não re-sorteiam estimativas.

Mundo e Contratos oferecem dossiês e análises; planejamento registra conhecimento de partida imutável; novas informações orientam a avaliação de risco e decisões autônomas, sem bônus universal de sucesso ou redução do risco real. Migração incremental 0006_mysterious_ironclad.sql, 39 tabelas; regras provisórias em intelligence.json e ADR 0009. Partidas antigas importam estimativas existentes preservando data e missões enviadas. Próximo incremento: Fase 7, UX, balanceamento e qualidade; não representa aceite final de todo o MVP.


## Incremento 0.7.0 — UX e qualidade

Centro de comando, alertas de dívida/decisões/vínculos/condições/kits, agenda, preparação inicial, gastos semanais de salários+infraestrutura, autonomia financeira estimada; resumo recuperável com movimentações e ocorrências do avanço; busca/tipo/status de contratos. Respostas tardias de dossiês são descartadas; refresh falho preserva comando para retry. Sem alterações de regras ou migrations. Ver QUALITY-REPORT.md e ADR 0010.

## Atualização 0.8.0

Planejamento de ordens e confirmação atômica na passagem implementados. Saldo fixo no topo e agenda/controle de turno no rodapé aplicados globalmente na campanha. Migração aditiva; saves anteriores preservados. Valores e custos continuam provisórios. Ver ADR 0008 e planning.test.ts.

## Atualização 0.9.0

Dificuldade permanente por companhia, snapshot versionado, migração compatível e seletor mobile implementados. Normal mantém os mesmos resultados da versão anterior. Relatório multi-semente: DIFFICULTY_BALANCE.json. Contratos antigos não são recalculados; perfis futuros não substituem valores de campanhas já abertas.
