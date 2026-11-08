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
