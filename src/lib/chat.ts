// O chat conversa em linguagem natural sobre a base. A IA recebe os FATOS já
// calculados por código e responde em cima deles, incluindo recomendações do tipo
// "o que devemos fazer". Ela nunca inventa número: o que é contagem já vem pronto
// nos fatos. Sem chave da OpenAI, cai num resumo determinístico das perguntas comuns.

import type { TriagemResultado } from "./dataset";
import { fatosParaChat } from "./facts";
import { interpretarPergunta, executarConsulta } from "./query";

export interface Turno {
  autor: "user" | "bot";
  texto: string;
}

export interface RespostaChat {
  texto: string;
  via: "ia" | "deterministico";
}

const SISTEMA = `Você é o assistente do painel de triagem de ocorrências de campo de uma fabricante de eletrodomésticos e eletrônicos. Fala com gente de operação, qualidade e diretoria, sem jargão técnico.

Regras:
- Responda em português do Brasil, curto e direto. De 1 a 4 frases. Sem títulos, sem listas longas, sem markdown pesado.
- Todo número vem do objeto FATOS. Nunca invente um número. Se a informação não estiver nos FATOS, diga que precisaria checar na base.
- Se houver "consultaDireta" nos FATOS, ela já traz a resposta pronta para a pergunta de contagem que foi feita: use esse número.
- Quando perguntarem "o que fazer", "qual o risco", "o que priorizar" ou algo de recomendação, dê uma sugestão prática apoiada nas falhas sistêmicas suspeitas e no backlog dos FATOS.
- Seja honesto sobre limite: sem dados de vendas ou de parque instalado, dá para falar de volume de ocorrências, não de taxa de defeito por modelo.`;

export async function responderChat(
  t: TriagemResultado,
  turnos: Turno[],
): Promise<RespostaChat> {
  const ultima = [...turnos].reverse().find((x) => x.autor === "user")?.texto ?? "";
  const fatos = fatosParaChat(t, ultima);
  const chave = process.env.OPENAI_API_KEY;

  if (!chave) return { texto: respostaDeterministica(t, ultima), via: "deterministico" };

  try {
    const modelo = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const mensagens = [
      { role: "system", content: SISTEMA },
      { role: "system", content: "FATOS (JSON):\n" + JSON.stringify(fatos) },
      ...turnos.map((x) => ({ role: x.autor === "user" ? "user" : "assistant", content: x.texto })),
    ];
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
      body: JSON.stringify({ model: modelo, temperature: 0.3, max_tokens: 320, messages: mensagens }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    const texto = data.choices?.[0]?.message?.content?.trim();
    if (!texto) throw new Error("resposta vazia");
    return { texto, via: "ia" };
  } catch {
    return { texto: respostaDeterministica(t, ultima), via: "deterministico" };
  }
}

/** Sem IA: resolve as perguntas comuns pela regra e devolve a frase pronta. */
function respostaDeterministica(t: TriagemResultado, pergunta: string): string {
  const filtro = interpretarPergunta(pergunta);
  const r = executarConsulta(t.ocorrencias, filtro);
  return r.resposta;
}
