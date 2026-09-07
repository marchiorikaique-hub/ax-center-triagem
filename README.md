# Triagem de Ocorrências de Campo

Uma fatia do trabalho de triagem que o analista faz hoje na mão, todas as manhãs.
O foco não é abrir chamado (os chamados já existem na base), e sim **olhar o
acumulado**: separar o que é urgente agora e acender a luz quando um problema
parece ser do produto, não da unidade.

## Como rodar

Precisa de Node 20+ e pnpm.

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3100`.

A base de ocorrências já vem no repositório em `dados/ocorrencias.csv`, então não
há banco para configurar. O painel lê o CSV, limpa os dados e roda a triagem na
hora que a página carrega.

## O que você vai ver

- **O que precisa de atenção hoje**: os alertas prontos para o Teams (até 900
  caracteres cada). Só o que importa de manhã: suspeita de falha sistêmica,
  crítico fora do prazo e backlog em nível perigoso.
- **Suspeitas de falha sistêmica**: os modelos e lotes cujo volume disparou no
  último mês, com a série mês a mês.
- **Fila e prazos**: quantas ocorrências estão abertas, quantas já venceram, e
  quantas duplicatas e reincidências foram identificadas.
- **Pergunte à base**: uma caixa onde qualquer pessoa escreve em português
  ("quantas geladeiras em julho no Nordeste") e recebe a resposta. A contagem é
  sempre feita pelo código; a IA só entende a pergunta.
- **Qualidade do campo de sintoma**: quanto o campo veio preenchido, quanto foi
  recuperado pela descrição e quanto ficou sem evidência.

## IA (opcional)

A busca em linguagem natural funciona sem chave: as perguntas comuns já são
resolvidas por uma regra determinística. Para ligar a IA nas perguntas mais
soltas, copie `.env.example` para `.env.local` e cole sua chave da OpenAI.

```bash
cp .env.example .env.local
# edite OPENAI_API_KEY
```

## Testes e checagens

```bash
pnpm test        # testes do núcleo determinístico (normalização, dedup, SLA, tendência, consulta)
pnpm typecheck   # TypeScript strict
pnpm accuracy    # roda os 20 casos rotulados e mostra a acurácia da interpretação
```

## Onde está cada coisa

```
src/lib/normalize.ts   limpeza (datas, parceiro, modelo, canal, prioridade)
src/lib/symptoms.ts    classificação de sintoma por palavra-chave
src/lib/dedup.ts       duplicata x reincidência
src/lib/sla.ts         prazo, vencidas, backlog
src/lib/systemic.ts    detector de falha sistêmica
src/lib/alerts.ts      geração dos alertas (formato Teams) + envio (stub)
src/lib/query.ts       consulta determinística + parser da pergunta
src/lib/ai.ts          tradução da pergunta pela IA, com fallback determinístico
src/app/page.tsx       o painel
eval/                  os 20 casos rotulados
docs/email-alexandre.md  a pergunta aberta para a operação
```
