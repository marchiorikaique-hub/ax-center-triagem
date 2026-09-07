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

A base já vem no repositório em `dados/ocorrencias.csv`, então não há banco para
configurar. A página lê o CSV, limpa os dados e roda a triagem ao carregar.

## O que você vai ver

- **Pergunte à base (topo):** um assistente onde você escreve em português
  ("quantas críticas estão abertas?", "o que devemos priorizar?") e recebe a
  resposta. A conversa usa IA; a contagem é sempre feita pelo código.
- **Cartões do dia:** falha sistêmica suspeita, críticas vencidas, abertas fora do
  prazo, duplicatas e reincidências. Cada cartão é clicável.
- **Ao clicar num cartão:** abre a lista por trás do número. Nos cartões de falha
  sistêmica e de crítica vencida, também aparece a mensagem pronta para o Teams
  (até 900 caracteres) com um botão de enviar.

## A IA

O assistente usa a OpenAI. Para ligar, copie `.env.example` para `.env.local` e cole
sua chave:

```bash
cp .env.example .env.local
# edite OPENAI_API_KEY
```

Sem chave, o assistente ainda responde as perguntas comuns por regra determinística,
então a página nunca fica muda.

## Testes e checagens

```bash
pnpm test        # testes do núcleo (limpeza, dedup, SLA, tendência, consulta)
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
src/lib/alerts.ts      mensagens do Teams + envio (stub)
src/lib/facts.ts       fatos para o chat + listas dos cartões
src/lib/query.ts       consulta determinística + parser da pergunta
src/lib/chat.ts        conversa da IA, ancorada nos fatos, com fallback
src/app/page.tsx       a página
src/app/components/     Chat (assistente) e Board (cartões + listas)
eval/                  os 20 casos rotulados
docs/email-alexandre.md  a pergunta aberta para a operação
```
