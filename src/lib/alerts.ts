// Geração de alertas. A coordenação começa o dia no Teams e só lê mensagem curta
// (até 900 caracteres). Então NÃO alertamos chamado comum: só o que importa de
// manhã: (1) suspeita de falha sistêmica, (2) crítico vencido, (3) backlog em
// nível perigoso. O envio ao Teams fica atrás de um adaptador (stub) porque não
// há acesso ao workspace ainda; a mensagem já sai pronta e dentro do limite.

import type { ResumoBacklog } from "./sla";
import type { CandidatoSistemico } from "./systemic";

export type Severidade = "critico" | "alto" | "atencao";

export interface Alerta {
  tipo: "falha_sistemica" | "critico_vencido" | "backlog";
  severidade: Severidade;
  titulo: string;
  mensagem: string; // pronta para o Teams, <= 900 caracteres
}

const LIMITE_TEAMS = 900;

function cortar(s: string): string {
  return s.length <= LIMITE_TEAMS ? s : s.slice(0, LIMITE_TEAMS - 1) + "…";
}

export function alertaFalhaSistemica(c: CandidatoSistemico): Alerta {
  const linha = c.serieMensal.map((p) => `${p.mes.slice(5)}:${p.n}`).join(" ");
  const escopo = c.lote ? `${c.modelo} lote ${c.lote}` : c.modelo;
  const custo = c.custoMedio ? ` Custo médio de peça R$ ${c.custoMedio}.` : "";
  const msg =
    `Possível falha sistêmica — ${c.linha} ${escopo}\n` +
    `Volume no mês de ${c.mesPico}: ${c.nPico} casos (média dos 2 meses anteriores: ${c.mediaAnterior}).\n` +
    `Sintoma predominante: ${c.sintomaDominante || "não classificado"}. UF concentrada: ${c.ufDominante}.\n` +
    `Série mensal: ${linha}.${custo}\n` +
    `Sugestão: avaliar encaminhamento à Qualidade antes que o volume cresça mais.`;
  return {
    tipo: "falha_sistemica",
    severidade: "critico",
    titulo: `Falha sistêmica suspeita: ${escopo}`,
    mensagem: cortar(msg),
  };
}

export function alertaCriticoVencido(b: ResumoBacklog): Alerta | null {
  if (b.criticasVencidas === 0) return null;
  const msg =
    `Crítico fora do prazo — ${b.criticasVencidas} ocorrência(s) crítica(s) já passaram do prazo de atendimento.\n` +
    `Total de críticas abertas: ${b.criticasAbertas}.\n` +
    `Ação: priorizar hoje. Estas não podem esperar a fila normal.`;
  return {
    tipo: "critico_vencido",
    severidade: "critico",
    titulo: `${b.criticasVencidas} crítico(s) vencido(s)`,
    mensagem: cortar(msg),
  };
}

export function alertaBacklog(b: ResumoBacklog): Alerta | null {
  if (b.vencidas < 50) return null; // só quando o acúmulo já é perigoso
  const msg =
    `Backlog em nível de atenção — ${b.abertas} ocorrências abertas, ${b.vencidas} já fora do prazo.\n` +
    `Idade média das abertas: ${b.idadeMediaDias} dias.\n` +
    `Ação: revisar dimensionamento da triagem. A fila está crescendo mais rápido do que o atendimento.`;
  return {
    tipo: "backlog",
    severidade: "alto",
    titulo: `Backlog: ${b.vencidas} fora do prazo`,
    mensagem: cortar(msg),
  };
}

export function montarAlertas(
  backlog: ResumoBacklog,
  sistemicos: CandidatoSistemico[],
): Alerta[] {
  const alertas: Alerta[] = [];
  for (const c of sistemicos) alertas.push(alertaFalhaSistemica(c));
  const critico = alertaCriticoVencido(backlog);
  if (critico) alertas.push(critico);
  const bk = alertaBacklog(backlog);
  if (bk) alertas.push(bk);
  return alertas;
}

/**
 * Adaptador de envio. Hoje só registra (o Teams entra quando houver o webhook
 * do Workflows). Trocar esta função por um fetch ao connector no futuro.
 */
export async function enviarParaTeams(a: Alerta): Promise<{ enviado: boolean; canal: string }> {
  return { enviado: false, canal: "stub:teams-workflows-pendente" };
}
