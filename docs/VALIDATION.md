# Validação da edição online

- 11 testes automatizados passaram: 8 da base e 3 da adaptação online.
- Teste online compara resumos/hash/RNG com o motor local.
- Requisições concorrentes com o mesmo ID confirmam 28 turnos uma única vez.
- Usuário diferente recebe 404 ao consultar partida alheia; identidade ausente recebe 401.
- Typecheck TypeScript e Nuxt passou.
- Geração Nuxt e bundle Worker ESM passaram.
- Interface aberta no browser de preview: criar campanha e avançar quatro turnos funcionaram.
- Layout inspecionado também em viewport de conteúdo de 390 px via iframe de QA. Adaptado valor monetário para impedir quebra indesejada.

A validação de preview usa banco local. O ambiente publicado usa D1 e autenticação do ChatGPT. Módulos futuros seguem indisponíveis.

## Revisão local da fundação — 2026-11-08

- Ambiente: Windows, Node 24.12.0; dependências instaladas com npm ci.
- `npm test`: 21 testes passaram em 4 arquivos.
- `npm run build:online`: geração Nuxt e bundle Worker ESM aprovados. Nuxt emitiu aviso de cache-driver externo no prerender; a geração terminou com sucesso.
- `npm run typecheck`: TypeScript e Nuxt aprovados.
- Preview iniciado com `npm run dev`, sem argumento de porta; listener confirmado em 127.0.0.1:3000.
- HTTP: interface e health retornaram 200; POST com Origin externo retornou 403 ORIGIN_DENIED.
- Navegador: campanha local QA Fundação criada e avanço de quatro turnos exibido como concluído. Banco de QA permanece em data/online-preview.sqlite, separado da edição local Fastify e dos saves publicados.
- Handler real da interface exercitado com transporte simulado: perda de resposta de criação, listagem e carregamento da campanha reutiliza o mesmo requestId e mantém uma única criação.
- API online: IDs especiais, falha no turno 17, retomada, limite de tamanho, versão de regras, concorrência e equivalência de todos os resumos de 336 turnos com motor local.
- Testes de persistência online usam adaptador SQLite em memória, não D1 real. Não houve publicação nem validação da infraestrutura de produção. Não foi feita revisão completa de responsividade nesta execução.

Detalhes das decisões: ADR 0003. Normalização do agregado online e Fase 2 continuam pendentes.

## Persistência normalizada — 2026-11-08

- `npm test`: 31 testes passaram em 5 arquivos.
- `npm run typecheck`: TypeScript e Nuxt aprovados.
- `npm run build:online`: geração Nuxt e Worker ESM aprovados, com o mesmo aviso não bloqueante de cache-driver do prerender.
- Migration gerada pelo Drizzle, SQL e snapshot inspecionados. Migration inicial preservada; nova migration contém somente schema/índices/checks/FKs.
- Testes incluem importação concorrente e com falha, preservação dos dados legados, retomada de failed/processing, reabertura de arquivo SQLite, idempotência, rollback de schema/turno/criação, CAS obsoleto, isolamento por dono e constraints.
- Histórico sintético com mais de 1,5 MB permitiu novo turno sem SELECT do histórico nem regravação de agregado. Argumentos SQL do avanço permaneceram abaixo de 2 KB no cenário testado.
- Todos os resumos de 336 turnos online continuam equivalentes aos do motor local.
- Backup consistente do preview criado antes da migration: `data/online-preview.before-normalization.sqlite`.
- Smoke HTTP no Worker compilado: campanha QA Fundação importada no turno 4; comando normalization-smoke avançou uma vez para o turno 5; retry retornou resultado idêntico; 5 resumos persistidos e capital inicial preservado. JSON antigo comparado byte a byte com o backup, sem diferenças.
- Preview de teste encerrado. Nenhuma publicação, migration remota ou mudança de acesso ao site. D1 real não foi executado nesta validação; foi usado o adaptador SQLite transacional. Não houve nova revisão visual, pois a interface não mudou.

Decisões e estratégia de rollback: ADR 0004. O backup legado não inclui turnos novos; backups futuros devem abranger o banco completo normalizado.

## Publicação posterior autorizada — 2026-11-08

As correções e a normalização foram publicadas no site privado existente. O serviço confirmou implantação succeeded; detalhes e commit em docs/DEPLOYMENT.md. As observações anteriores de não publicação descrevem o estado antes desta autorização. Não houve novo smoke funcional no D1 hospedado.

## Pessoal 0.2.0 — 2026-11-08

- Suíte: 47 testes em 8 arquivos, incluindo salários, dívida, último vencimento/expiração, renovação, recrutamento/capacidade, equipes/histórico, reservas exclusivas, familiaridade, concorrência, rollback e retomada salarial, API local e retries da interface após perda de resposta ou reabertura de painel.
- TypeScript/Nuxt e geração online aprovados. Aviso não bloqueante de cache-driver do Nuxt continua presente.
- Banco hospedado consultado antes do trabalho: schema normalizado com seis tabelas confirmado.
- Navegador local: dois candidatos contratados após revisar custo; equipe criada com líder/substituto; treino conjunto iniciado, quatro turnos avançados, disponibilidade restaurada e familiaridade passou de 0 para 2.
- Layout do quadro e da equipe inspecionado em conteúdo de 390 px via iframe de QA. Ajustadas abas internas para caber em três colunas sem rolagem horizontal.
- Testes de hash em lote/individual incluem pessoal; os 336 turnos da fundação continuam compatíveis quando o módulo não foi ativado.
- Reserva de missão testada como fixture para impedir dupla agenda; missões reais e reforços ainda não existem e não foram alegados como validados.
- Preview usa SQLite; publicação e smoke hospedado serão registrados em DEPLOYMENT.md. Não foram criados novos backups locais nesta fase.

Publicação 0.2.0 concluída: serviço confirmou succeeded; schema remoto com 15 tabelas e carregamento de recrutamento na campanha existente confirmados no navegador. Não houve contratação de operadores ou avanço de turnos na campanha hospedada durante essa conferência.

## Operações 0.3.0 — 2026-11-08

- 64 testes aprovados em 10 arquivos. Cobertura nova: ciclo comercial completo, prévia sem reserva, snapshots/reforços, agenda, decisões obrigatórias, fallback único, resolução idempotente, retirada, fracasso, cancelamento, capacidade, liderança, início concorrente, remuneração/ledger, rollback de término e retomada, autonomia por diretrizes, estimativas sem verdade oculta, renovação semanal e retry de interface.
- Contrato com source world_event/originEventId testado por fixture no mesmo motor; geração causal não implementada.
- Typecheck TypeScript/Nuxt e build online aprovados. Mantido aviso não bloqueante de cache-driver do Nuxt.
- Navegador local: aceito contrato Proteção de instalação; prévia validou formação de duas operadoras, mobilização e adiantamento; início T9, quatro etapas e conclusão T13. Relatórios mostraram resultado parcial, ferimento, fadiga, pagamento proporcional e reputação +2. Formação liberada.
- Conteúdo de operações/relatórios inspecionado em 390 px via iframe de QA. Acertos e ledger usam centavos; resumo de caixa continua compacto.
- Migration 0003_workable_leo.sql é incremental/schema-only, com tabelas de contratos, missões, assignments, decisões e relatórios e flags/versionamento por campanha.
- Sem novos backups locais; sem estoque, combate tático ou mundo causal fictício. Publicação e conferência remota registradas em DEPLOYMENT.md.

Publicação 0.3.0 confirmada pelo serviço Sites como succeeded; schema remoto com 20 tabelas conferido. O smoke visual final hospedado ficou pendente porque a aprovação automática de navegação foi negada por limite de uso. Resultados funcionais da missão descritos acima são da validação local, não de uma campanha hospedada. Identificadores em DEPLOYMENT.md.


## Mundo 0.4.0 — 2026-11-08

74 testes em 11 arquivos aprovados, incluindo dez novos testes mundiais: inicialização 5 países/15 regiões/13 organizações/3 rivais; projeções sem atributos internos; 336 turnos com indicadores limitados e influência somando 100; cooldown/teto de eventos; crise → confronto e contrato com origem; rivais respeitando aceite e caixa do jogador; hashes iguais em lote e individual; histórico paginado; rollback e retomada sem duplicação; disputa concorrente; missão real com pagamento e consequência única; ativação de partida anterior sem retroatividade. Typecheck e build online aprovados.

Preview no navegador: campanha local QA Fundação ativada em T13 e avançada até T41, com notícias causais, contratos emergentes, conflitos e resultados de rivais; causa de notícia T29 consultou notícia T16; navegar de Varkov abriu contratos filtrados. Layout do dossiê verificado em 390 px com quatro indicadores em duas colunas, sem quebra do conteúdo. Nenhum avanço de QA realizado no banco hospedado. O bloqueio de navegação da revisão anterior tinha prazo 16:11; a validação atual após 16:45 foi permitida.

Limites: parâmetros de balanceamento provisórios; PMCs rivais agregadas, sem operadores individuais; inteligência avançada, kits e sede ficam para fases posteriores.

Smoke hospedado concluído: dossiê de Varkov carregado em Vanguard Security T1, sem avanço de turno; schema remoto com 29 tabelas confirmado pelo conector Sites.


## Logística e sede 0.5.0 — 2026-11-08

93 testes em 13 arquivos: 17 funcionais novos e dois de retry da interface; demais 74 preservados. Compra/entrega/prazo/caixa/carga; serviços separados e vagas; requisitos e snapshot de kits; desgaste sem dupla cobrança; retirada/retorno; início concorrente de duas missões pelo mesmo kit; upgrades e capacidade; treino/progresso/interrupção; enfermaria/ferimentos graves; dívida/quitação; rollback em entrega com três turnos confirmados e retomada; equivalência lote/individual por 336 turnos; compatibilidade de missão anterior à ativação. Typecheck e build online.

Navegador local QA Fundação: logística ativada em T41; compra de Combate I (USD 1.800), entrega T45; upgrade de treino (USD 2.500), capacidade 1 até T48 e 2 em T49. Escolta com dois operadores e kit selecionado planejada/iniciada T49; concluída T53, kit devolvido com condição 88 e suprimentos 68, reparo USD 108 e reposição USD 115,20 apresentados separadamente. Interfaces de sede/catálogo verificadas em 390 px. Sem novos backups.

Balanceamento provisório e agregação dos kits por missão; não há combate tático, veículos detalhados, múltiplas bases ou fabricação. Inteligência progressiva permanece Fase 6.

Smoke pós-publicação 0.5.0: acesso privado preservado, catálogo de 18 kits carregado no navegador autenticado, estoque vazio, custo inicial da sede USD 600/semana; 35 tabelas confirmadas via Sites. Nenhuma ação de custo nem avanço de campanha hospedada.


## Inteligência 0.6.0 — 2026-11-08

109 testes em 15 arquivos: 14 funcionais de inteligência e dois de recuperação da interface, além dos 93 existentes. Cobertura: importação/estabilidade, projeções seguras/owner, níveis/validade/idade, fontes conflitantes, análise paga idempotente/prazo/escopo/vagas/caixa, histórico encadeado, análise de oferta expirada sem reabertura, reconhecimento em missão e independente, política baseada em risco percebido sem alterar verdade, snapshots, concorrência, rollback com turno confirmado/retomada, equivalência por 336 turnos, migração de missão antiga e fluxo integrado com kits/mundo/ledger. Typecheck e build online aprovados.

Navegador local: QA Fundação em T53 contratou análise de segurança de Varkov por USD 250, entrega em T55. Dossiê mostrou fonte pública de T52 (55%→43%) e análise remunerada de T55 (65%), nível verificado, intervalo 32–48 e validade T63. Comparação de fontes conferida em 390 px; sem estouro ou corte de conteúdo. Nenhum backup novo criado.

Limites: confiança e ruído são parâmetros de balanceamento provisórios; análise não garante verdade. Missões antigas sem snapshot preservam política anterior; não se inventa reconhecimento passado. UX/balanceamento final de todos os módulos permanece Fase 7.
