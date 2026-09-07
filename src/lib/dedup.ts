// Duplicata x reincidência. Duas coisas diferentes que a base mistura:
//  - Duplicata: o MESMO atendimento entrando por dois canais em poucos dias.
//    Isso infla a contagem e não deve virar dois casos.
//  - Reincidência: um atendimento NOVO na mesma série, depois que o anterior
//    já foi fechado. É outro caso e DEVE contar; o procedimento manda abrir separado.
//
// Cuidado com a coluna id_origem: ela NÃO liga só duplicata de canal — também
// aponta o atendimento anterior de uma reincidência. Por isso não a tratamos
// como duplicata de forma cega: classificamos o par pelo tempo e pelo canal.

import type { Ocorrencia } from "./types";

const MS_DIA = 24 * 3600_000;
const JANELA_DUPLICATA_DIAS = 7;

/**
 * Classifica o par (anterior, atual) de forma mutuamente exclusiva.
 * Reincidência tem prioridade sobre duplicata.
 */
function classificarPar(ant: Ocorrencia, at: Ocorrencia): void {
  if (at.duplicataDe || at.reincidenciaDe) return;
  if (!ant.abertura || !at.abertura) return;
  const dias = (at.abertura.getTime() - ant.abertura.getTime()) / MS_DIA;

  if (ant.fechamento && at.abertura > ant.fechamento) {
    at.reincidenciaDe = ant.id; // novo atendimento depois do anterior encerrar
  } else if (dias <= JANELA_DUPLICATA_DIAS) {
    at.duplicataDe = ant.id; // mesma janela curta = mesmo problema reentrando
  }
}

/**
 * Marca duplicataDe, reincidenciaDe e violaReabertura in-place.
 * Retorna o mesmo array para encadear.
 */
export function marcarDuplicidade(ocs: Ocorrencia[]): Ocorrencia[] {
  const porId = new Map(ocs.map((o) => [o.id, o]));
  for (const o of ocs) if (o.status === "reaberta") o.violaReabertura = true;

  // 1) Pela série: ordena por abertura e classifica pares consecutivos.
  const porSerie = new Map<string, Ocorrencia[]>();
  for (const o of ocs) {
    if (!o.serie) continue;
    (porSerie.get(o.serie) ?? porSerie.set(o.serie, []).get(o.serie)!).push(o);
  }
  for (const grupo of porSerie.values()) {
    if (grupo.length < 2) continue;
    grupo.sort((a, b) => (a.abertura?.getTime() ?? 0) - (b.abertura?.getTime() ?? 0));
    for (let i = 1; i < grupo.length; i++) classificarPar(grupo[i - 1], grupo[i]);
  }

  // 2) Pela coluna id_origem: só para o que a série não pegou (série diferente,
  //    registro isolado). Vínculo explícito sem sinal temporal vira duplicata.
  for (const o of ocs) {
    if (o.duplicataDe || o.reincidenciaDe) continue;
    const orig = o.idOrigem ? porId.get(o.idOrigem) : undefined;
    if (!orig) continue;
    classificarPar(orig, o);
    if (!o.duplicataDe && !o.reincidenciaDe) o.duplicataDe = orig.id;
  }

  return ocs;
}

export interface ResumoDuplicidade {
  duplicatas: number;
  reincidencias: number;
  reaberturasIrregulares: number;
}

export function resumoDuplicidade(ocs: Ocorrencia[]): ResumoDuplicidade {
  return {
    duplicatas: ocs.filter((o) => o.duplicataDe).length,
    reincidencias: ocs.filter((o) => o.reincidenciaDe).length,
    reaberturasIrregulares: ocs.filter((o) => o.violaReabertura).length,
  };
}
