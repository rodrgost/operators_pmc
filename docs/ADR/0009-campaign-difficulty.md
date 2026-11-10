# ADR 0009 — Dificuldade permanente por companhia

Aprovado pelo usuário e implementado em 2026-11-10. Fácil, Normal e Difícil são escolhidos na criação; Normal é o padrão.

## Perfis v1

| Modificador | Fácil | Normal | Difícil |
|---|---:|---:|---:|
| Probabilidade-base de eventos negativos | 0,75 | 1 | 1,25 |
| Probabilidade-base de oportunidades favoráveis | 1,25 | 1 | 0,80 |
| Probabilidade de complicação de missão | 0,75 | 1 | 1,25 |
| Frequência de atuação dos rivais | 0,80 | 1 | 1,20 |
| Remuneração dos novos contratos | 1,15 | 1 | 0,90 |

Preços, salários, atributos, prazos, capital inicial e capacidades não mudam. Percentuais são aplicados uma única vez; probabilidades ficam entre 0 e 1, remunerações são arredondadas em centavos.

Eventos de estabilização e investimento corporativo são positivos. Crise industrial, confronto, demanda humanitária e incidente de segurança são negativos. Elegibilidade, condições regionais, cooldown e limites de eventos ativos continuam intactos. Mais crises podem originar mais contratos, mas frequência de oferta não recebe multiplicador extra; a remuneração reduzida e os limites existentes permanecem.

## Rivais: frequência, não probabilidade inexistente

O algoritmo anterior assumia até um contrato por janela de quatro turnos, sem chance de interesse. Multiplicar uma chance já igual a 100% não aumentaria a pressão. Por isso, o parâmetro altera a frequência das janelas: `floor(turn * interest / cadence)`. O perfil Normal usa exatamente as janelas e a rotação anteriores. Permanecem período de graça, orçamento, capacidade e respeito a contratos aceitos pelo jogador. Não altera a chance de sucesso do rival.

## Persistência e imutabilidade

`difficulty`, `difficulty_version` e `difficulty_json` guardam identificador, versão e cópia dos valores efetivos. A migração é aditiva com defaults literais de Normal v1, sem reescrever finanças, contratos, ordens ou histórico. O importador antigo também recebe esses defaults.

Não há rota para alteração. Schemas strict recusam parâmetros extras de dificuldade em avanços e ações. Trigger SQLite/D1 recusa alterações das três colunas. O snapshot salvo é validado e usado pelo motor; não consultar o preset atual em cada turno. Nunca editar `difficulty.v1.json`: criar uma versão nova e manter as antigas disponíveis.

A chave de criação normaliza a ausência de dificuldade para Normal antes de comparar payloads; retries das versões anteriores continuam válidos. Repetir uma criação trocando o perfil com o mesmo requestId retorna conflito e não muda a companhia.

## Determinismo

Preservar os subfluxos RNG existentes para comparar os perfis com os mesmos sorteios. Normal não muda a função de hash. Fácil/Difícil incluem o snapshot no hash final do turno. A semente sozinha não identifica mais o cenário completo: comparar semente, comandos, versões e dificuldade salva.

Remuneração comercial é ajustada em `offers`; remuneração emergente, em `publishWorldContracts`. A reapresentação do contrato ou o fechamento da missão não aplica o multiplicador novamente. Contratos já existentes não são recalculados.

## UX e validação

Seletor mobile com descrição e aviso de escolha permanente, detalhes dos cinco multiplicadores e indicação de dificuldade nas companhias e no topo da campanha. Os perfis exibidos são lidos do mesmo arquivo de configuração usado pelo servidor.

135 testes passam, incluindo 9 da dificuldade. Simulação de seis sementes × três perfis × 336 turnos e comparação adicional de Normal com o motor do commit bf41d66201fa687825def1632e0ffaa22233b8d9: todos os hashes de mundo/contratos por turno coincidem. A campanha integrada anterior mantém saldo final 5812893 centavos, sete missões concluídas e pagamentos idênticos.

O relatório DIFFICULTY_BALANCE.json contém tendências sem missões do jogador; não é prova de equilíbrio para todas as estratégias. A sustentabilidade com todas as mecânicas continua sendo avaliada pela campanha integrada existente e pelo uso do jogador. Ajustes futuros devem criar novos perfis versionados, sem alterar campanhas abertas.
