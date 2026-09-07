// Limpeza determinística da base. Aqui mora a decisão de "não confiar no dado".
// Cada canal grava de um jeito, então padronizamos antes de qualquer contagem.

import type {
  CanalCanonico,
  OcorrenciaCrua,
  Prioridade,
  StatusCanonico,
} from "./types";

/** Aceita os 4 formatos de data que aparecem na base. Devolve Date ou null. */
export function parseData(bruto: string): Date | null {
  const s = (bruto || "").trim();
  if (!s) return null;
  // 2026-07-20  ou  2026-07-20 13:49
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  // 20/07/2026
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  // 24-04-2026 08:52
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  return null;
}

export function normalizarCanal(bruto: string): CanalCanonico {
  const c = (bruto || "").toLowerCase();
  if (c.includes("form")) return "formulario";
  if (c.includes("mail")) return "email";
  return "planilha";
}

export function normalizarStatus(bruto: string): StatusCanonico {
  const s = (bruto || "").toLowerCase().replace(/\s+/g, "_");
  if (s.startsWith("fechad")) return "fechada";
  if (s.startsWith("reabert")) return "reaberta";
  if (s.startsWith("em_atend")) return "em_atendimento";
  if (s.startsWith("aguardando")) return "aguardando_peca";
  if (s.startsWith("abert")) return "aberta";
  return "aberta";
}

/** Modelo: remove hífen/espaço e sobe pra maiúscula. "GC-L257" == "gc l257". */
export function normalizarModelo(bruto: string): string {
  return (bruto || "").toUpperCase().replace(/[-\s]/g, "");
}

const CHAVES_PARCEIRO = [
  "vale verde",
  "bandeirantes",
  "sul service",
  "prisma",
  "nordeste",
  "norte eletro",
  "megatec",
  "atlas",
  "tecnoar",
  "andrade",
  "oficina digital",
  "silva",
];

// Abreviações que a rede usa e que precisam virar a palavra inteira antes de
// procurar a raiz do nome (ex.: "Central Reparos Band." -> bandeirantes).
const ABREV: Record<string, string> = {
  band: "bandeirantes",
  refrig: "refrigeracao",
  assist: "assistencia",
};

/** Parceiro: 37 grafias viram ~12 nomes canônicos por palavra-raiz. */
export function normalizarParceiro(bruto: string): string {
  let p = (bruto || "").toLowerCase().replace(/[.,]/g, " ");
  p = p.replace(/\b(ltda|sa|s\/a|me|eireli)\b/g, " ");
  p = p
    .split(/\s+/)
    .map((w) => ABREV[w] ?? w)
    .join(" ");
  for (const chave of CHAVES_PARCEIRO) {
    if (p.includes(chave)) return chave;
  }
  return p.replace(/\s+/g, " ").trim();
}

const MAP_PRIORIDADE: Record<string, Prioridade> = {
  critica: "Critica",
  alta: "Alta",
  media: "Media",
  baixa: "Baixa",
};

/**
 * Prioridade. Quando vem em branco (226 linhas), inferimos pelo sla_horas,
 * que é consistente para Alta/Média/Baixa: 72->Alta, 120->Média, 240->Baixa.
 */
export function normalizarPrioridade(
  bruto: string,
  slaHoras: number | null,
): Prioridade | null {
  const p = MAP_PRIORIDADE[(bruto || "").toLowerCase().trim()];
  if (p) return p;
  if (slaHoras === 72) return "Alta";
  if (slaHoras === 120) return "Media";
  if (slaHoras === 240) return "Baixa";
  return null;
}

export function parseNumero(bruto: string): number | null {
  const s = (bruto || "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
