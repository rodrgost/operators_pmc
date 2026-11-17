# Mundo por país

O mundo tem cinco áreas jogáveis: Valdoria, Karsen, Solmar, Norvik e Arken. Cada país possui um único conjunto de indicadores, controle político, influência, acontecimentos e inteligência. Ofertas comerciais e emergentes, reconhecimento e consequências de missões usam essa mesma área.

Os nomes históricos `regions`, `region_id` e o alvo de inteligência `region` permanecem no armazenamento e nos contratos internos. Seus IDs agora são os próprios IDs dos países; não existem subdivisões na simulação. A interface apresenta apenas países.

## Campanhas

Esta alteração não migra campanhas anteriores. Novas campanhas gravam explicitamente as versões `world-0.2-countries` e `operations-0.2-countries`. O modo de navegador usa o banco IndexedDB `operators-country-campaigns-v1`, separado dos saves anteriores, que não são apagados.

## Ritmo do mundo

O intervalo mínimo entre acontecimentos de um país passou de 12 para 4 turnos. Foram mantidas as probabilidades, as condições de elegibilidade, os efeitos e o limite de dois acontecimentos ativos por área. As seis ofertas comerciais semanais continuam sendo geradas.

Uma simulação sem ações do jogador, em 12 sementes por 112 turnos, registrou médias de 58,92 acontecimentos e 52,25 contratos emergentes no novo mundo, contra 94,42 e 81,50 na estrutura anterior. O ajuste mantém oportunidades recorrentes, com menos acontecimentos simultâneos no total. Não equivale a uma validação completa de equilíbrio de estratégias.

## Validação

- 215 testes passaram, incluindo uma campanha de 336 turnos, equivalência entre avanço individual e em lote, consequências de missões, inteligência e finanças.
- Checagem de tipos do servidor e da interface passou.
- Testes de geografia verificam uma única área por país, ofertas vinculadas ao país e rejeição das subdivisões removidas.
