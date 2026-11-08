# Publicação atual — 2026-11-08

Site: https://operators-pmc-command.rodrgost.chatgpt.site

- Projeto existente: appgprj_6af0867c8b0081919a17665415f89c70.
- Implantação concluída: appgdep_6af0ab855fe0819183e2633b8980474f.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_6845690bcc1c81918ffb90fde92917ab.
- Commit de origem publicado: 4b0b5fa1b2101ef7f2812c73ca9814a1ba8dcbdf.
- Conteúdo: correções da fundação e persistência online normalizada, incluindo migration Drizzle incremental e importação de saves antigos.
- Acesso privado preservado. Publicação confirmada pelo serviço Sites como succeeded.
- Validação local anterior: 31 testes, typecheck, build e smoke HTTP aprovados. Não foi feito novo teste funcional no banco hospedado após a publicação.

O usuário autorizou manter o site e publicar atualizações validadas, enquanto Sites estiver incluído no plano, sem contratar serviços adicionais. Documentação consultada: https://learn.chatgpt.com/docs/pricing. Sites consta como incluído nos planos elegíveis durante o beta público; a política pode mudar e os limites do plano continuam aplicáveis.

Fonte principal local: C:\Users\rodrg\DEV\operators_pmc. A cópia em .sites-runtime/publish-source/.sites-checkout é apenas o checkout de empacotamento do repositório já associado ao site; não inclui bancos, backups ou node_modules. Não são necessários novos backups locais por enquanto, conforme orientação do usuário.

## Pessoal 0.2.0 — publicação de 2026-11-08

- Commit de funcionalidades: b3201df999e55ca90886fc31bad058b8e355087e.
- Implantação: appgdep_6af0b5894b588191bb52df80efdd722f, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_bf70e6e0235c8191bc2d4e48b0cc8e31.
- Acesso owner-private preservado; mesma URL.
- Schema hospedado conferido: 15 tabelas, incluindo pessoal. Interface publicada carregou uma campanha existente e as seis ofertas de recrutamento com atributos e custos; nenhum operador foi contratado na campanha hospedada durante o smoke.
- Testes locais: 47 aprovados; typecheck e build aprovados. Preview local verificou contratação de dois operadores, equipe, treino e familiaridade 0→2 em 390 px.
- Ajuste visual posterior: saldo sem quebra em larguras intermediárias; não altera regras ou banco.

### Implantação final do ajuste visual

- Commit: 45126d8824d58c348c05461fd385b9f861a618ab.
- Implantação: appgdep_6af0b65a89cc81918a91af4d24873ff0, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_54e5f073d948819191c630af83f3bd3c.
- Mesma URL privada; build aprovado. Saldo US$ 100.000 sem quebra confirmado visualmente no site após recarregar. Campanha existente permaneceu no turno 1, sem contratação nem avanço durante o smoke hospedado.

## Operações 0.3.0 — 2026-11-08

- Commit publicado: fa5508fcf6a2e4a123e5ebc38e19b7b9becb5a1d.
- Implantação: appgdep_6af0bce0e2208191afe049273b8740ea, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_169c636661d48191b7115654b99381b1.
- URL privada preservada: https://operators-pmc-command.rodrgost.chatgpt.site/.
- Schema remoto conferido pelo conector Sites: 20 tabelas, incluindo contratos, missões, assignments, decisões e relatórios.
- Validação local: 64 testes em 10 arquivos, build e typecheck aprovados. Ciclo aceitar, planejar, iniciar e concluir missão foi validado no navegador local entre T9 e T13; pagamento proporcional e reputação registrados. Layout de operações/relatórios inspecionado em 390 px.
- Conferência visual final do site hospedado pendente: aprovação automática de navegação negada porque o limite de uso foi atingido. Não foi tentado contornar esse bloqueio. A publicação foi confirmada como succeeded independentemente dessa conferência.
- Nenhuma missão de teste criada ou avançada na campanha hospedada nesta revisão. Não foram criados novos backups locais.


## Mundo 0.4.0 — 2026-11-08

- Commit publicado: f9f9f4d7375b624e978308420c0d517ca2662370.
- Implantação: appgdep_6af0d2a4b088819185ca6505ebe345cd, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_95e9e27340d481919f057f0de4f55edb.
- Mesma URL e acesso privado owner-only preservados.
- 74 testes aprovados; typecheck/build online e diff check aprovados. Preview local T13→T41 e dossiê móvel em 390 px verificados.
- Nove tabelas mundiais adicionadas por migration incremental; nenhum novo backup criado e nenhum avanço de QA no banco hospedado.

- Conferência pós-publicação: conector confirmou 29 tabelas; navegador autenticado carregou o dossiê de Varkov na campanha hospedada Vanguard Security em T1, com indicadores estimados e versão 0.4.0. Nenhuma contratação, missão ou avanço realizado online no smoke.


## Logística e sede 0.5.0 — 2026-11-08

- Commit publicado: c2e1cd518d005ce0d2a238b752999ffec4301ab8.
- Implantação: appgdep_6af0d9fd882081918ed56f519d1e6aa4, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_dc8e4f9a55d08191af9f0cd91c370403.
- URL privada preservada: https://operators-pmc-command.rodrgost.chatgpt.site/.
- Conector Sites confirmou 35 tabelas no D1, incluindo sede/módulos, kits, alocações, atividades e progresso.
- 93 testes em 13 arquivos, typecheck, build online e diff check aprovados. Ciclo equipado e melhoria validados no preview, com revisão móvel em 390 px.
- Smoke hospedado: Sede e logística e catálogo de 18 kits carregaram na campanha Vanguard Security, estoque vazio e manutenção inicial USD 600/semana. Nenhuma compra, upgrade, contratação, missão ou avanço realizado no banco hospedado. Inicialização dos módulos ocorreu pelo acesso normal à interface.
- Nenhum novo backup local criado. Preview encerrado após a validação.


## Inteligência 0.6.0 — 2026-11-08

- Commit publicado: 982173be33d4e721b3bd8f81ac547363080e015e.
- Implantação: appgdep_6af0dfab4a3481919ac428f5237e2006, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_80e1cb13275c8191bfd49daf883822db.
- Mesma URL privada preservada: https://operators-pmc-command.rodrgost.chatgpt.site/.
- Sites confirmou 39 tabelas no D1, incluindo registros, índice corrente, análises e snapshots de conhecimento de missões.
- 109 testes em 15 arquivos, typecheck, build online e diff check aprovados. Análise T53→T55 e comparação de fontes verificadas no preview, também em 390 px.
- Smoke hospedado: Vanguard Security T1, Varkov com níveis preliminares, fonte pública, confiança 55% e validade específica por assunto; versão 0.6.0 confirmada no navegador. Nenhuma análise contratada, missão iniciada ou turno avançado no banco hospedado. Inicialização/importação de conhecimento pelo acesso normal à interface.
- Sem novos backups. Preview encerrado após a validação.


## UX e qualidade 0.7.0 — 2026-11-08

- Commit publicado: d94b80335782fb0626feddd8e035f7b45d070f7a.
- Implantação: appgdep_6af0e69996748191b993d18cb0999b84, succeeded.
- Versão salva: appgprj_6af0867c8b0081919a17665415f89c70~appgver_0d2d334e100481919146eecd2447b785.
- Mesma URL e audiência privada preservadas. Sem migrations; D1 permaneceu com 39 tabelas.
- Suíte completa: 117 testes em 17 arquivos; typecheck/build/diff check aprovados. Após ajuste final de carregamento/atalho, sete testes de UI/criação e typecheck/build repetidos e aprovados.
- Campanha integrada de 336 turnos em lote/individual, hashes iguais e ledger/FK consistentes; resultados em QUALITY-REPORT.md. Valores das regras preservados.
- Smoke hospedado no tab existente: painel 0.7.0, último avanço T0→T1, roteiro de preparação, agenda e custo semanal consolidado carregaram na campanha Vanguard Security. Nenhuma compra, contratação, análise, missão ou avanço executado pelo agente na campanha hospedada.
- Preview local verificado em desktop/390 px; encerrado ao finalizar. Nenhum novo backup local.
