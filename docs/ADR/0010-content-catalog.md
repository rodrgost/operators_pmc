# ADR 0010 — Catálogo narrativo versionado

Status: aceito.

## Decisão

Separar variedade textual de regras mecânicas em content.v1.json. Escolhas usam hash determinístico de versão e chave, sem consumir RNG da simulação. Manter seis tipos de missão e seis tipos de eventos existentes. Textos de resultados são selecionados após o resultado calculado, com introduções neutras por etapa.

Persistir a narrativa no momento da criação; não recalcular títulos, nomes ou briefings históricos. Projeções não revelam informações ocultas. Versionar novos catálogos em arquivos distintos.

## Conteúdo

79 nomes, 80 sobrenomes, 70 codinomes, 40 sugestões de equipes, 72 temas de contratos, 36 notícias, 54 resultados e 12 introduções de etapas.

## Consequências

Novas campanhas e gerações têm variedade adicional; campanhas existentes recebem o novo conteúdo em gerações futuras. Nenhuma migração de banco é necessária. Não são adicionadas novas decisões mecânicas ou recompensas pelos textos. Testes verificam coerência, determinismo, preservação e equivalência numérica entre versões.
