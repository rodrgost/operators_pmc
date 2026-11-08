# ADR 0004 — Persistência online normalizada

Status: adotado localmente em 2026-11-08; não publicado.

## Estrutura e contrato

- `online_games`: identidade, dono, criação idempotente, seed/regras/data, estado atual, versão pública, revisão interna, lote ativo e token de commit.
- `online_commands`: uma linha por comando e campanha; payload original pequeno para idempotência, progresso, status e resultado confirmado.
- `online_events`: uma linha por evento, chave campanha/turno/sequência; histórico paginado em SQL.
- `online_turn_summaries`: data e hash por turno; eventos do resumo são consultados na tabela de eventos, sem duplicação do histórico.
- `online_ledger`: fatos financeiros com origem única por campanha, fonte e tipo; capital inicial persistido.
- `online_campaigns`: arquivo legado imutável, usado somente para importação e auditoria. Novos saves não gravam agregado JSON.

Migration Drizzle `0001_burly_longshot.sql` somente adiciona schema, índices, checks e FKs. A migration inicial e seus metadados foram preservados. O modelo local Fastify/SQLite permanece separado.

## Atomicidade e concorrência

Criação e cada turno usam `D1Database.batch`, que executa uma transação e desfaz o lote em erro, conforme [documentação oficial](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

O primeiro UPDATE compara revisão interna e dono; ao vencer, incrementa revisão e grava token aleatório exclusivo. Todas as escritas dependentes exigem esse token dentro da mesma transação. Se a comparação perder a corrida, nenhuma escrita filha ocorre. Não depender de `changes()` entre statements. A versão pública só muda em turnos confirmados; registrar ou encerrar comando altera apenas revisão interna. Leitura conjunta de campanha/comando usa batch; sessões first-primary são usadas quando fornecidas pelo binding D1.

Lotes mantêm completed/interrupted/failed e retomada explícita. Falha desfaz somente o turno atual, registra último progresso confirmado e libera o lote. Se também faltar armazenamento para registrar falha, o comando processing continua recuperável por retry do mesmo ID.

## Compatibilidade e importação

A primeira abertura de uma campanha antiga importa apenas aquela campanha numa transação de cinco statements, via JSON1 no próprio banco. Inclui comandos e resultados, todos os eventos/resumos e capital inicial fixado em USD 100.000 pelas regras legadas 0.1.0. Dono, IDs, hashes, datas, progresso e versão são preservados. Importações concorrentes são protegidas pelo token da criação. Falha em qualquer tabela desfaz toda a importação; outra tentativa é segura.

A lista inclui campanhas legadas ainda não abertas, sem devolver seus agregados ao Worker, e não duplica campanhas já importadas. O JSON legado permanece byte a byte intacto. Depois da importação, a versão normalizada é a autoridade e o arquivo antigo deixa de refletir novos turnos. Reverter para Worker antigo perderia visibilidade desse progresso; rollback exige versão compatível com as tabelas novas ou exportação explícita, não simples troca pelo código antigo.

Importação é backfill de dados na aplicação, não DDL em requests nem backfill global em migration. Saves legados inválidos falham com rollback; não há descarte silencioso de registros. Mundos estáticos de Asterra continuam definidos por versão nas regras e não são novos subsistemas persistidos nesta etapa.

## Limites e operação

Não existe mais o teto artificial de 1,5 MB por campanha. Os limites do banco e por linha da plataforma continuam aplicáveis. Cada avanço acessa somente estado atual/comando e grava os fatos do novo turno; não serializa nem regrava todo o histórico.

Preview e testes compartilham adaptador SQLite com batch transacional e FKs habilitadas. Runner local aplica migrations em ordem e só marca sucesso depois do commit. Identifica especificamente o primeiro schema legado sem pular migrations posteriores.

Não publicar ou aplicar migrations no banco hospedado nesta tarefa. Antes de futura publicação: manter backup e preservar esta estratégia de importação; testar o binding D1 real. O backup local anterior à normalização fica em `data/online-preview.before-normalization.sqlite`.

## Validação

Regressões cobrem migração incremental/repetida, rollback de schema e importação, isolamento de dono, importação concorrente, retry/retomada de lotes legados, reabertura em disco, CAS obsoleto sem efeitos, FKs e origem financeira única, histórico acima de 1,5 MB e equivalência determinística de 336 turnos.
