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
