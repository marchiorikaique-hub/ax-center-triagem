import { test } from "node:test";
import assert from "node:assert/strict";
import type { Ocorrencia } from "../src/lib/types.ts";
import { marcarDuplicidade } from "../src/lib/dedup.ts";
import { detectarSistemico } from "../src/lib/systemic.ts";
import { executarConsulta, interpretarPergunta } from "../src/lib/query.ts";

// Fábrica de ocorrências para os testes (só os campos que importam).
function oc(p: Partial<Ocorrencia>): Ocorrencia {
  return {
    id: "X", abertura: null, fechamento: null, canal: "formulario",
    parceiro: "p", parceiroBruto: "p", uf: "SP", linha: "Geladeira",
    modelo: "M", serie: "S", lote: "", descricao: "", sintomaDeclarado: "",
    sintomaSugerido: "", prioridade: "Media", status: "aberta", slaHoras: 120,
    custo: null, idOrigem: "", prazoHoras: 120, vencida: false, ...p,
  };
}

test("duplicata: mesmo série, canais diferentes, janela curta", () => {
  const ocs = [
    oc({ id: "A", serie: "S1", canal: "email", abertura: new Date(2026, 6, 1) }),
    oc({ id: "B", serie: "S1", canal: "formulario", abertura: new Date(2026, 6, 3) }),
  ];
  marcarDuplicidade(ocs);
  assert.equal(ocs[1].duplicataDe, "A");
  assert.equal(ocs[0].duplicataDe, undefined);
});

test("reincidência: nova abertura após o fechamento anterior", () => {
  const ocs = [
    oc({ id: "A", serie: "S2", abertura: new Date(2026, 3, 1), fechamento: new Date(2026, 3, 10), status: "fechada" }),
    oc({ id: "B", serie: "S2", abertura: new Date(2026, 5, 1) }),
  ];
  marcarDuplicidade(ocs);
  assert.equal(ocs[1].reincidenciaDe, "A");
  assert.equal(ocs[1].duplicataDe, undefined);
});

test("id_origem marca duplicata explicitamente", () => {
  const ocs = [oc({ id: "A", serie: "SA" }), oc({ id: "B", serie: "SB", idOrigem: "A" })];
  marcarDuplicidade(ocs);
  assert.equal(ocs[1].duplicataDe, "A");
});

test("detectarSistemico acende quando o último mês dispara", () => {
  const meses = ["2026-05", "2026-06", "2026-07"];
  const ocs: Ocorrencia[] = [];
  const push = (mes: number, n: number) => {
    for (let i = 0; i < n; i++) ocs.push(oc({ id: `${mes}-${i}`, serie: `s${mes}-${i}`, modelo: "PICO", abertura: new Date(2026, mes, 15) }));
  };
  push(4, 2); // maio: 2
  push(5, 3); // junho: 3
  push(6, 12); // julho: 12 -> dispara
  const cands = detectarSistemico(ocs, meses);
  const pico = cands.find((c) => c.modelo === "PICO" && !c.lote);
  assert.ok(pico, "deveria detectar o modelo PICO");
  assert.equal(pico!.nPico, 12);
});

test("interpretarPergunta extrai linha, mês e região", () => {
  const c = interpretarPergunta("Quantas geladeiras em julho no Nordeste?");
  assert.equal(c.linha, "Geladeira");
  assert.equal(c.mes, 7);
  assert.ok(c.ufs?.includes("PE"));
  assert.equal(c.metrica, "contagem");
});

test("executarConsulta conta com filtro e ignora duplicata", () => {
  const ocs = [
    oc({ id: "A", linha: "TV", abertura: new Date(2026, 7, 1) }),
    oc({ id: "B", linha: "TV", abertura: new Date(2026, 7, 2), duplicataDe: "A" }),
    oc({ id: "C", linha: "Geladeira", abertura: new Date(2026, 7, 2) }),
  ];
  const r = executarConsulta(ocs, { metrica: "contagem", linha: "TV" });
  assert.equal(r.valor, 1); // B é duplicata, não conta
});
