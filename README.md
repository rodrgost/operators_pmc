# OPERATORS — PMC Command · 0.2.0

Jogo de gestão single-player em português. A edição atual implementa a fundação temporal e a gestão de pessoal: recrutamento semanal, operadores, vínculos de emprego, salários, equipes permanentes e familiaridade. Contratos comerciais, missões autônomas e simulação mundial causal ainda estão pendentes.

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

Em **Equipes**, selecione até seis membros, líder, substituto e diretrizes. Equipes abaixo de dois membros são rascunhos. Treino conjunto dura quatro turnos, aumenta fadiga e familiaridade dos participantes. Descanso reduz fadiga e recuperação melhora saúde. Detalhes e histórico ficam na ficha do operador. Missões e reforços efetivamente enviados serão implementados na próxima fase; as diretrizes ficam salvas, sem efeito de combate nesta versão.

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
