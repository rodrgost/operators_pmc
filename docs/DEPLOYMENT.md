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
