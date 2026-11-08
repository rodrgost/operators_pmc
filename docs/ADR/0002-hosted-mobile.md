# ADR 0002 — Hospedagem privada e interface mobile

Nota posterior: o modelo de agregado JSON e seu limite de tamanho foram substituídos pela persistência normalizada do ADR 0004. As decisões abaixo documentam a etapa anterior.
O usuário solicitou acesso por link dentro do ChatGPT, com o print 33973.jpg como padrão de todas as telas e foco principal em celular.

- Preservar a aplicação local original. Esta edição online usa frontend Nuxt gerado como SPA e API Worker ESM.
- D1 armazena campanhas por identidade autenticada do ChatGPT. O controle de acesso privado é mantido pela plataforma; a API exige identidade e restringe cada consulta ao dono.
- O modelo inicial online é um agregado JSON por partida. Um compare-and-swap persiste estado, eventos, resumo e progresso atomicamente por turno. IDs de comando impedem duplicação. Há limite explícito de 1,5 MB por campanha nesta versão; os subsistemas futuros devem normalizar tabelas antes de ampliar o escopo.
- Retry de lote online em processamento continua somente os turnos restantes. Diferente da base SQLite, não depende de recuperação de processo: Workers são efêmeros. Requisições concorrentes do mesmo comando usam CAS; comandos diferentes não tomam o lote ativo.
- Estado e seed não são expostos pela projeção de partida. Nunca usar browser storage para os saves; localStorage retém somente a preferência de partida selecionada.
- Preservar motor local como referência e testar igualdade de RNG, hashes e resumos com o Worker.
- Todas as telas compartilham fundo preto, cartões cinza, fontes do sistema, controles de toque e layout com prioridade mobile. Cores de destaque apenas para estados. O desktop amplia as colunas onde há espaço.
- O adaptador scripts/preview-online.mjs injeta identidade apenas no preview local. Não integra o Worker publicado e não é usado em produção.
