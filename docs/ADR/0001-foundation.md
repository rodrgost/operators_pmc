# ADR 0001 — Fundação local e escopo incremental

Status: adotado como padrão técnico inicial da especificação v1.0.

Implementar primeiro Fase 0 e base da Fase 1, conforme o primeiro pedido recomendado em SPEC.md. Manter módulos futuros explícitos; não substituir funcionalidades por resultados fictícios.

- Node.js 24 + TypeScript, Fastify 5, Nuxt 3/Vue 3, Zod 4 e Vitest.
- SQLite nativo de Node, SQL explícito e migration versionada. Evita dependências nativas adicionais no Windows.
- Um processo de API e um usuário local de confiança. Bind em loopback, sem CORS público. Autenticação multiusuário precede qualquer hospedagem pública.
- API e Nuxt executados localmente. Nenhuma publicação é feita neste incremento, pois a arquitetura solicitada exige Fastify/SQLite local e ainda não inclui autenticação.
- Caixa inicial USD 100.000, reputação 10, início em 01/01/2030, sem despesas até existirem vínculos. Valores propostos/configuráveis, centralizados em packages/rules.
- Seed clona países, regiões e organizações por partida. Ainda não persistir atributos ocultos de mundo sem motor/projeções de inteligência.
- Hash e sorteios SHA-256 com componentes serializados em JSON e versão de regras. IDs aleatórios de partida são identidades, não resultados da simulação.
- Um commit por turno com estado, eventos, resumo e progresso do lote. Nenhuma agregação financeira por lote.
- Partidas não têm ações críticas nesta base. O suporte a decisões críticas e fallback será implementado com missões, sem alegar aceite desse requisito nesta fase.
- API síncrona para lotes curtos (máximo 28). UI indica processamento sem progresso simulado. Em falha de rede, reutiliza requestId; em falha do motor, retoma explicitamente.
- Ao reiniciar, lotes ainda marcados processing tornam-se failed com reason process_interrupted, preservando os turnos confirmados.

Limitação: a serialização é garantida em um único processo. Escala horizontal exigirá lock persistido/lease e recuperação coordenada antes de suportar mais de um processo.
