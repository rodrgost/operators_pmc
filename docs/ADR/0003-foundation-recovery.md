# ADR 0003 — Recuperação online e motor compartilhado

Nota posterior: o modelo de agregado JSON e seu limite de tamanho foram substituídos pela persistência normalizada do ADR 0004. As decisões abaixo documentam a etapa anterior.
Status: adotado em 2026-11-08, correções locais da fundação.

- Preservar contratos HTTP, schema D1, saves e versão de regras 0.1.0. Não há migration nesta correção.
- Compartilhar resolução pura de eventos, datas e entradas de hash/RNG entre SQLite e Worker. Node usa SHA-256 síncrono; Worker usa Web Crypto. Resultados permanecem equivalentes.
- Lotes transitam de processing para completed, interrupted ou failed. Uma falha recuperável registra o último progresso confirmado por CAS e libera activeRequest. Retomada explícita executa somente os turnos restantes.
- Recuperação altera apenas metadados e pode ultrapassar o limite de 1,5 MB para liberar o lock. Isso não permite novos turnos acima do limite. A normalização do save continua necessária antes da Fase 2.
- Se o armazenamento impedir também a gravação de recuperação, manter processing persistido para retry com o mesmo ID quando o serviço voltar.
- Propriedades herdadas de objetos nunca representam comandos ou resumos existentes. Aceitar IDs válidos como constructor e __proto__ usando consulta de propriedade própria.
- Preview padrão em 127.0.0.1:3000, com porta validada; preservar Origin para que a API possa recusá-lo.
- Interface conserva comando de criação e requestId em memória após falha de rede, inclusive falha ao atualizar a tela. Uma nova tentativa recupera a mesma criação. Recarregar a página descarta esse comando; preferências locais não são armazenamento de saves.

Testes: falha no turno 17, retomada, tamanho máximo, IDs especiais, concorrência de comandos, fechamento semanal, 336 turnos e opções de preview. Não representa implementação ou aceite dos subsistemas futuros.
