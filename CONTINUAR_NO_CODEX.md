# OPERATORS — continuação no Codex

A base deste projeto contém os arquivos da edição online v0.1.1, recuperados do repositório do site publicado, commit 38383316f34bb36766c5422c3c30a3382d958b07.

## Executar no computador

Requisito: Node.js 24 e npm. Extraia o ZIP, abra a pasta `operators-pmc` no Codex e execute:

```sh
npm ci
npm run build:online
npm run dev
```

Abra http://127.0.0.1:3000. A porta padrão é 3000, com bind somente em 127.0.0.1. Para outra porta, use `npm run dev -- --port 3002`. O banco de desenvolvimento é criado localmente; o pacote não contém as partidas salvas no site.

O build gera `worker/assets.generated.ts` e `dist/server/index.js`. Após mudanças na interface ou na API Worker, repita `npm run build:online` e reinicie o preview. Para trabalhar com recarga automática na interface e API Fastify/SQLite, use `npm run dev:local`.

```sh
npm test
npm run typecheck
```

Execute o build online antes do typecheck, pois ele gera o módulo de assets importado pelo Worker.

## Arquivos de referência

- `docs/SPEC.md`: especificação completa do MVP e adendo de interface aprovado.
- `docs/STATUS.md`: o que foi implementado e o que falta.
- `docs/ADR/0002-hosted-mobile.md`: adaptação online e visual mobile.
- `docs/VALIDATION.md`: verificações realizadas na entrega publicada.
- `apps/web/pages/index.vue` e `apps/web/assets/main.css`: interface.
- `worker/api.ts`: API da edição hospedada.
- `worker/persistence.ts`, `db/schema.ts` e `drizzle/0001_burly_longshot.sql`: persistência normalizada, importação dos saves antigos e migration.
- `docs/ADR/0004-normalized-online-storage.md`: transações, importação e cuidados de rollback.
- `apps/api` e `packages`: base local Fastify/SQLite e motor.
- `db` e `drizzle`: schema e migrations D1 da edição online.

## Estado real do projeto

Implementados: criação e persistência de partidas, turnos, lotes, idempotência, histórico, seed inicial de Asterra e livro-razão do capital inicial. A edição online usa Worker/D1, identidade ChatGPT e acesso privado. Os saves são isolados por usuário.

Ainda não implementados: recrutamento, operadores, equipes, contratos, missões, decisões críticas, simulação mundial causal, sede, kits e inteligência progressiva. Não tratar as telas indisponíveis como funcionalidades prontas.

A interface deve priorizar mobile em todas as telas: fundo preto, cartões cinza-escuro arredondados, fontes simples, números em destaque, controles de toque e cores somente para estados. Usar o mesmo padrão no desktop, ampliando o espaço disponível.

## Próximo pedido para o Codex

> Leia CONTINUAR_NO_CODEX.md, docs/SPEC.md, docs/STATUS.md e docs/ADR. Execute o projeto e os testes existentes. Preserve o padrão visual mobile preto/cinza em todas as telas. Continue o MVP implementando operadores, recrutamento semanal, contratos de emprego, salários e equipes permanentes, integrados à persistência e ao motor temporal. Antes de alterar o código, apresente o esquema de dados, as transições e os testes desta fase. Registre padrões propostos em ADR. Não adicione combate tático, multiplayer ou LLM. O usuário autorizou em 2026-11-08 publicar atualizações validadas no site privado existente, enquanto Sites estiver incluído no plano e sem contratar serviços adicionais.

## Hospedagem

A identidade do site existente está em `.openai/hosting.json`. Esse arquivo não contém credenciais. Não criar outro site ou alterar o acesso privado por engano. Publicar fora do ambiente Sites exigirá adaptar autenticação e configurar a infraestrutura; os cabeçalhos de identidade não podem ser considerados confiáveis em um servidor público sem um proxy autenticado.

`preview-online.mjs` injeta uma identidade local apenas para desenvolvimento; não usá-lo como servidor público de produção. A API online usa tabelas relacionais para estado atual, comandos, eventos, resumos e ledger. O antigo agregado JSON é preservado como arquivo legado e importado atomicamente na primeira abertura. O limite artificial de 1,5 MB foi removido. Esta normalização foi validada localmente, sem publicação.

O ZIP exclui dependências, builds, bancos, credenciais e histórico Git. O link do site é https://operators-pmc-command.rodrgost.chatgpt.site/.

## Publicação autorizada — 2026-11-08

Manter o site privado existente e publicar também as melhorias testadas. A pasta principal continua sendo esta; a cópia em .sites-runtime é temporária para sincronização e empacotamento do repositório já associado ao Sites. Não enviar data, backups, credenciais ou node_modules. Novos backups de banco não são necessários por enquanto, conforme orientação do usuário.
