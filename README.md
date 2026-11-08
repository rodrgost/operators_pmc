# OPERATORS — PMC Command · 0.3.0

Jogo de gestão single-player em português. A edição atual implementa a fundação temporal e a gestão de pessoal: recrutamento semanal, operadores, vínculos de emprego, salários, equipes permanentes e familiaridade. Contratos comerciais e missões autônomas agora estão disponíveis. Simulação mundial causal, kits, sede e inteligência progressiva continuam pendentes.

## Executar localmente

Requisitos: Node.js 24 e npm.

```sh
npm ci
npm run build:online
npm run dev
```

Abra http://127.0.0.1:3000. O preview usa SQLite local em `data/online-preview.sqlite`, aplica migrations pendentes e injeta a identidade `local-preview`. Escuta somente em loopback; não usar como servidor público. Para outra porta: `npm run dev -- --port 3002`.

Para recarga automática da interface Nuxt e API Fastify com a mesma aplicação normalizada:

```sh
npm run dev:local
```

A interface fica na porta 3000 e a API em 3001. `DATABASE_PATH` altera o banco da API local. `API_BASE` altera o proxy Nuxt. Preview e API local compartilham o banco normalizado padrão; os saves publicados ficam no D1 remoto, isolados por identidade ChatGPT.

A API original da fundação permanece em `apps/api/src/app.ts` e pode ser iniciada com `npm run start:legacy`; usa `data/operators.sqlite` e não oferece pessoal. Não misturar esse banco com o normalizado.

## Começar uma companhia

Crie uma partida e abra **Operadores → Recrutamento**. Escolha vínculo de 4, 8 ou 12 semanas, revise o bônus de assinatura e o salário, e confirme. A oferta semanal inicial tem seis candidatos; capacidade inicial de 12 vínculos ativos. Valores de balanceamento são configuráveis em `packages/rules/personnel.json`.

Salários vencem a cada 28 turnos do vínculo, inclusive a última semana contratada. Falta de caixa gera dívida salarial e perda de moral/lealdade; a dívida é quitada quando houver caixa suficiente. O ledger registra apenas saídas efetivas. Não há game over financeiro automático.

Em **Equipes**, selecione até seis membros, líder, substituto e diretrizes. Equipes abaixo de dois membros são rascunhos. Treino conjunto dura quatro turnos, aumenta fadiga e familiaridade dos participantes. Descanso reduz fadiga e recuperação melhora saúde. Detalhes e histórico ficam na ficha do operador. Missões usam uma formação congelada e até dois reforços temporários, preservando equipes permanentes. As diretrizes influenciam a abordagem autônoma e decisões excepcionais.

## Verificar

```sh
npm test
npm run build:online
npm run typecheck
```

Em instalação limpa, o build online precisa preceder typecheck para gerar os assets do Worker. A suíte inclui legado, normalização, API local/online e pessoal. `vitest.config.ts` limita a descoberta à pasta tests, excluindo cópias de publicação.

## Persistência e publicação

Estado, comandos, eventos, resumos, ledger e entidades de pessoal usam tabelas relacionais. Turnos e comandos confirmam por transação com revisão/token, preservando idempotência e isolamento. Saves antigos são importados atomicamente na primeira abertura e preservados como arquivo histórico; após a importação, o agregado antigo deixa de representar os novos turnos.

O site existente é privado: https://operators-pmc-command.rodrgost.chatgpt.site/. O usuário autorizou publicar melhorias validadas no mesmo site, sem contratar serviços adicionais. Identidade e binding DB são preservados em `.openai/hosting.json`. Nenhum banco local, backup ou credencial integra o pacote de publicação.

## Referências

- `docs/SPEC.md`: especificação do MVP e adendos.
- `docs/ADR/0005-personnel.md`: dados, transições e parâmetros da Fase 2.
- `docs/STATUS.md`: escopo concluído e pendente.
- `docs/VALIDATION.md`: resultados e limites de validação.
- `docs/DEPLOYMENT.md`: publicação mais recente.

## Contratos e operações

Abra **Contratos**, aceite uma oferta e planeje a formação: equipe permanente, membros enviados, até dois reforços, líder/substituto e diretrizes. Valide custos antes de confirmar o início. Aceitar não reserva nem paga. Iniciar reserva operadores, cobra mobilização e recebe adiantamento. As ofertas iniciais não exigem kits; não existe estoque fictício.

Avance o tempo para executar as quatro etapas. Decisões críticas interrompem o lote obrigatoriamente; responda em **Operações** ou avance sabendo que o prazo aplicará a política automática. Relatórios mostram abordagem, resultados, saúde e fadiga. O pagamento final depende da qualidade; falha ou retirada devolve o adiantamento, mantém o custo de mobilização e pode reduzir reputação. Retirada retorna em um turno e libera a formação. Custos e consequências são revisados antes dos comandos.

O catálogo renova a cada 28 turnos e contém seis tipos de contratos. Risco e dificuldade exibidos são estimativas persistidas do contratante, com confiança e fonte. Valores reais e sorteios não são entregues ao frontend. Parâmetros e regras em packages/rules/operations.json e docs/ADR/0006-operations.md.


## Incremento 0.4.0 — mundo causal (2026-11-08)

Implementados indicadores regionais estimados, influência normalizada, controle político, organizações/relações, conflitos com participantes, notícias com origem consultável, demandas emergentes e três PMCs rivais agregadas. Rivais consomem somente ofertas disponíveis após quatro turnos e usam orçamento próprio. Missões do jogador produzem consequências regionais/diplomáticas no mesmo commit do pagamento. Ativação no primeiro acesso aos dados mundiais, a partir do turno atual, sem retroatividade.

Regras provisórias em packages/rules/world.json; ADR 0007; migration incremental 0004_parallel_scream.sql, nove tabelas novas (29 no total). Estado atual carregado separadamente do histórico paginado. Estimativas persistidas atualizam a cada quatro turnos ou notícia; valores internos e RNG não são enviados ao navegador. Não há novos backups. Próximo incremento: Fase 5, logística, equipamentos/kits e sede.


## Incremento 0.5.0 — logística e infraestrutura (2026-11-08)

Implementados catálogo de 18 kits, estoque por instância, compra/entrega, carga, requisitos de missão e alocação exclusiva com snapshot imutável. Etapas consomem suprimentos e desgastam condição sem nova cobrança; retorno libera kits; reparo e reposição são serviços separados. Efeitos dependem de categoria, etapa/tipo, qualidade, condição, suprimentos, especialização enviada e duplicatas.

Uma sede, cinco módulos níveis 1–5, melhorias sequenciais com prazo e capacidade antiga preservada; manutenção semanal após salários, dívida e quitação automática. Treino/enfermaria respeitam vagas; treinamento por atributo preserva progresso ao interromper; tratamento grave tem mínimo de oito turnos. Visão geral → Sede e logística; planejamento permite selecionar kits. Ativação sem retroatividade ao abrir logística (a interface inicializa ao selecionar a campanha), mantendo missões já enviadas. Regras provisórias em packages/rules/logistics.json, ADR 0008 e migration 0005_new_proudstar.sql (35 tabelas). Próximo incremento: inteligência progressiva.


## Incremento 0.6.0 — inteligência progressiva (2026-11-08)

Conhecimento separado da verdade oculta: registros imutáveis com assunto/alvo, nível 0–3, intervalo, confiança, fonte, coleta/validade e histórico encadeado. Índice corrente por fonte e histórico paginado. Fontes públicas e do contratante, análises remuneradas (USD 250, dois turnos, duas vagas), reconhecimento por missão independente e durante missão. Risco e tensão envelhecem mais rapidamente que economia/infraestrutura. Fontes conflitantes permanecem visíveis; leituras não re-sorteiam estimativas.

Mundo e Contratos oferecem dossiês e análises; planejamento registra conhecimento de partida imutável; novas informações orientam a avaliação de risco e decisões autônomas, sem bônus universal de sucesso ou redução do risco real. Migração incremental 0006_mysterious_ironclad.sql, 39 tabelas; regras provisórias em intelligence.json e ADR 0009. Partidas antigas importam estimativas existentes preservando data e missões enviadas. Próximo incremento: Fase 7, UX, balanceamento e qualidade; não representa aceite final de todo o MVP.


## Incremento 0.7.0 — UX e qualidade (2026-11-08)

Centro de comando com alertas e agenda, preparação inicial e atalho de sede; Finanças soma salários e infraestrutura, mostra dívida total e estimativa de cobertura de despesas. Resumo de avanço recuperável por campanha, intervalo confirmado, ocorrências e movimentações automáticas, sem misturar compras posteriores. Busca e filtros de contratos combinados; navegação protegida durante comando pendente; descarte de respostas de inteligência de alvo anterior; retry preservado após perda do refresh. Sem mudanças numéricas de regras ou schema.

Campanha integrada de 336 turnos com todos os módulos, sete missões concluídas, 36 salários e 12 manutenções; ledger/FK e hashes lote/individual consistentes. Resultado detalhado e limites em docs/QUALITY-REPORT.md. Balanceamento permanece provisório: validar com o jogador e corrigir problemas reproduzíveis, sem presumir aceite completo de todas as escolhas do MVP.
