# Edição online privada — v0.1.1

Esta edição adapta a fundação do OPERATORS para acesso por link no ChatGPT. A interface Nuxt é incorporada a um Worker ESM; partidas são persistidas em D1 e isoladas pela identidade autenticada da plataforma.

A edição local Fastify/SQLite original continua disponível no ZIP v0.1.0. Os comandos abaixo descrevem essa base; nesta edição, use `npm run dev:local` para executá-la.

Para conferir a edição online localmente: `npm ci`, `npm run build:online`, `npm run dev`. O adaptador local usa SQLite e identidade de preview; não é publicado.

Para verificar: `npm test` e `npm run typecheck`. O deploy usa `.openai/hosting.json`, migration Drizzle e `dist/server/index.js`. Não alterar a identidade do Site nem a audiência privada.

O visual prioriza celular em todas as telas. O escopo funcional continua sendo a fundação, sem recrutamento ou missões.

---

# OPERATORS — PMC Command

Primeiro incremento da especificação: **Fase 0 e base da Fase 1**. Aplicação local single-player em português, com API autoritativa Fastify, Nuxt/Vue 3 e SQLite. Não é ainda o MVP completo: não há operadores, contratos ou missões funcionais.

## Executar

Instale **Node.js 24 LTS** (inclui SQLite nativo) e npm. Extraia o ZIP e abra um terminal nesta pasta:

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:3000**. O backend escuta somente em **127.0.0.1:3001**. Para parar, use Ctrl+C.

No Windows, os mesmos comandos funcionam no PowerShell. Não é necessário instalar SQLite, Python, Docker ou compilar um driver de banco. O Node pode imprimir aviso de API experimental do SQLite.

Crie uma companhia, escolha uma semente e avance 1, 4 ou 28 turnos. Cada turno representa 6 horas. Feche/reabra o processo para continuar de onde parou. O seletor de companhia permite manter múltiplos saves. O caixa inicial provisório é de USD 100.000 e não sofre despesas nesta fase.

## Verificar

```sh
npm test
npm run typecheck
npm run build
```

O build gera o servidor Nuxt em `apps/web/.output`. Para executá-lo, mantenha `npm run start:api` em outro terminal e execute:

```sh
node apps/web/.output/server/index.mjs
```

API_BASE pode definir o destino do proxy Nuxt (padrão `http://127.0.0.1:3001`); PORT define a porta da API; DATABASE_PATH define o arquivo SQLite. Essas variáveis são opcionais. A origem da interface é validada para localhost/127.0.0.1:3000.

## O que funciona

- Criação idempotente, listagem e retomada de partidas independentes.
- Relógio fixado em 01/01/2030 UTC do jogo; sem dependência do relógio real.
- Avanço manual de 1–28 turnos, com commit individual por turno.
- Histórico, resumo de turno, hash determinístico e fechamento semanal.
- Interrupção por evento importante, retry sem duplicação, versão otimista e retomada explícita após falha parcial.
- Recuperação de requisição interrompida pelo encerramento do processo.
- Seed inicial de 5 países, 15 regiões e 13 organizações; visualização dos países/regiões.
- Livro-razão com capital inicial e interface responsiva.
- Validação Zod e erros HTTP estruturados, sem exposição do estado interno.

Os boletins públicos são uma demonstração determinística do relógio. Ainda não simulam mudanças regionais, conflitos ou decisões críticas. Os módulos futuros aparecem identificados como indisponíveis.

## Estrutura

- `apps/api`: HTTP Fastify e execução do servidor.
- `apps/web`: interface Nuxt/Vue e proxy para a API.
- `packages/domain`: tipos e erros de domínio.
- `packages/contracts`: schemas de entrada.
- `packages/engine`: relógio, RNG por chave e resolução pura do turno.
- `packages/application`: comandos, idempotência, projeções e lotes.
- `packages/persistence`: SQLite e migration SQL.
- `packages/rules`: parâmetros provisórios e seed Asterra.
- `tests`: determinismo, integração, atomicidade e API.
- `docs/SPEC.md`: especificação completa original, recuperada do documento salvo.
- `docs/ADR`: decisões e limites deste incremento.

## Persistência e limites

O banco é criado automaticamente em `data/operators.sqlite`, relativo à pasta de execução. Para backup, pare os processos e copie a pasta `data`. Não copie apenas o arquivo principal com a API em execução: SQLite usa WAL.

Execute **um único processo da API por banco**. As requisições são serializadas no processo e protegidas por transações e versão; esta entrega não oferece coordenação entre múltiplos processos. Uma sessão local tem acesso a todos os saves desse banco. Não publique esta versão na internet: autenticação e isolamento por usuário ainda não foram implementados. Não há exportação/importação de save nesta fase.

## Próximo incremento

Fase 2: operadores, recrutamento semanal, vínculo de emprego, salários, equipes e familiaridade. Em seguida, contratos e missões autônomas. O checklist detalhado está em `docs/STATUS.md`.
