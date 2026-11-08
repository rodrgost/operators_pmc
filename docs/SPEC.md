# OPERATORS — PMC Command
## Especificação técnica e funcional consolidada — MVP

**Versão:** 1.0  
**Data:** 2026-11-08  
**Destino:** implementação assistida por Codex  
**Idioma da interface:** português brasileiro  
**Moeda do jogo:** USD (fictícia)  
**Estado:** especificação para implementação; não representa funcionalidades já desenvolvidas.

> **Convenção de requisitos:** **[DECIDIDO]** = escolha já consolidada; **[PROPOSTO]** = padrão inicial ajustável; **[POSTERGADO]** = fora do MVP. Valores de exemplos, custos, bônus e probabilidades são parâmetros de balanceamento, não fatos de mercado nem regras irrevogáveis.

---

# 1. Visão de produto

## 1.1 Conceito

**[DECIDIDO]** Jogo single-player de estratégia e gestão de uma companhia militar privada (PMC), em um mundo contemporâneo fictício e persistente. O jogador é comandante/gestor e não controla personagens em combate tático. Suas ações são contratar, organizar, equipar, treinar, aceitar contratos, definir políticas operacionais, administrar caixa e responder a decisões extraordinárias. Equipes executam missões autonomamente; resultados são apresentados em relatórios.

**[DECIDIDO]** O mundo progride autonomamente a cada turno: organizações competem, crises evoluem, PMCs rivais aceitam contratos e novos contratos surgem por demanda comercial ou por eventos mundiais.

## 1.2 Pilares

1. **Gestão com consequências:** salários, manutenção, riscos e investimento em capacidade operacional.
2. **Autonomia supervisionada:** ordens estratégicas; líderes e motor executam etapas.
3. **Mundo causal:** eventos e conflitos alteram oportunidades, riscos e relações.
4. **Informação imperfeita:** o estado real é oculto; a PMC trabalha com estimativas.
5. **Reprodutibilidade:** mesma semente, comandos e versão de regras produzem mesmo estado.
6. **Auditabilidade:** cada alteração relevante pode ser explicada por eventos e lançamentos.

## 1.3 Fora do escopo

**[POSTERGADO]** Combate tático em mapa, movimentação de unidades pelo jogador, RTS, veículos detalhados, múltiplas bases geográficas, fabricação de equipamentos, espionagem complexa, empréstimos/investidores, multiplayer, mercado real de preços, geração obrigatória por LLM e simulação individual integral das equipes das PMCs rivais.

## 1.4 Escopo mínimo jogável

Criar partida; avançar tempo; visualizar mundo; recrutar operadores; montar equipes permanentes; adicionar reforços temporários; comprar/alocar/manter kits; melhorar sede; treinar/recuperar operadores; aceitar/planejar/executar contratos; receber relatórios e tomar decisões; acompanhar caixa, reputação e histórico; salvar e retomar.

---

# 2. Relógio, comandos e determinismo

## 2.1 Tempo

**[DECIDIDO]** 1 turno = 6 horas; 4 turnos/dia; 28 turnos/semana. Relógio do jogo deriva de `startDate + currentTurn * 6h`, sem depender do relógio do sistema. Turnos são inteiros monotônicos; operações e vencimentos referenciam números de turno.

**[DECIDIDO]** Avanço manual individual ou em lote; **[PROPOSTO]** 1 a 28 turnos por solicitação. Um lote executa a mesma rotina de um turno N vezes, jamais multiplica efeitos agregados. Eventos informativos não interrompem; eventos importantes interrompem conforme preferência; decisões críticas obrigatórias interrompem ao final do turno de criação. A decisão pode permanecer pendente e, em avanço posterior, aplicar `fallbackAction` ao chegar ao prazo.

## 2.2 Ordem canônica por turno

Definir sem ambiguidades o intervalo de processamento: uma chamada iniciada em `currentTurn=t` processa o **turno t+1**; ao concluir, persiste `currentTurn=t+1`.

1. Validar partida, versão, comando e estado de interrupção.
2. Resolver prazos de abertura do turno (decisões vencidas, contratos expirados, entregas e construções que entram em vigor neste turno).
3. Executar ações das organizações, PMCs rivais, conflitos e eventos regionais em ordem estável.
4. Processar etapas das missões já ativas, usando o estado disponível neste turno.
5. Aplicar consequências de missão: saúde, fadiga, moral, equipamento, reputação, relações, regiões e relatórios.
6. Processar atividades de treinamento, descanso, enfermaria, manutenção e reposição elegíveis neste turno.
7. Processar finanças, marcos contratuais e fechamento semanal se `turn % 28 === 0`.
8. Atualizar oferta comercial e emergente de contratos; os contratos gerados ficam disponíveis **após** a conclusão deste turno.
9. Atualizar inteligência/expiração de conhecimento, construir resumo, persistir eventos, estado e versão atomicamente.
10. Após commit, avaliar interrupção e decidir se o lote continua.

**[PROPOSTO]** Conclusões de entrega/construção com `completesAtTurn == t+1` são ativadas na fase 2; atividades executadas na fase 6 não podem retroagir para afetar missões já resolvidas na fase 4. Uma missão iniciada por comando entre turnos começa a resolver etapas somente no próximo avanço.

## 2.3 RNG

**[DECIDIDO]** Aleatoriedade determinística com semente da partida. **[PROPOSTO]** Subfluxos identificados por `(seed, rulesVersion, turn, subsystem, entityId, drawKey)`; nunca `Math.random()` na lógica de simulação. Processar coleções por ID estável; persistir sorteios/eventos que afetam resultados e a versão do algoritmo. Evitar consumo de uma sequência global suscetível a mudanças em módulos não relacionados.

## 2.4 Atomicidade, idempotência e concorrência

- Uma transação SQLite por turno, com rollback completo em erro; lote confirma turno por turno.
- Uma partida só pode ter um avanço ativo; usar lock transacional e `stateVersion` (controle otimista) para evitar concorrência.
- `requestId` único por partida; repetir a mesma requisição retorna o resultado já armazenado, sem novo avanço.
- **[PROPOSTO]** `advance_requests` registra `requestedTurns`, `processedTurns`, `status`, `lastCommittedTurn`, `interruptionReason` e resumo; em falha parcial permite **retomar explicitamente** os turnos restantes sem reexecutar os confirmados.
- Requisições de escrita exigem versão esperada e IDs de comando para evitar duplicidade de compras, aceitações e decisões.

---

# 3. Mundo fictício — Asterra

## 3.1 Estrutura

**[DECIDIDO]** Mundo contemporâneo fictício, inicialmente cinco países e quinze regiões, sem mapa geográfico obrigatório. Navegação hierárquica Mundo → País → Região → Conflitos / Organizações / Contratos.

| País | Característica | Regiões |
|---|---|---|
| República de Valdoria | Estável, rica, segurança corporativa | Nova Valdoria; Porto Leste; Distrito Central |
| Federação de Karsen | Industrial, conflito separatista | Varkov; Fronteira Norte; Distrito da Capital |
| Emirado de Solmar | Energético, tensões moderadas | Capital de Solmar; Campos Energéticos; Fronteira Desértica |
| Confederação de Norvik | Descentralizada, instável, portos | Porto de Norvik; Interior; Costa Oriental |
| União de Arken | Estável, tecnológica | Capital de Arken; Polo Tecnológico; Distrito Norte |

**[DECIDIDO]** Cada região possui `stability`, `security`, `economy`, `tension` (0–100), facção controladora, influências por organização, conflitos e eventos ativos. Controle político e influência são conceitos diferentes. Exemplo ilustrativo: Varkov `stability=32`, `security=41`, `economy=76`, `tension=84`.

## 3.2 Organizações e rivais

**[DECIDIDO]** Categorias: governo, facção armada, corporação, organização civil e PMC rival. Relações bilaterais de -100 a +100; objetivos, recursos e influência regional. Seed inicial: dez organizações não-PMC e três rivais abstratos:

- **Iron Shield Security:** contratos corporativos, custo alto e reputação elevada.
- **Red Wolf Group:** postura agressiva e maior tolerância ao risco.
- **Aegis Dynamics:** foco técnico e reconhecimento.

Rivais possuem capacidade, orçamento, reputação, especializações e missões agregadas, sem operadores individuais simulados no MVP. Disputam oportunidades e alteram regiões/relações.

## 3.3 Eventos, conflitos e causalidade

**[DECIDIDO]** Categorias: político, econômico, segurança, conflito, corporativo e humanitário. Eventos exigem precondições, probabilidade determinística, duração, efeitos e possíveis eventos subsequentes. Conflitos possuem participantes, intensidade 0–100, duração, status e histórico.

**[PROPOSTO]** Limitar eventos ativos por região, aplicar cooldown e recuperação natural para evitar explosão de eventos. Mudanças regionais devem ser delimitadas em 0–100. Exemplos de cadeia: tensão elevada → crise industrial → menor estabilidade → demanda por escolta → atuação de PMCs → estabilização ou escalada.

---

# 4. Operadores e recrutamento

## 4.1 Ficha

**[DECIDIDO]** Operador persistente com seis atributos 0–100: `combat`, `stealth`, `technical`, `perception`, `endurance`, `leadership`; nível 1–10; XP; especialização (`recon`, `assault`, `medic`, `technical`, `leader`); até dois traços (`disciplined`, `cautious`, `impulsive`, `resilient`, `loyal`, `ambitious`); `health`, `fatigue`, `morale`, `loyalty` em 0–100; salário, vigência contratual, histórico e status. Líder não é classe obrigatória: qualquer operador apto pode ser designado.

**[PROPOSTO]** Estados derivados da agenda: disponível, missão, treinamento, descanso, recuperação, pendência contratual e desligado. Disponibilidade nunca é somente booleano persistido. Contratos de emprego de 4/8/12 semanas; bônus de assinatura e por missão; renovações; desligamentos e retenção afetados por moral, lealdade, reputação e pagamentos.

## 4.2 Recrutamento

**[DECIDIDO]** Mercado renova semanalmente (28 turnos), com qualidade dos candidatos influenciada por reputação. Faixas ilustrativas de salário semanal: novatos nível 1–2 `$400–900`; veteranos 3–6 `$1.200–3.000`; elites 7–10 `$3.200–6.000`. Recrutamento deve respeitar capacidade administrativa, caixa e disponibilidade de candidatos.

---

# 5. Equipes permanentes e reforços

**[DECIDIDO]** Equipes persistentes com nome, especialização preferencial, líder titular, substituto, membros, diretrizes padrão e histórico. Reforços temporários são vinculados apenas à missão; retornam à reserva ao fim. Um operador não pode integrar duas missões simultaneamente.

**[PROPOSTO]** 2–6 membros permanentes e até dois reforços por missão. A composição é livre; especializações não são obrigatórias, mas requisitos contratuais podem exigir cobertura mínima. Líder da missão deve estar presente e apto; substituto assume quando necessário, senão designar provisório antes de iniciar.

**[DECIDIDO]** Entrosamento considera familiaridade entre pares de operadores, persistida em 0–100; equipe e formação efetivamente enviada têm indicadores diferentes. Participação conjunta em missões e treinamento eleva familiaridade. **[PROPOSTO]** Efeito moderado de coordenação, limitado a aproximadamente ±10%, sem superar grandes diferenças de competência. Reforços frequentes podem tornar-se familiares.

**Integridade:** registrar um snapshot imutável da formação ao iniciar missão (`mission_assignments`), preservando composição histórica mesmo após mudanças no cadastro da equipe. A mudança de equipe permanente durante missão não altera o snapshot. Operadores em missão não podem ser transferidos para outra missão.

---

# 6. Contratos, planejamento e missões

## 6.1 Origem e catálogo

**[DECIDIDO]** Contratos comerciais periódicos e emergentes causados pelo mundo, ambos executados pelo mesmo motor. Seis tipos:

| Tipo | Competências predominantes |
|---|---|
| Segurança (`security`) | combate, percepção, resistência |
| Escolta (`escort`) | combate, liderança, percepção |
| Reconhecimento (`reconnaissance`) | furtividade, percepção, técnica |
| Extração (`extraction`) | furtividade, combate, liderança |
| Recuperação (`recovery`) | técnica, percepção, furtividade |
| Resgate (`rescue`) | combate, percepção, resistência |

Contrato: cliente, região, `source`, `originEventId`, objetivo, dificuldade 1–100, risco 1–100 **separados**, tamanho de equipe, competências ponderadas, estágios, duração, vencimento, remuneração, adiantamento, bônus, custos e consequências. Estados: `available`, `accepted`, `active`, `completed`, `failed`, `expired` (podem ser adicionados `cancelled`/`withdrawn` com regras explícitas).

**[PROPOSTO]** Missões de 2–6 estágios, com exemplos implantação, reconhecimento, localização, execução e retorno. Recompensa-base modulada por dificuldade, risco, urgência e orçamento do cliente; todos os coeficientes em JSON. Pagamentos por adiantamento, marcos e conclusão; penalidades e bônus conforme contrato.

## 6.2 Planejamento

Antes de iniciar: selecionar equipe, membros aptos, reforços, líder presente, kits disponíveis, logística, diretrizes, estimativas de inteligência e custos. Validar limite de operações da sede, requisitos mínimos e ausência de alocações conflitantes. Aceitar contrato e iniciar missão são comandos distintos.

## 6.3 Resolução de etapas

**[DECIDIDO]** Motor calcula capacidade por competências relevantes, cobertura de especialização, liderança, entrosamento, condições individuais, kits, inteligência aplicável, dificuldade, risco, diretrizes e sorteios determinísticos. Resultados possíveis: sucesso, parcial, atraso, complicação e falha; efeitos persistem.

**[PROPOSTO]** Evitar somar atributos linearmente: usar melhores especialistas por competência, contribuição marginal decrescente dos demais e penalidades por lacunas de cobertura. Risco representa severidade/probabilidade de complicações; dificuldade representa exigência técnica da etapa. Não revelar probabilidades exatas quando a inteligência for limitada.

## 6.4 Autonomia e intervenções

**[DECIDIDO]** Diretrizes: `posture` (`cautious|balanced|aggressive`), `priority` (`objective|team_safety|deadline`), `riskTolerance` (`low|medium|high`) e `withdrawalPolicy` (`conservative|normal|persistent`). Líder escolhe ações por função de utilidade ponderada, com comportamento influenciado por liderança e traços. Decisões triviais são autônomas; risco fora de tolerância, objetivo comprometido e mudanças excepcionais geram solicitação ao comandante. Incapacidade pode exigir retirada automática.

**[DECIDIDO]** Decisão contém opções, turno de criação, vencimento, fallback e resultado. A decisão não bloqueia o mundo inteiro; missão afetada pode aguardar. O comandante recebe relatório com contexto e consequências estimadas.

---

# 7. Inteligência progressiva

## 7.1 Separação de estados

**[DECIDIDO]** Estado real do mundo e das missões é privado ao motor. A PMC possui registros de conhecimento independentes. O backend entrega ao frontend **projeções autorizadas**, nunca campos reais ocultos. Proibir endpoints de debug com segredos em produção.

**[DECIDIDO]** Quatro níveis por assunto: 0 desconhecido, 1 preliminar, 2 verificado, 3 detalhado. Conhecimento regional e da missão são distintos. Registro inclui `topic`, `targetType`, `targetId`, estimativa/intervalo, confiança 0–100, fonte, turno de coleta, validade e histórico.

## 7.2 Fontes e envelhecimento

Fontes: dados públicos, contratante, análise remunerada (proposta de 1–3 turnos), reconhecimento prévio por missão independente e reconhecimento durante missão. Informações podem ser incorretas, conflitantes e obsoletas. Velocidade de envelhecimento depende do assunto; riscos imediatos envelhecem mais rápido que infraestrutura. Nova informação não necessariamente reduz risco real ou aumenta confiança.

**[DECIDIDO]** Inteligência influencia seleção de equipe/kits/diretrizes, previsão de custo, decisões autônomas e avaliação de alternativas. Evitar bônus universal de sucesso. Estimativas devem ser persistidas, não re-sorteadas a cada abertura de tela.

---

# 8. Kits operacionais e logística

## 8.1 Categorias

**[DECIDIDO]** Kits reutilizáveis de combate, reconhecimento, médico, técnico, comunicação e logístico; três níveis de qualidade I básico, II profissional, III avançado. Cada instância física possui ID, referência de catálogo, condição 0–100, suprimentos 0–100, estado e vínculo de missão/manutenção. Estoque centralizado; alocação por missão; kit não pode estar simultaneamente em duas operações.

**[PROPOSTO]** Estados `in_delivery`, `available`, `reserved`, `in_use`, `maintenance`, `destroyed`. Compra debita caixa e gera entrega futura; reserva é transacional; retorno registra desgaste, consumo e perda. Carga logística limita número/peso de kits. Kits iguais possuem retornos decrescentes.

## 8.2 Manutenção e suprimentos

**[PROPOSTO]** Condição 70–100 normal, 40–69 desgastada, 1–39 crítica, 0 inutilizada. Reposição de suprimentos e manutenção são ações separadas, com custo e prazo. Desgaste físico não causa cobrança imediata; saída de caixa só ocorre na compra/manutenção. Suprimento já adquirido não deve ser cobrado novamente no consumo. Custo de preparação só deve representar despesa efetiva adicional, evitando dupla contagem.

Efeitos dependem da etapa, especialização do operador, qualidade, condição e disponibilidade de suprimentos; não são bônus globais arbitrários.

---

# 9. Sede modular

**[DECIDIDO]** Uma sede, sem mapa de construção, cinco módulos com níveis 1–5, melhorias sequenciais, custo de investimento, prazo em turnos e manutenção semanal. Construção preserva a capacidade antiga até conclusão.

| Módulo | Responsabilidade | Capacidades ilustrativas por nível 1→5 |
|---|---|---|
| Treinamento | Vagas e ganho de progresso | vagas 1,2,3,4,6; eficiência 100%,110%,120%,130%,145% |
| Enfermaria | Tratamento e recuperação | vagas 1,2,3,4,6; saúde/turno +5,+7,+9,+12,+15 |
| Depósito | Armazenagem e preparação | capacidade 20,40,70,110,160; preparações 1,2,3,4,6 |
| Operações | Missões simultâneas | 1,2,3,4,6 |
| Administração | Capacidade de pessoal e eficiência | operadores 12,20,30,45,65 |

**[PROPOSTO]** Treinamento ocupa operador e vaga, gera progresso acumulado por atributo com retornos decrescentes e pode ser interrompido preservando progresso. Descanso recupera fadiga; enfermaria recupera saúde e respeita duração mínima de ferimentos graves; moral é separada. Depósito usa unidades de carga; retorno acima da capacidade pode gerar armazenagem temporária onerosa. Administração não concede reputação gratuita. Custos semanais em turnos múltiplos de 28. Inadimplência gera consequências progressivas, não corrupção do estado.

**[ATENÇÃO]** O exemplo anterior de custo do Centro de Operações indicava nível 1 `$1.500/semana`, enquanto outro exemplo de custo consolidado usava valor diferente. O balanceamento definitivo deve ter **uma única tabela fonte**; não copiar ambos como regras.

---

# 10. Economia, reputação e relações

**[DECIDIDO]** Caixa em USD, razão financeira detalhada, receitas de adiantamento/marcos/conclusão, bônus, despesas de salários semanais, infraestrutura, compras, treinamento, manutenção, tratamento, viagens e suprimentos. Reputação global 0–100 afeta candidatos, clientes e mercado. Relações com organizações -100 a +100 afetam contratos e consequências.

**[PROPOSTO]** Valores monetários como inteiros em centavos (`amountCents`), nunca float; cada lançamento tem `entryType`, `sourceType`, `sourceId`, `turn`, `amountCents`, `balanceAfterCents` ou saldo derivado. Lançamentos de débito/crédito devem ser únicos por evento financeiro, evitando pagamento duplicado. Ações com custo exigem caixa suficiente, salvo regra explícita de inadimplência de despesas automáticas.

---

# 11. Modelo de dados relacional (SQLite)

## 11.1 Convenções

- PKs UUID/ULID ou identificadores determinísticos gerados pelo serviço; FKs obrigatórias; `PRAGMA foreign_keys=ON`.
- Valores monetários `INTEGER` em centavos; turnos `INTEGER`; porcentagens/atributos `INTEGER` 0–100; JSON apenas para estruturas variáveis com schema validado.
- `created_turn`, `updated_turn`, `version` em entidades mutáveis; timestamps reais apenas para auditoria externa.
- Índices para FK, status, vencimento e consultas por partida.
- Toda entidade de jogo tem `game_id`, inclusive relações e ledger, evitando vazamento entre partidas.

## 11.2 Tabelas nucleares

| Tabela | Campos principais | Regras / relações |
|---|---|---|
| `games` | id, seed, rules_version, current_turn, start_date, cash_cents, reputation, state_version, status | Partida raiz |
| `game_commands` | id, game_id, request_id, type, payload_json, expected_version, result_json, status | UNIQUE(game_id,request_id) |
| `advance_requests` | id, game_id, request_id, requested_turns, processed_turns, status, last_committed_turn, interruption_reason, summary_json | Idempotência de lotes |
| `countries` | id, game_id, name, metadata_json | 1:N regiões |
| `regions` | id, game_id, country_id, stability, security, economy, tension, controller_org_id | CHECK 0..100 |
| `organizations` | id, game_id, type, name, resources_json, goals_json | Inclui rivais |
| `organization_relations` | game_id, org_a_id, org_b_id, relation | Par canônico único |
| `region_influences` | game_id, region_id, organization_id, influence | UNIQUE por par; valida soma conforme política |
| `conflicts` | id, game_id, region_id, intensity, status, started_turn, ended_turn | Participantes em tabela auxiliar |
| `conflict_participants` | conflict_id, organization_id, side | FK |
| `world_events` | id, game_id, region_id, type, origin_id, start_turn, end_turn, status, effects_json | Cadeia causal |
| `rival_pmcs` | id, game_id, organization_id, capacity, budget_cents, reputation, specialization_json | Simulação agregada |
| `operators` | id, game_id, name, level, xp, attributes_json, conditions_json, specialization, traits_json, status | Campos validados |
| `employment_contracts` | id, game_id, operator_id, salary_cents, start_turn, end_turn, signing_bonus_cents, status | Histórico e renovações |
| `recruitment_candidates` | id, game_id, generated_turn, expires_turn, profile_json, offer_json | Mercado semanal |
| `squads` | id, game_id, name, leader_id, deputy_id, default_directives_json, status | Identidade permanente |
| `squad_members` | squad_id, operator_id, joined_turn, left_turn | Histórico de composição; no máximo uma equipe permanente ativa por operador [PROPOSTO] |
| `operator_familiarity` | game_id, operator_low_id, operator_high_id, score | Par canônico, 0..100 |
| `contracts` | id, game_id, region_id, client_org_id, source, origin_event_id, type, difficulty, risk, required_operators, expires_turn, reward_json, status | Oferta e aceite |
| `contract_stages` | id, contract_id, ordinal, type, requirements_json, duration_turns | Etapas ordenadas |
| `missions` | id, game_id, contract_id, squad_id, leader_id, current_stage, status, started_turn, ended_turn, directives_json | UNIQUE(contract_id) [PROPOSTO] |
| `mission_assignments` | mission_id, operator_id, assignment_type, role, stats_snapshot_json | Snapshot; sem dupla missão ativa |
| `mission_stage_results` | id, mission_id, stage_id, turn, outcome, modifiers_json, rng_json, effects_json | Auditoria |
| `decisions` | id, game_id, mission_id, created_turn, expires_turn, options_json, fallback_action, chosen_action, resolved_turn, status | Uma resolução |
| `equipment_catalog` | id, rules_version, category, tier, price_cents, logistics_weight, effects_json | Catálogo versionado |
| `equipment_items` | id, game_id, catalog_id, condition, supplies, status, assigned_mission_id, available_turn | Instância reutilizável |
| `equipment_allocations` | id, mission_id, item_id, start_condition, start_supplies, end_condition, end_supplies, status | Histórico |
| `equipment_jobs` | id, game_id, item_id, type, started_turn, completes_turn, cost_cents, status | Compra/entrega, manutenção, reposição (tipos validados) |
| `headquarters` | id, game_id, name | Uma sede por partida |
| `hq_modules` | id, headquarters_id, module_type, level, status | UNIQUE por tipo |
| `hq_upgrades` | id, game_id, module_id, target_level, started_turn, completes_turn, cost_cents, status | Sequencial |
| `operator_activities` | id, game_id, operator_id, type, attribute, start_turn, end_turn, progress_json, status | Treino/descanso/tratamento |
| `intel_records` | id, game_id, target_type, target_id, topic, level, estimate_json, confidence, source, collected_turn, valid_until_turn, supersedes_id | Histórico, não sobrescrever |
| `financial_ledger` | id, game_id, turn, source_type, source_id, entry_type, amount_cents, metadata_json | UNIQUE para fato financeiro |
| `game_events` | id, game_id, turn, sequence, event_type, entity_type, entity_id, payload_json, visibility | Histórico canônico |
| `turn_summaries` | game_id, turn, summary_json, state_hash | UNIQUE(game_id,turn) |

**Observação de implementação:** tabelas de catálogo/seeds podem ser globais por versão; estados de mundo devem ser clonados ou inicializados por partida. Constraints cross-table (como dupla alocação ativa) exigem transação e índice/estrutura auxiliar de reservas; não confiar apenas em validação do frontend.

## 11.3 Índices essenciais

- `contracts(game_id,status,expires_turn,region_id)`
- `missions(game_id,status,squad_id)`
- `operators(game_id,status)`
- `equipment_items(game_id,status,catalog_id)`
- `decisions(game_id,status,expires_turn)`
- `game_events(game_id,turn,sequence)`
- `financial_ledger(game_id,turn)`
- `intel_records(game_id,target_type,target_id,topic,collected_turn)`
- `advance_requests(game_id,request_id)` UNIQUE

---

# 12. Arquitetura de software

## 12.1 Estrutura sugerida

**[PROPOSTO]** Monorepo TypeScript (Node.js), Nuxt/Vue 3, API HTTP com Fastify, validação Zod, SQLite com migrations via Drizzle ORM ou SQL explícito, testes Vitest. TypeScript é recomendação técnica para evitar erros em modelos interdependentes; não é requisito histórico do projeto. O motor não deve importar código de frontend nem depender de HTTP.

```text
operators-pmc/
  apps/
    web/                       # Nuxt 3 + Vue 3
      pages/
      components/
      composables/
    api/                       # Fastify: autenticação local de sessão, REST
      src/routes/
      src/controllers/
  packages/
    domain/                    # tipos, enums, schemas, invariantes
    engine/                    # simulação pura, RNG, resolução de etapas
    application/               # casos de uso, orquestração, transações
    persistence/               # SQLite, migrations, repositories
    rules/                     # seeds Asterra e balanceamento versionados
    contracts/                 # DTOs de API e schemas compartilhados
  tests/
    unit/
    integration/
    determinism/
    e2e/
  docs/
    SPEC.md
    ADR/
  package.json
```

## 12.2 Responsabilidades

- **Domain:** entidades, estados, validações, invariantes e transições legais.
- **Engine:** funções determinísticas `resolveStage`, `advanceWorld`, `resolveAutonomy`, `applyWear`, `updateKnowledge`; não realiza I/O.
- **Application:** comandos do jogador, planejamento, verificação de capacidade, aplicação de transações, processamento de lotes.
- **Persistence:** repositories e ledger; transação por turno; migrations; backups.
- **API:** autenticação/autorização de partida, validação de DTO, idempotência, projeção de dados visíveis.
- **Web:** UI responsiva, filtros, formulários, estados de carregamento, relatórios; sem autoridade sobre resultados.

## 12.3 Fluxo de comando

`UI → POST comando + requestId + expectedVersion → validação → aplicação transacional → eventos + estado → projeção segura → resposta`.

## 12.4 Observabilidade

Logs estruturados por `gameId`, `turn`, `requestId`, `subsystem`; erros sem revelar informações ocultas ao cliente; métricas de tempo de turno e contagem de eventos; função de replay/debug somente em ambiente de desenvolvimento.

---

# 13. API REST — contrato inicial

Prefixo **`/api/v1`**. Todas as rotas de partida exigem acesso à partida. DTOs não devem expor segredos internos; POSTs mutáveis recebem `requestId` e `expectedVersion` (no corpo ou cabeçalho padronizado).

## 13.1 Partidas e tempo

| Método | Rota | Finalidade |
|---|---|---|
| POST | `/games` | Criar partida com seed e versão de regras |
| GET | `/games` | Listar partidas |
| GET | `/games/:gameId` | Estado resumido visível |
| GET | `/games/:gameId/dashboard` | KPIs, pendências e notícias |
| POST | `/games/:gameId/advance` | Avançar N turnos |
| GET | `/games/:gameId/advances/:requestId` | Consultar resultado de lote |
| GET | `/games/:gameId/timeline` | Eventos filtrados e paginados |
| GET | `/games/:gameId/turns/:turn/summary` | Resumo de turno |

**Request de avanço:**

```json
{
  "requestId": "ADV-0017",
  "expectedVersion": 48,
  "turns": 28,
  "stopOnImportant": false
}
```

**Response ilustrativo:**

```json
{
  "requestId": "ADV-0017",
  "requestedTurns": 28,
  "processedTurns": 9,
  "currentTurn": 57,
  "stateVersion": 57,
  "status": "interrupted",
  "reason": "critical_decision",
  "pendingDecisionIds": ["DEC-004"],
  "summaryId": "SUM-0017"
}
```

**Códigos HTTP:** 200 leitura/avanço concluído ou interrompido normalmente; 201 criação; 400 schema inválido; 403 acesso negado; 404 inexistente; 409 conflito de versão, capacidade ou estado; 422 regra de domínio; 500 erro interno com rollback. A interrupção por decisão é resultado de domínio, não erro HTTP.

## 13.2 Mundo e inteligência

- `GET /games/:id/world/countries`
- `GET /games/:id/world/countries/:countryId`
- `GET /games/:id/world/regions/:regionId`
- `GET /games/:id/world/regions/:regionId/conflicts`
- `GET /games/:id/world/organizations/:organizationId`
- `GET /games/:id/intelligence?targetType=&targetId=&topic=`
- `POST /games/:id/intelligence/analyses` (custo, prazo e escopo)

## 13.3 Operadores, equipes e atividades

- `GET /games/:id/operators`
- `GET /games/:id/operators/:operatorId`
- `GET /games/:id/recruitment/candidates`
- `POST /games/:id/recruitment/hire`
- `POST /games/:id/operators/:operatorId/renew-contract`
- `POST /games/:id/operators/:operatorId/activities` (treinar, descansar, tratar)
- `GET /games/:id/squads`
- `POST /games/:id/squads`
- `PATCH /games/:id/squads/:squadId`
- `POST /games/:id/squads/:squadId/members`
- `DELETE /games/:id/squads/:squadId/members/:operatorId`

## 13.4 Contratos e operações

- `GET /games/:id/contracts` (filtros de região, tipo, risco **estimado**, pagamento, estado)
- `GET /games/:id/contracts/:contractId` (projeção de inteligência)
- `POST /games/:id/contracts/:contractId/accept`
- `POST /games/:id/contracts/:contractId/plan` (validação/prévia sem alteração, **[PROPOSTO]**)
- `POST /games/:id/contracts/:contractId/start` (snapshot e reserva de operadores/kits)
- `GET /games/:id/missions`
- `GET /games/:id/missions/:missionId`
- `GET /games/:id/missions/:missionId/reports`
- `GET /games/:id/decisions?status=pending`
- `POST /games/:id/decisions/:decisionId/resolve`

## 13.5 Equipamentos, sede e finanças

- `GET /games/:id/equipment/catalog`
- `GET /games/:id/equipment/inventory`
- `POST /games/:id/equipment/purchases`
- `POST /games/:id/equipment/:itemId/maintenance`
- `POST /games/:id/equipment/:itemId/resupply`
- `GET /games/:id/headquarters`
- `POST /games/:id/headquarters/modules/:moduleType/upgrade`
- `GET /games/:id/finances/summary`
- `GET /games/:id/finances/ledger`

## 13.6 Segurança da API

O estado real (`difficulty`, `risk`, facções ocultas, sorteios futuros) deve ficar em entidades internas. O endpoint de contrato expõe somente `estimatedDifficulty`, `estimatedRisk`, confiança e dados publicáveis. Não reutilizar diretamente DTO interno como response. Paginação e filtros server-side; validação de IDs, estados e permissões em todas as rotas.

---

# 14. Telas e experiência do usuário

**[DECIDIDO]** Dashboard estratégico sem mapa obrigatório. Navegação principal:

1. **Visão geral:** caixa, reputação, operadores disponíveis, missões ativas, decisões pendentes, notícias, controle de tempo e resumo de avanço.
2. **Mundo:** países → regiões → indicadores, organizações, conflitos, histórico e contratos; manter contexto ao navegar.
3. **Operadores:** lista, ficha, recrutamento, equipes permanentes, reforços, treinamento, recuperação e disponibilidade.
4. **Contratos:** catálogo com filtros; detalhes, contexto, estimativas de inteligência, planejamento, seleção de equipe/kits/diretrizes, consequências possíveis.
5. **Operações:** andamento por etapas, líder, composição, recursos, relatórios, decisões críticas, retirada e resultados.
6. **Finanças:** caixa, receitas/despesas, salários, manutenção semanal, ledger e projeções.

**[PROPOSTO]** Acesso a **Sede** e **Logística** como abas/subseções de Visão geral ou Operadores no MVP, evitando aumentar excessivamente o menu. Sede: módulos, vagas, melhorias e manutenção. Logística: catálogo, estoque, compras, reparos e suprimentos. Inteligência integrada a Mundo/Contratos/Operações, sem menu próprio obrigatório.

### Componentes

`CompanySummary`, `TurnControls`, `TurnSummary`, `PendingDecisions`, `WorldTimeline`, `CountrySelector`, `RegionOverview`, `ConflictDetails`, `OperatorCard`, `SquadRoster`, `MissionPlanner`, `IntelAssessment`, `EquipmentInventory`, `HeadquartersModules`, `FinancialLedger`.

### Estados de UI

Carregando, vazio, indisponível, bloqueado por regra, confirmação de custo, conflito de versão, falha recuperável e sucesso. O botão de avançar deve ficar desabilitado enquanto a solicitação está em andamento. Exibir progresso apenas se backend oferecer progresso real; nunca simular conclusão de ações.

---

# 15. Regras transversais e invariantes

1. Um operador não participa de duas missões ativas; não treina/descansa/trata simultaneamente com missão ativa.
2. Um kit não pode estar reservado/ativo em duas missões; kit destruído não retorna ao estoque disponível.
3. Uma missão não inicia sem líder apto, equipe mínima, contrato aceito, vagas de operação e requisitos de logística.
4. Contrato expirado não pode ser aceito; contrato concluído não pode pagar novamente.
5. O caixa e o ledger devem reconciliar; toda transação monetária possui origem única.
6. `currentTurn` só avança após commit integral do turno.
7. O frontend não recebe estado real oculto nem RNG futuro.
8. `health`, `fatigue`, `morale`, `loyalty`, atributos e indicadores regionais permanecem em 0–100; reputação também.
9. Melhoria de módulo só pode avançar um nível por vez e não muda capacidade antes do prazo.
10. O mundo evolui mesmo sem missões do jogador.
11. Decisões críticas interrompem lote ao fim do turno de criação; vencimentos são resolvidos uma única vez.
12. Eventos e relatórios preservam contexto causal (`sourceId`, `originEventId`, turno, versão).
13. Dados de balanceamento e regras são versionados por partida.
14. Operações idempotentes não duplicam efeitos após retry.
15. O motor processa entidades em ordem determinística; toda simulação usa semente da partida.

---

# 16. Critérios de aceitação

## 16.1 Partida/tempo

- [ ] Criar duas partidas com mesma seed e regras gera estados iniciais equivalentes.
- [ ] Quatro avanços de 1 turno equivalem a um avanço de 4, com comandos idênticos.
- [ ] Decisão crítica surgindo no 3º turno interrompe lote nesse turno.
- [ ] Retentar mesmo `requestId` não avança novamente.
- [ ] Falha no turno 17 de lote preserva exatamente 16 turnos confirmados.
- [ ] Fechamento semanal em turno 28 executa uma única vez.
- [ ] Reiniciar servidor permite continuar a partida.

## 16.2 Operadores/equipes

- [ ] Recrutar reduz caixa, cria vínculo e respeita limite administrativo.
- [ ] Mercado renova a cada 28 turnos.
- [ ] Operador em missão não pode ser usado em outra missão ou atividade.
- [ ] Reforço não altera vínculo permanente; retorna à reserva ao encerrar.
- [ ] Líder ausente é substituído por substituto apto ou requer designação válida.
- [ ] Entrosamento reflete pares presentes e preserva histórico após trocas.

## 16.3 Contratos/missões

- [ ] Contratos comerciais e emergentes utilizam o mesmo motor.
- [ ] Missão sem equipe ou equipamento obrigatório não inicia.
- [ ] Etapas produzem relatórios com resultados e consequências consistentes.
- [ ] Postura/diretrizes alteram escolha autônoma conforme regra definida.
- [ ] Decisão pendente com prazo aplica fallback exatamente uma vez.
- [ ] Pagamento e reputação são aplicados conforme resultado sem duplicação.

## 16.4 Mundo/inteligência

- [ ] Eventos alteram indicadores e podem gerar contratos vinculados à causa.
- [ ] Rivais disputam contratos e afetam mercado/mundo.
- [ ] API nunca entrega `trueRisk` ou informação oculta.
- [ ] Abrir a mesma avaliação repetidamente não gera nova estimativa.
- [ ] Inteligência pode envelhecer e ser contradita por nova fonte.

## 16.5 Logística/sede/economia

- [ ] Comprar kit debita uma vez e libera somente após entrega.
- [ ] Kit em manutenção ou missão não pode ser alocado novamente.
- [ ] Consumo reduz suprimentos sem duplicar despesas.
- [ ] Módulo em construção mantém capacidade antiga até conclusão.
- [ ] Treino e enfermaria respeitam vagas e ocupação.
- [ ] Livro-razão reconcilia com o saldo da partida.

## 16.6 Interface

- [ ] Todas as seis áreas principais são navegáveis e exibem estados reais da API.
- [ ] Mundo mantém país/região ao voltar de contrato.
- [ ] Contratos mostram estimativas, fonte e confiança, não valores secretos.
- [ ] Controle de lote informa solicitado, processado, motivo de interrupção e pendências.
- [ ] Layout funciona em desktop e mobile; formulários mostram bloqueios e custos.

---

# 17. Roadmap de implementação para Codex

## Fase 0 — Fundação e contratos de dados

**Entregáveis:** monorepo, TypeScript, lint, testes, Fastify, Nuxt, SQLite, migrations, schemas Zod, regras versionadas, seeds Asterra, documentação de ADRs. **Aceite:** subir backend/frontend, criar banco e executar testes em ambiente limpo.

## Fase 1 — Partida, persistência e motor temporal

**Entregáveis:** criação/carregamento, relógio, RNG determinístico, eventos, snapshots/estado, avanço 1/N turnos, transação, idempotência, locks, timeline e dashboard básico. **Aceite:** equivalência lote vs individual e recuperação após falha.

## Fase 2 — Operadores, recrutamento e equipes

**Entregáveis:** ficha, mercado semanal, contratos de trabalho, salários, estados de disponibilidade, equipes permanentes, líderes, reforços, familiaridade, validações. **Aceite:** impossível duplicar operador em missão/atividade.

## Fase 3 — Contratos e missões autônomas

**Entregáveis:** seis templates, marketplace comercial, aceite, planejamento, etapas, motor de resolução, diretrizes, decisões pendentes, relatórios, reputação e pagamentos. **Aceite:** ciclo completo aceitar → preparar → executar → concluir/fracassar → relatório/ledger.

## Fase 4 — Mundo dinâmico

**Entregáveis:** países/regiões, organizações, relações, conflitos, eventos causais, rivais abstratos, contratos emergentes e navegação do mundo. **Aceite:** simular dezenas de turnos com mudanças causais e integridade dos indicadores.

## Fase 5 — Logística e infraestrutura

**Entregáveis:** catálogo/instâncias de kits, compra/entrega, reserva, desgaste, suprimentos, manutenção; cinco módulos da sede, upgrades, treinamento, descanso, enfermaria e capacidades. **Aceite:** restrições operacionais, despesas e retornos de ativos consistentes.

## Fase 6 — Inteligência progressiva

**Entregáveis:** estado oculto, registros de conhecimento, projeções seguras, fontes, análises, reconhecimento, envelhecimento e impacto nas decisões. **Aceite:** nenhuma API revela verdade oculta; estimativas são estáveis até atualização.

## Fase 7 — UX, balanceamento e qualidade

**Entregáveis:** seis áreas integradas, telas de sede/logística, resumo de lote, filtros, decisões, histórico, mobile, ajustes de economia, simulações longas e regressão. **Aceite:** campanha de pelo menos 12 semanas (336 turnos) sem inconsistências, bloqueios ou economia obviamente quebrada.

### Ordem de dependências

`Fundação → Turnos → Operadores/Equipes → Contratos/Missões → Mundo → Equipamentos/Sede → Inteligência → Integração/Balanceamento`.

Implementar **vertical slices**: em cada fase, criar migrations, domínio, caso de uso, API, testes e UI mínima correspondente. Não implementar todas as telas primeiro nem deixar testes para o final.

---

# 18. Pontos ainda não decididos e valores configuráveis

Esses tópicos não devem ser inventados pelo Codex como se fossem escolhas definitivas:

1. **Balanceamento:** custos, progressão de XP, chances, desgaste, prazos, geração de contratos e escalada de conflitos. Usar valores iniciais centralizados em JSON com testes e comentários.
2. **Início de campanha:** caixa, reputação, número de operadores, equipes, kits e níveis iniciais. Propor preset tutorial; tornar configurável.
3. **Falência/derrota:** definir critérios exatos de insolvência e encerramento de campanha. MVP pode usar estado `financial_crisis` sem game over automático.
4. **Tratamento de missão cancelada/retirada:** regras de multa, pagamento parcial, retorno de kits e consequências; especificar antes da fase 3.
5. **Duração de etapas:** resolver se uma etapa consome sempre 1 turno ou duração variável; **proposta**: `remainingTurns` por etapa, com atrasos incrementais.
6. **Reserva de equipamentos no planejamento:** reservar no início da missão, não em prévias; aceitar contrato não reserva automaticamente ativos.
7. **Limites de influência:** decidir se somam 100% por região ou representam escores independentes; **proposta**: percentuais normalizados para presença regional, mantendo controlador separado.
8. **Treinamento:** fórmula de ganho, limiares e potencial individual; preservar progresso decimal em pontos internos, atributos inteiros na UI.
9. **Autenticação:** MVP local single-player pode usar sessão local; para publicação web multiusuário, exigir autenticação e isolamento por usuário.
10. **Backups/exportação:** **proposta**: exportar/importar save versionado em JSON com validação e migração, sem incluir segredos de backend.
11. **Limites de operação:** definir políticas para aceitar mais contratos do que vagas de operações; aceitar pode ser permitido, iniciar fica bloqueado.
12. **Valores de manutenção:** consolidar tabelas contraditórias dos exemplos anteriores em um único `headquartersBalance.json`.

---

# 19. Instruções de execução para o Codex

1. Trate este documento como especificação base. Diferencie **[DECIDIDO]** de **[PROPOSTO]**.
2. Não adicione combate tático, mapa obrigatório, multiplayer ou LLM ao MVP.
3. Antes de implementar uma fase, apresente contratos de dados, migrations, regras de transição e testes correspondentes.
4. Não deixe lógica autoritativa no frontend; não exponha campos secretos nas respostas.
5. Mantenha módulos desacoplados; motor de simulação puro e determinístico.
6. Garanta transações, idempotência e consistência financeira em toda escrita.
7. Execute testes de unidade, integração e determinismo em cada fase.
8. Ao identificar lacuna, proponha padrão configurável e registre a decisão em `docs/ADR`; não invente silenciosamente.
9. Mantenha `docs/SPEC.md` sincronizado com decisões aprovadas e `CHANGELOG.md` para alterações.
10. Priorize um MVP jogável vertical antes de expandir complexidade.

## Primeiro pedido recomendado ao Codex

> Leia integralmente `docs/SPEC.md` do projeto OPERATORS — PMC Command. Implemente **somente a Fase 0 e a base da Fase 1**, com monorepo TypeScript, backend Fastify, frontend Nuxt/Vue 3, SQLite, migrations, validação Zod, seed inicial Asterra, criação de partida, motor temporal determinístico, avanço de turnos e testes de idempotência/atomicidade. Antes de codificar, apresente estrutura de pastas, esquema inicial de dados, contratos de API e plano de testes. Não implemente combate tático, LLM ou módulos posteriores. Ao concluir, forneça comandos para instalar, executar e testar localmente.

---

**Fim da especificação v1.0.**

# Adendo aprovado — 2026-11-08

O usuário definiu prioridade mobile para toda a interface. O print 33973.jpg é a referência visual global: fundo preto, cartões cinza-escuro arredondados, tipografia simples, números destacados e cores restritas aos estados. Aplicar a todas as páginas, formulários, listas, confirmações e estados vazios. No celular, usar fluxo vertical, controles de toque, sem dependência de hover nem tabelas com rolagem horizontal.

O usuário solicitou uma edição acessível por link aqui no ChatGPT. Essa edição é privada, com salvamento online e autenticação da plataforma. A aplicação local original permanece válida; a adaptação de hospedagem está documentada no ADR 0002.

## Nota de implementação da fundação — 2026-11-08

As correções de recuperação online, retry de criação e motor compartilhado estão registradas no ADR 0003. Preservam os requisitos, contratos, saves e regras desta especificação. A revisão local não implementa novas fases nem substitui os critérios de aceitação do MVP completo. Resultados de validação em docs/VALIDATION.md.

## Persistência online normalizada — 2026-11-08

A edição online implementa agora tabelas para campanha/estado atual, comandos, eventos, resumos e fatos financeiros, com isolamento por dono e transação por turno. A nomenclatura usa prefixo online_ para distinguir a edição D1 da base local. Os agregados legados são importados atomicamente na primeira abertura, preservados como arquivo histórico e deixam de ser autoridade após a importação. Não há novo subsistema de jogo nem alteração das regras. Contratos HTTP, hashes e resultados existentes permanecem compatíveis. ADR 0004 descreve schema, transições, importação e rollback; docs/VALIDATION.md registra os 31 testes e a verificação local. Não houve publicação.

## Incremento 0.2.0 — Pessoal

Implementados recrutamento semanal determinístico, operadores, vínculos e renovação, salários/dívidas, equipes permanentes e histórico, líderes/substitutos, disponibilidade por agenda exclusiva e familiaridade por treino conjunto. Os parâmetros propostos adotados são configuráveis em packages/rules/personnel.json e documentados no ADR 0005. Versionamento de pessoal separado preserva saves e hashes da fundação até ativação do módulo. Atividades básicas foram incluídas para exercitar disponibilidade/familiaridade; progressão avançada e sede permanecem posteriores. Reforços efetivamente enviados e snapshots de missão serão integrados na Fase 3. Não implica aceite do MVP completo.

## Incremento 0.3.0 — Contratos e missões

Implementado ciclo comercial aceitar→planejar→iniciar→executar etapas→relatório/ledger, com formação imutável, reforços temporários, diretrizes/autonomia, decisões críticas e retirada. Valores propostos de adiantamento, mobilização, duração, capacidade, remuneração parcial e devolução constam em packages/rules/operations.json e ADR 0006. Ofertas desta fase não exigem equipamento; kits e sede permanecem posteriores. O motor suporta source/originEventId comuns a ofertas comerciais e emergentes, mas geração causal depende da Fase 4. Não representa aceite do mundo dinâmico ou do MVP completo.


## Incremento 0.4.0 — mundo causal (2026-11-08)

Implementados indicadores regionais estimados, influência normalizada, controle político, organizações/relações, conflitos com participantes, notícias com origem consultável, demandas emergentes e três PMCs rivais agregadas. Rivais consomem somente ofertas disponíveis após quatro turnos e usam orçamento próprio. Missões do jogador produzem consequências regionais/diplomáticas no mesmo commit do pagamento. Ativação no primeiro acesso aos dados mundiais, a partir do turno atual, sem retroatividade.

Regras provisórias em packages/rules/world.json; ADR 0007; migration incremental 0004_parallel_scream.sql, nove tabelas novas (29 no total). Estado atual carregado separadamente do histórico paginado. Estimativas persistidas atualizam a cada quatro turnos ou notícia; valores internos e RNG não são enviados ao navegador. Não há novos backups. Próximo incremento: Fase 5, logística, equipamentos/kits e sede.


## Incremento 0.5.0 — logística e infraestrutura (2026-11-08)

Implementados catálogo de 18 kits, estoque por instância, compra/entrega, carga, requisitos de missão e alocação exclusiva com snapshot imutável. Etapas consomem suprimentos e desgastam condição sem nova cobrança; retorno libera kits; reparo e reposição são serviços separados. Efeitos dependem de categoria, etapa/tipo, qualidade, condição, suprimentos, especialização enviada e duplicatas.

Uma sede, cinco módulos níveis 1–5, melhorias sequenciais com prazo e capacidade antiga preservada; manutenção semanal após salários, dívida e quitação automática. Treino/enfermaria respeitam vagas; treinamento por atributo preserva progresso ao interromper; tratamento grave tem mínimo de oito turnos. Visão geral → Sede e logística; planejamento permite selecionar kits. Ativação sem retroatividade ao abrir logística (a interface inicializa ao selecionar a campanha), mantendo missões já enviadas. Regras provisórias em packages/rules/logistics.json, ADR 0008 e migration 0005_new_proudstar.sql (35 tabelas). Próximo incremento: inteligência progressiva.
