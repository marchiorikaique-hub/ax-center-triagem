// Monta os "fatos" que alimentam o chat de IA e as listas que abrem ao clicar num
// cartão. Tudo é calculado por código (determinístico). A IA recebe estes números
// prontos e só conversa em cima deles; ela nunca conta.

import type { Ocorrencia } from "./types";
import { DATA_HOJE, prazoCriticaHoras } from "./sla";
import type { TriagemResultado } from "./dataset";
import { interpretarPergunta, executarConsulta } from "./query";
import { alertaFalhaSistemica, alertaCriticoVencido } from "./alerts";

const MS_DIA = 24 * 3600_000;
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const dias = (d: Date | null) => (d ? Math.round((DATA_HOJE.getTime() - d.getTime()) / MS_DIA) : 0);

export interface LinhaLista {
  id: string;
  modelo: string;
  uf: string;
  linha: string;
  prioridade: string;
  abertura: string | null;
  diasAberto: number;
  extra?: string;
}

export interface Listas {
  criticasVencidas: LinhaLista[];
  abertasVencidas: { total: number; itens: LinhaLista[] };
  duplicatas: LinhaLista[];
  reincidencias: LinhaLista[];
}

function linhaBase(o: Ocorrencia): LinhaLista {
  return {
    id: o.id,
    modelo: o.modelo,
    uf: o.uf,
    linha: o.linha,
    prioridade: o.prioridade ?? "n/d",
    abertura: iso(o.abertura),
    diasAberto: dias(o.abertura),
  };
}

export function construirListas(ocs: Ocorrencia[]): Listas {
  const abertas = ocs.filter((o) => o.status !== "fechada");
  const vencidas = abertas.filter((o) => o.vencida);

  const criticasVencidas = vencidas
    .filter((o) => o.prioridade === "Critica")
    .sort((a, b) => dias(b.abertura) - dias(a.abertura))
    .map(linhaBase);

  const abertasVencidasItens = vencidas
    .sort((a, b) => dias(b.abertura) - dias(a.abertura))
    .slice(0, 150)
    .map(linhaBase);

  const porId = new Map(ocs.map((o) => [o.id, o]));
  const duplicatas = ocs
    .filter((o) => o.duplicataDe)
    .map((o) => {
      const orig = porId.get(o.duplicataDe!);
      return { ...linhaBase(o), extra: `cópia de ${o.duplicataDe} · ${orig?.canal ?? "?"} → ${o.canal}` };
    });

  const reincidencias = ocs
    .filter((o) => o.reincidenciaDe)
    .map((o) => {
      const ant = porId.get(o.reincidenciaDe!);
      return { ...linhaBase(o), extra: `após ${o.reincidenciaDe} (fechado ${iso(ant?.fechamento ?? null) ?? "?"})` };
    });

  return {
    criticasVencidas,
    abertasVencidas: { total: vencidas.length, itens: abertasVencidasItens },
    duplicatas,
    reincidencias,
  };
}

// ---- Fatos para o chat ----

export function fatosParaChat(t: TriagemResultado, pergunta?: string) {
  const ocs = t.ocorrencias.filter((o) => !o.duplicataDe);
  const hojeIso = iso(DATA_HOJE);
  const abertasHoje = t.ocorrencias.filter((o) => iso(o.abertura) === hojeIso).length;

  const porLinha: Record<string, number> = {};
  const porMes: Record<string, number> = {};
  for (const o of ocs) {
    porLinha[o.linha] = (porLinha[o.linha] ?? 0) + 1;
    if (o.abertura) {
      const m = o.abertura.toISOString().slice(0, 7);
      porMes[m] = (porMes[m] ?? 0) + 1;
    }
  }

  const topReincidencia = executarConsulta(t.ocorrencias, { metrica: "top_reincidencia" }).itens ?? [];

  // Se veio pergunta, roda a consulta determinística e entrega o resultado pronto.
  let consultaDireta: unknown = null;
  if (pergunta) {
    const filtro = interpretarPergunta(pergunta);
    const r = executarConsulta(t.ocorrencias, filtro);
    consultaDireta = { filtro, resposta: r.resposta, valor: r.valor, itens: r.itens };
  }

  return {
    dataHoje: hojeIso,
    prazoCriticaHoras: prazoCriticaHoras(),
    totalOcorrencias: t.ocorrencias.length,
    casosUnicos: ocs.length,
    abertasHoje,
    backlog: t.backlog,
    duplicatas: t.duplicidade.duplicatas,
    reincidencias: t.duplicidade.reincidencias,
    reaberturasIrregulares: t.duplicidade.reaberturasIrregulares,
    volumePorLinha: porLinha,
    volumePorMes: porMes,
    topModelosReincidencia: topReincidencia,
    falhasSistemicasSuspeitas: t.sistemicos.map((c) => ({
      escopo: c.lote ? `${c.modelo} lote ${c.lote}` : c.modelo,
      linha: c.linha,
      serieMensal: c.serieMensal,
      pico: c.nPico,
      mediaMesesAnteriores: c.mediaAnterior,
      sintomaDominante: c.sintomaDominante,
      ufDominante: c.ufDominante,
      custoMedioPeca: c.custoMedio,
    })),
    coberturaSintoma: t.coberturaSintoma,
    consultaDireta,
  };
}

// Mensagens prontas para o Teams (usadas na gaveta dos cartões).
export function mensagensTeams(t: TriagemResultado) {
  const msgs = t.sistemicos.map((c) => alertaFalhaSistemica(c));
  const critico = alertaCriticoVencido(t.backlog);
  if (critico) msgs.push(critico);
  return msgs;
}
