// Prazo e SLA. Ponto sensível: para a prioridade Crítica há TRÊS números na mesa
// (e-mail=24h, procedimento=48h, base=72h). Não escolhemos no escuro: o prazo
// crítico é configurável (SLA_CRITICA_HORAS) e default 24 (o que a coordenação
// cobra da rede). Alta/Média/Baixa usam o sla_horas da base, que é consistente.

import type { Ocorrencia, Prioridade } from "./types";

export const DATA_HOJE = new Date(2026, 8, 1); // 01/09/2026, conforme o desafio.

export function prazoCriticaHoras(): number {
  const v = Number(process.env.SLA_CRITICA_HORAS);
  return Number.isFinite(v) && v > 0 ? v : 24;
}

const PRAZO_PADRAO: Record<Prioridade, number> = {
  Critica: 24, // sobrescrito por prazoCriticaHoras()
  Alta: 72,
  Media: 120,
  Baixa: 240,
};

/** Prazo efetivo em horas para uma ocorrência. */
export function prazoHoras(o: Ocorrencia): number {
  if (o.prioridade === "Critica") return prazoCriticaHoras();
  if (o.prioridade) return o.slaHoras ?? PRAZO_PADRAO[o.prioridade];
  return o.slaHoras ?? 240; // sem prioridade e sem sla: trata como baixa
}

const MS_HORA = 3600_000;

/** Está vencida = passou do prazo e ainda não foi fechada. */
export function estaVencida(o: Ocorrencia, hoje = DATA_HOJE): boolean {
  if (o.status === "fechada") return false;
  if (!o.abertura) return false;
  const horas = (hoje.getTime() - o.abertura.getTime()) / MS_HORA;
  return horas > o.prazoHoras;
}

export interface ResumoBacklog {
  abertas: number;
  vencidas: number;
  criticasAbertas: number;
  criticasVencidas: number;
  idadeMediaDias: number;
}

export function resumoBacklog(ocs: Ocorrencia[], hoje = DATA_HOJE): ResumoBacklog {
  const abertas = ocs.filter((o) => o.status !== "fechada");
  const idades = abertas
    .filter((o) => o.abertura)
    .map((o) => (hoje.getTime() - o.abertura!.getTime()) / (24 * MS_HORA));
  const criticas = abertas.filter((o) => o.prioridade === "Critica");
  return {
    abertas: abertas.length,
    vencidas: abertas.filter((o) => o.vencida).length,
    criticasAbertas: criticas.length,
    criticasVencidas: criticas.filter((o) => o.vencida).length,
    idadeMediaDias: idades.length
      ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length)
      : 0,
  };
}
