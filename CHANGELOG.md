# Changelog

## 0.1.0 — 2026-11-08

- Fundação local TypeScript/Fastify/Nuxt/SQLite.
- Partidas persistentes e seed inicial Asterra.
- Motor temporal determinístico, transações por turno e idempotência.
- Histórico, lotes, interrupção por evento importante e recuperação após falha.
- Dashboard, visualização inicial do mundo e capital inicial auditável.
- Documentação de escopo, execução e próximos incrementos.

## 0.1.1 — 2026-11-08

- Edição online privada, com API Worker e D1 por usuário autenticado.
- Compare-and-swap por turno, idempotência e testes de concorrência.
- Padrão visual minimalista preto/cinza, com prioridade para celular em todas as áreas.

## Não publicado — 2026-11-08

- Corrige porta padrão do preview; valida porta e restringe bind a loopback, preservando Origin.
- Compartilha regras puras de resolução temporal entre Node e Worker sem alterar hashes, saves ou versão de regras.
- Registra falhas parciais online e libera locks, inclusive no limite de tamanho do save; mantém retomada explícita.
- Corrige consultas por IDs que coincidem com propriedades herdadas de objetos.
- Preserva requestId de criação na interface após falha de rede ou de atualização da tela.
- Amplia regressões de recuperação, concorrência, 336 turnos, criação e preview.

### Persistência normalizada

- Adiciona cinco tabelas relacionais, índices, FKs e checks para a edição online.
- Importa saves legados atomicamente na primeira abertura, preservando dados, IDs, hashes, retry e retomada.
- Usa batch transacional com revisão e token de commit por turno; histórico paginado em SQL.
- Remove limite artificial de 1,5 MB por campanha e regravação integral do histórico.
- Corrige runner de migrations do preview e compartilha adaptador transacional com os testes.
- Validação: 31 testes, typecheck, build e smoke HTTP local aprovados. Não publicado.

## 0.2.0 — 2026-11-08

- Operadores, recrutamento semanal determinístico, vínculos 4/8/12 semanas e renovação.
- Bônus de assinatura, salários, dívidas e quitação com ledger transacional.
- Equipes permanentes, líderes, substitutos, diretrizes e histórico de composição.
- Agenda exclusiva, descanso/recuperação e familiaridade por treino conjunto.
- UI mobile com revisão de custo e retry de comando preservado entre abas.
- API local e Worker compartilham aplicação; fundação original preservada como legado.
- Migration incremental, parâmetros de pessoal em JSON e 47 testes aprovados.

## 0.3.0 — 2026-11-08

- Contratos comerciais semanais em seis tipos, com estimativas de risco/dificuldade.
- Planejamento e início separados, formação congelada e reforços temporários.
- Etapas autônomas, condições de operadores, XP, familiaridade e relatórios.
- Decisões críticas com prazo/fallback e interrupção obrigatória de lote.
- Retirada, devolução de adiantamento, remuneração proporcional e reputação.
- Migração incremental, comandos idempotentes, ledger atômico e interface mobile integrada.

## 0.8.0 — 2026-11-09

- Saldo e previsão de gastos fixos no topo em todas as telas da campanha.
- Controle de turno fixo no rodapé, com agenda expansível e turnos restantes.
- Fila persistente de ordens, removíveis sem custo antes da passagem.
- Cobranças e efeitos das ordens confirmados atomicamente com o primeiro turno.
- Validação conjunta, proteção concorrente, idempotência e rollback.
- Novos testes da API pública deferida; regras e saves anteriores preservados.
