// Fronteira da IA. A IA faz UMA coisa: entender uma pergunta em linguagem natural
// e devolver o filtro estruturado. Ela nunca conta nem inventa número — quem
// executa é query.ts em cima do dado limpo. Sem chave (ou se a IA falhar), caímos
// no parser determinístico. Assim a busca funciona sempre, e a IA só melhora o
// alcance para perguntas fora do padrão.

import type { Consulta } from "./query";
import { interpretarPergunta } from "./query";

export interface Interpretacao {
  filtro: Consulta;
  via: "ia" | "deterministico";
}

const SYSTEM = `Você converte uma pergunta sobre uma base de ocorrências de campo em um objeto JSON de filtro. Responda SÓ com JSON, sem texto.
Campos possíveis:
- metrica: "contagem" | "top_modelos" | "top_reincidencia" | "vencidas" | "tendencia"
- linha: "Geladeira" | "Maquina de Lavar" | "TV" | "Ar-Condicionado" | "Monitor" (opcional)
- ufs: array de siglas de UF em maiúsculas (opcional; expanda regiões, ex nordeste -> ["BA","PE","CE"])
- mes: número 1-12 (opcional)
- prioridade: "Critica" | "Alta" | "Media" | "Baixa" (opcional)
- apenasAbertas: booleano (opcional; true quando a pergunta fala de fila/aberto/em atendimento)
Use "contagem" para "quantos/quantas". Use "top_reincidencia" quando falar de reincidência. Use "vencidas" para prazo/atraso/estourando. Use "tendencia" para o que cresceu/aumentou.`;

export async function interpretar(pergunta: string): Promise<Interpretacao> {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return { filtro: interpretarPergunta(pergunta), via: "deterministico" };

  try {
    const modelo = process.env.OPENAI_MODEL || "gpt-5.4-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: pergunta },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    const bruto = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return { filtro: sanear(bruto), via: "ia" };
  } catch {
    // Qualquer falha (sem crédito, timeout, modelo errado) cai no determinístico.
    return { filtro: interpretarPergunta(pergunta), via: "deterministico" };
  }
}

const METRICAS = new Set(["contagem", "top_modelos", "top_reincidencia", "vencidas", "tendencia"]);
const LINHAS = new Set(["Geladeira", "Maquina de Lavar", "TV", "Ar-Condicionado", "Monitor"]);
const PRIORIDADES = new Set(["Critica", "Alta", "Media", "Baixa"]);

/** Nunca confiamos cegamente no JSON da IA: validamos campo a campo. */
function sanear(o: Record<string, unknown>): Consulta {
  const c: Consulta = { metrica: "contagem" };
  if (typeof o.metrica === "string" && METRICAS.has(o.metrica)) c.metrica = o.metrica as Consulta["metrica"];
  if (typeof o.linha === "string" && LINHAS.has(o.linha)) c.linha = o.linha;
  if (Array.isArray(o.ufs)) c.ufs = o.ufs.filter((u) => typeof u === "string").map((u) => (u as string).toUpperCase());
  if (typeof o.mes === "number" && o.mes >= 1 && o.mes <= 12) c.mes = o.mes;
  if (typeof o.prioridade === "string" && PRIORIDADES.has(o.prioridade)) c.prioridade = o.prioridade as Consulta["prioridade"];
  if (o.apenasAbertas === true) c.apenasAbertas = true;
  return c;
}
