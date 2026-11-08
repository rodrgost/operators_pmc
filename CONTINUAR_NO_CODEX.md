# OPERATORS — continuação no Codex

Pasta principal: `C:\Users\rodrg\DEV\operators_pmc`.

## Estado atual — 0.5.0

Fundação e persistência normalizada implementadas, agora com operadores, recrutamento semanal, vínculos 4/8/12 semanas, pagamentos e dívidas salariais, renovação, equipes permanentes, líderes/substitutos, histórico de composição, reservas exclusivas de agenda e familiaridade por treino conjunto. Interface mobile preto/cinza; manter esse padrão em todas as telas.

Agora também implementados: contratos comerciais, planejamento, snapshots de formação, reforços, etapas autônomas, decisões críticas com prazo/fallback, retirada, relatórios e pagamentos. Mundo causal, rivais, kits e módulos da sede implementados. Inteligência progressiva permanece pendente. Reforços de missão preservam vínculo permanente; a formação enviada é imutável.

## Executar e verificar

Node 24 e npm. Para preview: `npm ci`, `npm run build:online`, `npm run dev`; abrir http://127.0.0.1:3000. Porta opcional `npm run dev -- --port 3002`. Para recarga automática: `npm run dev:local`, usando a mesma aplicação normalizada através de Fastify. Banco local padrão em data/online-preview.sqlite; produção usa D1 e identidade ChatGPT. A API fundacional original fica disponível em `npm run start:legacy` com banco separado.

Checks: `npm test`, `npm run build:online`, `npm run typecheck`. Build gera worker/assets.generated.ts e dist/server/index.js; repetir após mudanças. Banco e credenciais nunca entram no pacote de publicação. Novos backups locais não são necessários por enquanto, conforme orientação do usuário.

## Rotas principais de implementação

- packages/engine/personnel.ts: geração determinística e resolução pura de pessoal.
- packages/rules/personnel.json: parâmetros provisórios, versão personnel-0.1.
- worker/personnel.ts: comandos, projeções e persistência de pessoal.
- worker/persistence.ts: CAS de revisão/token e importação legada.
- worker/api.ts: API e orquestração temporal.
- db/schema.ts e drizzle/0002_secret_mach_iv.sql: schema e migration da Fase 2.
- apps/web/components/PersonnelPanel.vue: quadro, recrutamento e equipes.
- apps/api/src/normalized-app.ts: aplicação compartilhada no servidor local.
- docs/ADR/0005-personnel.md: decisões e limites desta fase.

## Incremento implementado

Fase 3: contratos comerciais, planejamento e missões autônomas, com snapshots imutáveis de formação, reforços temporários, reservas de operadores, etapas, relatórios, remuneração e decisões críticas. Antes de codificar, apresentar dados, migrations, transições e testes. Resolver explicitamente as regras de cancelamento/retirada e os requisitos logísticos nesta fase, sem inventar efeitos não definidos. Não adicionar combate tático, multiplayer ou LLM.

## Publicação autorizada

O usuário autorizou manter e atualizar o site privado https://operators-pmc-command.rodrgost.chatgpt.site/ enquanto Sites estiver incluído no plano e sem contratar serviços adicionais. Preservar project_id e audiência de `.openai/hosting.json`. Validar e publicar após cada incremento concluído. A cópia em .sites-runtime/publish-source/.sites-checkout serve somente para sincronização e empacotamento do repositório já vinculado ao site; fonte principal continua na pasta acima.

## Incremento 0.4.0 implementado

Fase 4: mundo causal, regiões, presença/influência, controle político, conflitos, organizações, relações, notícias encadeadas, contratos emergentes e PMCs rivais abstratas. Rotas worker/world.ts, motor packages/engine/world.ts, regras packages/rules/world.json, UI WorldPanel.vue, ADR 0007 e migration 0004_parallel_scream.sql. Transação por turno inclui mundo, missões, pessoal e finanças. Ativação sem retroatividade ao acessar dados mundiais. Preservar o histórico, estimativas públicas e proteção de contratos aceitos contra rivais.

## Incremento 0.5.0 implementado

Fase 5: catálogo 18 kits (seis categorias × três qualidades), compra/entrega, carga do depósito/missão, alocação exclusiva com snapshot, desgaste/consumo, retorno, reparo/reposição separados; cinco módulos 1–5 com upgrades, capacidades e manutenção/dívida. Treino individual por atributo/progresso, vagas de treino/tratamento, interrupção e recuperação grave mínima. Rotas worker/logistics.ts; motor packages/engine/logistics.ts; regras packages/rules/logistics.json; UI LogisticsPanel.vue em Visão geral → Sede e logística. Migration 0005_new_proudstar.sql; ADR 0008. Não gerar backups novos.

## Próximo incremento efetivo

Fase 6: inteligência progressiva, fontes e envelhecimento de registros, estimativas contextuais integradas a Mundo/Contratos/Operações. Antes de codificar, apresentar modelo, transições e testes. Preservar histórico, causalidade, kits, snapshots, decisões, salários, reservas e ledger. Não adicionar combate tático, multiplayer ou LLM. Ver docs/VALIDATION.md e docs/DEPLOYMENT.md.
