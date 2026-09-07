// Carrega o CSV do disco, normaliza tudo e roda o pipeline de triagem uma vez.
// É server-only: o navegador nunca vê a base crua, só os números agregados.
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Ocorrencia, OcorrenciaCrua } from "./types";
import {
  normalizarCanal,
  normalizarModelo,
  normalizarParceiro,
  normalizarPrioridade,
  normalizarStatus,
  parseData,
  parseNumero,
} from "./normalize";
import { sugerirSintoma } from "./symptoms";
import { marcarDuplicidade, resumoDuplicidade } from "./dedup";
import { estaVencida, prazoHoras, resumoBacklog } from "./sla";
import { detectarSistemico } from "./systemic";
import { montarAlertas } from "./alerts";

/** Parser de CSV com aspas (as descrições têm vírgula dentro de aspas). */
function parseCsv(texto: string): OcorrenciaCrua[] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }

  const [cabecalho, ...corpo] = linhas.filter((l) => l.length > 1);
  return corpo.map((cols) => {
    const o = {} as Record<string, string>;
    cabecalho.forEach((h, i) => (o[h] = (cols[i] ?? "").trim()));
    return o as unknown as OcorrenciaCrua;
  });
}

function normalizar(cru: OcorrenciaCrua): Ocorrencia {
  const slaHoras = parseNumero(cru.sla_horas);
  const o: Ocorrencia = {
    id: cru.id,
    abertura: parseData(cru.data_abertura),
    fechamento: parseData(cru.data_fechamento),
    canal: normalizarCanal(cru.canal),
    parceiro: normalizarParceiro(cru.parceiro),
    parceiroBruto: cru.parceiro,
    uf: cru.uf,
    linha: cru.linha,
    modelo: normalizarModelo(cru.modelo),
    serie: cru.serie,
    lote: cru.lote,
    descricao: cru.descricao_cliente,
    sintomaDeclarado: cru.codigo_sintoma,
    sintomaSugerido: sugerirSintoma(cru.descricao_cliente, cru.linha),
    prioridade: normalizarPrioridade(cru.prioridade_declarada, slaHoras),
    status: normalizarStatus(cru.status),
    slaHoras,
    custo: parseNumero(cru.custo_peca_brl),
    idOrigem: cru.id_origem,
    prazoHoras: 0,
    vencida: false,
  };
  o.prazoHoras = prazoHoras(o);
  o.vencida = estaVencida(o);
  return o;
}

let cache: TriagemResultado | null = null;

export interface TriagemResultado {
  ocorrencias: Ocorrencia[];
  meses: string[];
  backlog: ReturnType<typeof resumoBacklog>;
  duplicidade: ReturnType<typeof resumoDuplicidade>;
  sistemicos: ReturnType<typeof detectarSistemico>;
  alertas: ReturnType<typeof montarAlertas>;
  coberturaSintoma: { comCodigo: number; recuperadosPorTexto: number; semEvidencia: number };
}

export function carregarTriagem(): TriagemResultado {
  if (cache) return cache;
  const csv = readFileSync(join(process.cwd(), "dados", "ocorrencias.csv"), "utf-8");
  const ocs = parseCsv(csv).map(normalizar);

  marcarDuplicidade(ocs);
  for (const o of ocs) o.vencida = estaVencida(o); // recalcula após prazo definido

  const meses = [...new Set(ocs.filter((o) => o.abertura).map((o) => {
    const d = o.abertura!;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }))].sort();

  const backlog = resumoBacklog(ocs);
  const duplicidade = resumoDuplicidade(ocs);
  const sistemicos = detectarSistemico(ocs, meses);
  const alertas = montarAlertas(backlog, sistemicos);

  const comCodigo = ocs.filter((o) => o.sintomaDeclarado).length;
  const semCodigo = ocs.filter((o) => !o.sintomaDeclarado);
  const recuperadosPorTexto = semCodigo.filter((o) => o.sintomaSugerido).length;

  cache = {
    ocorrencias: ocs,
    meses,
    backlog,
    duplicidade,
    sistemicos,
    alertas,
    coberturaSintoma: {
      comCodigo,
      recuperadosPorTexto,
      semEvidencia: semCodigo.length - recuperadosPorTexto,
    },
  };
  return cache;
}
