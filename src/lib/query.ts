// Consulta sobre a base. Duas peças:
//  1) executarConsulta: recebe um FILTRO estruturado e conta em cima do dado
//     limpo. Determinístico. Quem conta é sempre este código, nunca a IA.
//  2) interpretarPergunta: um parser por palavra-chave que transforma a pergunta
//     em português num filtro, sem IA. Resolve as perguntas comuns sozinho.
// A IA (ai.ts) só entra para traduzir perguntas mais soltas no mesmo filtro.

import type { Ocorrencia, Prioridade } from "./types";

export type Metrica =
  | "contagem"
  | "top_modelos"
  | "top_reincidencia"
  | "vencidas"
  | "tendencia";

export interface Consulta {
  metrica: Metrica;
  linha?: string;
  ufs?: string[];
  mes?: number; // 1-12
  prioridade?: Prioridade;
  apenasAbertas?: boolean;
}

export interface RespostaConsulta {
  resposta: string;
  valor?: number;
  itens?: { rotulo: string; valor: number }[];
  filtro: Consulta;
}

const REGIOES: Record<string, string[]> = {
  nordeste: ["BA", "PE", "CE", "MA", "PB", "RN", "AL", "SE", "PI"],
  sudeste: ["SP", "MG", "RJ", "ES"],
  sul: ["RS", "PR", "SC"],
  "centro-oeste": ["GO", "MT", "MS", "DF"],
  norte: ["AM", "PA", "AC", "RO", "RR", "AP", "TO"],
};

// Regex com limite de palavra: "ar" não pode casar dentro de "lavar"/"aparecem".
// Ordem: da linha mais específica para a mais genérica.
const LINHA_REGRAS: [RegExp, string][] = [
  [/geladeira|refrigerad/, "Geladeira"],
  [/lavadora|m[aá]quina de lavar|\blavar\b/, "Maquina de Lavar"],
  [/ar[-\s]?condicionado|\bar\b/, "Ar-Condicionado"],
  [/\btvs?\b|televis/, "TV"],
  [/\bmonitor/, "Monitor"],
];

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const PRIORIDADES: Record<string, Prioridade> = {
  critico: "Critica", critica: "Critica", "crítico": "Critica", "crítica": "Critica",
  alta: "Alta", alto: "Alta", media: "Media", "média": "Media", baixa: "Baixa",
};

function aplicarFiltro(ocs: Ocorrencia[], c: Consulta): Ocorrencia[] {
  return ocs.filter((o) => {
    if (o.duplicataDe) return false; // duplicata não conta duas vezes
    if (c.linha && o.linha !== c.linha) return false;
    if (c.ufs && !c.ufs.includes(o.uf)) return false;
    if (c.mes && (!o.abertura || o.abertura.getMonth() + 1 !== c.mes)) return false;
    if (c.prioridade && o.prioridade !== c.prioridade) return false;
    if (c.apenasAbertas && o.status === "fechada") return false;
    return true;
  });
}

function topPor(ocs: Ocorrencia[], sel: (o: Ocorrencia) => string, n = 5) {
  const c = new Map<string, number>();
  for (const o of ocs) {
    const k = sel(o);
    if (k) c.set(k, (c.get(k) ?? 0) + 1);
  }
  return [...c.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, n);
}

export function executarConsulta(ocs: Ocorrencia[], c: Consulta): RespostaConsulta {
  const filtradas = aplicarFiltro(ocs, c);

  if (c.metrica === "top_reincidencia") {
    const itens = topPor(filtradas.filter((o) => o.reincidenciaDe), (o) => o.modelo);
    return { resposta: descreverTop("modelos com mais reincidência", itens), itens, filtro: c };
  }
  if (c.metrica === "top_modelos") {
    const itens = topPor(filtradas, (o) => o.modelo);
    return { resposta: descreverTop("modelos com mais ocorrências", itens), itens, filtro: c };
  }
  if (c.metrica === "vencidas") {
    const venc = filtradas.filter((o) => o.vencida);
    return { resposta: `${venc.length} ocorrência(s) fora do prazo${escopo(c)}.`, valor: venc.length, filtro: c };
  }
  if (c.metrica === "tendencia") {
    const itens = tendencia(filtradas);
    return { resposta: descreverTop("modelos que mais cresceram no último mês", itens), itens, filtro: c };
  }
  // contagem (default)
  return { resposta: `${filtradas.length} ocorrência(s)${escopo(c)}.`, valor: filtradas.length, filtro: c };
}

function tendencia(ocs: Ocorrencia[]) {
  const porModeloMes = new Map<string, Map<string, number>>();
  let ultimo = "";
  for (const o of ocs) {
    if (!o.abertura) continue;
    const m = `${o.abertura.getFullYear()}-${String(o.abertura.getMonth() + 1).padStart(2, "0")}`;
    if (m > ultimo) ultimo = m;
    const mm = porModeloMes.get(o.modelo) ?? porModeloMes.set(o.modelo, new Map()).get(o.modelo)!;
    mm.set(m, (mm.get(m) ?? 0) + 1);
  }
  const itens: { rotulo: string; valor: number }[] = [];
  for (const [modelo, mm] of porModeloMes) {
    const nUlt = mm.get(ultimo) ?? 0;
    const total = [...mm.values()].reduce((a, b) => a + b, 0);
    const media = total / Math.max(mm.size, 1);
    if (nUlt >= 8 && nUlt >= 2 * media) itens.push({ rotulo: modelo, valor: nUlt });
  }
  return itens.sort((a, b) => b.valor - a.valor).slice(0, 5);
}

function escopo(c: Consulta): string {
  const p: string[] = [];
  if (c.linha) p.push(`de ${c.linha}`);
  if (c.mes) p.push(`no mês ${String(c.mes).padStart(2, "0")}`);
  if (c.ufs) p.push(`em ${c.ufs.join("/")}`);
  if (c.prioridade) p.push(`com prioridade ${c.prioridade}`);
  if (c.apenasAbertas) p.push("em aberto");
  return p.length ? " " + p.join(" ") : "";
}

function descreverTop(titulo: string, itens: { rotulo: string; valor: number }[]): string {
  if (!itens.length) return `Sem dados para ${titulo}.`;
  return `${titulo[0].toUpperCase()}${titulo.slice(1)}: ` +
    itens.map((i) => `${i.rotulo} (${i.valor})`).join(", ") + ".";
}

/** Parser determinístico: pergunta em português -> filtro. Sem IA. */
export function interpretarPergunta(pergunta: string): Consulta {
  const q = pergunta.toLowerCase();
  const c: Consulta = { metrica: "contagem" };

  for (const [re, v] of LINHA_REGRAS) if (re.test(q)) { c.linha = v; break; }
  for (const [k, v] of Object.entries(MESES)) if (q.includes(k)) c.mes = v;
  for (const [k, v] of Object.entries(REGIOES)) if (q.includes(k)) c.ufs = v;
  const uf = q.match(/\b(sp|mg|pe|rs|ba|pr|ce|rj|go)\b/);
  if (uf) c.ufs = [uf[1].toUpperCase()];
  for (const [k, v] of Object.entries(PRIORIDADES)) if (q.includes(k)) c.prioridade = v;
  if (/abert|em aberto|fila/.test(q)) c.apenasAbertas = true;

  if (/reincid/.test(q)) c.metrica = "top_reincidencia";
  else if (/venc|estour|prazo|atrasad/.test(q)) c.metrica = "vencidas";
  else if (/cresce|cresceu|aument|tend[êe]ncia|disparo|subiu/.test(q)) c.metrica = "tendencia";
  else if (/quais modelo|que modelo|modelos com mais|ranking/.test(q)) c.metrica = "top_modelos";

  return c;
}
