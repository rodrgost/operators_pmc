# OPERATORS — continuação no Codex

Pasta principal: `C:\Users\rodrg\DEV\operators_pmc`.

## Estado atual — 0.7.1

Fundação e persistência normalizada implementadas, agora com operadores, recrutamento semanal, vínculos 4/8/12 semanas, pagamentos e dívidas salariais, renovação, equipes permanentes, líderes/substitutos, histórico de composição, reservas exclusivas de agenda e familiaridade por treino conjunto. Interface mobile preto/cinza; manter esse padrão em todas as telas.

Agora também implementados: contratos comerciais, planejamento, snapshots de formação, reforços, etapas autônomas, decisões críticas com prazo/fallback, retirada, relatórios e pagamentos. Mundo causal, rivais, kits e módulos da sede implementados. Inteligência progressiva implementada; Centro de comando e campanha integrada de 336 turnos validados; balanceamento segue provisório. Reforços de missão preservam vínculo permanente; a formação enviada é imutável.

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

## Incremento 0.6.0 implementado

Fase 6: registros imutáveis por alvo/assunto/fonte, quatro níveis, confiança/validade/idade e fontes conflitantes; análises pagas com prazo; reconhecimento independente regional e durante missão; snapshot de conhecimento de partida; risco percebido na utilidade/autorização, sem bônus universal nem alteração da verdade. Motor packages/engine/intelligence.ts, worker/intelligence.ts, regras intelligence.json, UI IntelligencePanel.vue integrada a Mundo/Contratos/Operações, ADR 0009 e migration 0006_mysterious_ironclad.sql (39 tabelas). Índice corrente separado do histórico paginado. Ativação importa estimativas existentes, preserva data original e missões já enviadas.

## Incremento 0.7.0 implementado

Centro de comando com alertas/agenda/roteiro inicial, despesas semanais completas e projeção de caixa; resumo recuperável do último avanço, receitas/despesas automáticas e ocorrências; filtros combinados de contratos; recuperação de resposta perdida e proteção de trocas de alvo. Rotas worker/command-center.ts, ADR 0010, testes quality.test.ts e command-ui.test.ts. Sem mudanças numéricas de regras ou schema. Campanha de 336 turnos com todos os módulos, lote/individual com hashes iguais, ledger/FK consistentes. Resultado e limites em docs/QUALITY-REPORT.md.

## Próximo passo

Validação do jogador no site privado e ajustes guiados pelo uso. Funcionalidades principais das fases 1–6 e a primeira revisão da Fase 7 estão implementadas; não presumir balanceamento definitivo ou cobertura de todas as decisões. Priorizar problemas reproduzíveis, navegação, clareza de custos/prazos, desempenho e acessibilidade. Preservar histórico, fontes, causalidade, kits, snapshots, decisões, salários, reservas e ledger. Não adicionar combate tático, multiplayer ou LLM. Sem backups novos. Ver docs/VALIDATION.md e docs/DEPLOYMENT.md.


## Ajuste visual 0.7.1

A página inicial lista companhias e concentra a criação; não abrir campanha automaticamente ao carregar. Seleção entra na companhia e destaca seu nome no lugar da marca lateral/topo, com OPERATORS · PMC COMMAND menor abaixo e título do navegador correspondente. Removido Nova partida de todas as telas internas e seletor de campanha duplicado. Voltar por ← Companhias ou pelo nome da companhia; reposicionar no topo ao trocar entre início e companhia. Regras e persistência preservadas.
