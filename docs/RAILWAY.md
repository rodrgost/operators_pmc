# Railway: campanhas no navegador

O Railway publica a interface e o motor do jogo; as campanhas ficam no IndexedDB do navegador. Não há login nem banco de campanhas no servidor. Android e uma possível integração de salvamento com Google ficam para outra etapa; Firebase não é requisito desta versão.

## Build e execução

Requisitos: Node.js 24 e npm. Execute `npm ci`, `npm run build:railway` e `npm run start:railway`. O servidor escuta `0.0.0.0` na porta indicada por `PORT` (3000 por padrão). O healthcheck é `/healthz`.

O Dockerfile usa duas etapas: compila o motor em um Web Worker, incorpora as migrations, inclui o SQLite WebAssembly e gera o Nuxt estático; a imagem final contém somente o servidor de arquivos e a aplicação compilada. Não precisa de volume, banco remoto ou credenciais para jogar.

No Railway, conectar `rodrgost/operators_pmc`, branch `master`. A configuração `railway.json` seleciona o Dockerfile e o healthcheck. O consumo de hospedagem segue o plano da conta Railway.

## Persistência

- Cada origem, perfil de navegador e aparelho tem seu próprio conjunto de campanhas. O domínio definitivo deve ser mantido para preservar o acesso aos saves.
- O motor usa as mesmas regras, API de domínio e migrations da versão de servidor. Cada operação carrega o SQLite do IndexedDB e só responde após salvar o resultado.
- Um Web Worker mantém os cálculos fora da interface. Web Locks serializa operações entre abas compatíveis; a revisão do IndexedDB impede sobrescritas silenciosas mesmo sem Web Locks.
- Falhas de armazenamento são exibidas como erro; a operação não é confirmada como salva.
- Limpar os dados do site, perder o perfil ou encerrar uma sessão anônima pode apagar as campanhas. Não há backup remoto ou sincronização entre aparelhos nesta versão.
- Campanhas do domínio ChatGPT e do SQLite local anterior não são importadas automaticamente.

O build original `build:online` e a integração Sites continuam disponíveis em modo de servidor. A publicação Railway usa `build:railway`; não usar o adaptador de preview como servidor público.

## Verificação

`npm run typecheck`, `npm exec vitest run -- --maxWorkers=2` e `npm run build:railway`. `tests/browser-storage.test.ts` cobre restauração, avanço e contratação, isolamento e falha de persistência. Validar também criação e recarga no navegador.
