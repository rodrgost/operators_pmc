# Validação da edição online

- 11 testes automatizados passaram: 8 da base e 3 da adaptação online.
- Teste online compara resumos/hash/RNG com o motor local.
- Requisições concorrentes com o mesmo ID confirmam 28 turnos uma única vez.
- Usuário diferente recebe 404 ao consultar partida alheia; identidade ausente recebe 401.
- Typecheck TypeScript e Nuxt passou.
- Geração Nuxt e bundle Worker ESM passaram.
- Interface aberta no browser de preview: criar campanha e avançar quatro turnos funcionaram.
- Layout inspecionado também em viewport de conteúdo de 390 px via iframe de QA. Adaptado valor monetário para impedir quebra indesejada.

A validação de preview usa banco local. O ambiente publicado usa D1 e autenticação do ChatGPT. Módulos futuros seguem indisponíveis.
