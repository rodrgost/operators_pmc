# ADR 0006 — Contratos e missões autônomas

Status: adotado, implementação 0.3.0 em 2026-11-08. Parâmetros propostos em packages/rules/operations.json.

Tabelas novas: contratos/ofertas; missões; assignments imutáveis (permanentes/reforços, liderança e atributos enviados); decisões com prazo/fallback/resolução; relatórios públicos com auditoria interna separada. Migração schema-only e ativação idempotente por campanha, preservando saves e regras anteriores.

Ofertas comerciais semanais: seis templates do MVP, risco e dificuldade internos separados. Estimativas persistidas do contratante, com intervalo/confiança, sem probabilidades exatas, seed, dificuldade real ou RNG na API. Contratos emergentes terão o mesmo modelo source/originEventId, mas geração causal depende da Fase 4.

Aceitar não reserva nem paga. Iniciar exige contrato aceito e não expirado, equipe, 2–6 permanentes selecionados, até dois reforços, líder apto presente, vínculo cobrindo prazo máximo, agenda livre e vaga operacional. Capacidade inicial uma missão. Perfil e composição enviados são imutáveis; alterações de equipe permanente não afetam a missão. Diretrizes completas são congeladas e influenciam autonomia. Reservas de operadores são exclusivas e liberadas ao terminar, inclusive reforços, que preservam equipe original.

Quatro etapas iniciais, uma por turno, com no máximo dois atrasos adicionais. Decisão excepcional na execução conforme risco/tolerância e situação da missão; cria interrupção obrigatória do lote, prazo de dois turnos e fallback persistido. Avançar com decisão pendente deixa a missão aguardando, mas o mundo e salários continuam. Ao vencer, aplica uma única vez a política de retirada ou persistência. Incapacidade/expiração de vínculo pode exigir retorno automático. Retirada leva um turno para retorno; atividade não pode tomar operador reservado.

Adiantamento de 20% somente ao iniciar; mobilização USD 200 por operador. Completar paga saldo ajustado pela qualidade; falha/retirada devolve adiantamento, mantém despesa de mobilização e reduz reputação em 2, sem farm de adiantamentos. Débitos automáticos podem deixar caixa negativo e crise financeira, sem game over. Cancelar accepted antes de início não custa nem altera reputação. Todas as receitas/despesas têm origem única no ledger e commit com o turno/ação. Recompensas e percentuais são balanceamento inicial configurável.

Nesta fase as ofertas não exigem kits (campo requiredEquipment vazio); kits, estoque, desgaste e módulos da sede serão implementados na Fase 5. A UI informa isso sem simular equipamento ou bônus inexistente. O teto operacional inicial é configurável, sem alegar módulos de sede prontos.

Testes: fluxo aceitar→planejar→iniciar→etapas→relatório/ledger; snapshot/reforços; dupla alocação; leader e requisitos; versões/retry/concorrência; decisões obrigatórias e fallback único; retirada e devolução; rollback e retomada sem duplicação; equivalência lote/individual; projeções sem segredos; saves antigos e API local compartilhada. Publicar após validação.


Implementação: migration 0003_workable_leo.sql. Motor puro em packages/engine/operations.ts; comandos/projeções em worker/operations.ts. Autonomia avalia alternativas por utilidade de objetivo, risco, liderança, postura e traços; coeficientes centralizados em JSON. Relatórios mostram a abordagem escolhida e condições da equipe; capacidade real, utilidade, dificuldade, risco e sorteios ficam somente na auditoria interna. Missões e finanças são resolvidas antes do fechamento salarial; o hash inclui o estado canônico de operações após ativação.

Teste local no navegador: aceite, prévia sem reserva, início T9 e conclusão T13 com duas operadoras; resultados parciais, ferimento, fadiga, reputação +2 e pagamento proporcional registrados. Conteúdo inspecionado em 390 px. O frontend usa duas casas decimais nos acertos e ledger, mantendo o resumo do caixa compacto.
