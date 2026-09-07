import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarModelo,
  normalizarParceiro,
  normalizarPrioridade,
  parseData,
} from "../src/lib/normalize.ts";
import { sugerirSintoma, temSinalDeRisco } from "../src/lib/symptoms.ts";

test("parseData entende os 4 formatos da base", () => {
  assert.equal(parseData("2026-07-20")?.getMonth(), 6);
  assert.equal(parseData("20/07/2026")?.getDate(), 20);
  assert.equal(parseData("24-04-2026 08:52")?.getMonth(), 3);
  assert.equal(parseData("2026-05-15 13:35")?.getFullYear(), 2026);
  assert.equal(parseData(""), null);
});

test("normalizarModelo remove hífen e espaço", () => {
  assert.equal(normalizarModelo("GC-L257"), "GCL257");
  assert.equal(normalizarModelo("gc l257"), "GCL257");
  assert.equal(normalizarModelo("GC-B247SLUV"), "GCB247SLUV");
});

test("normalizarParceiro junta grafias diferentes", () => {
  const a = normalizarParceiro("REFRIGERACAO VALE VERDE LTDA");
  const b = normalizarParceiro("Refrig Vale Verde");
  assert.equal(a, b);
  assert.equal(normalizarParceiro("Central Reparos Band."), "bandeirantes");
});

test("normalizarPrioridade infere pela SLA quando vazia", () => {
  assert.equal(normalizarPrioridade("", 72), "Alta");
  assert.equal(normalizarPrioridade("", 120), "Media");
  assert.equal(normalizarPrioridade("", 240), "Baixa");
  assert.equal(normalizarPrioridade("Critica", 72), "Critica");
});

test("sugerirSintoma respeita a linha do produto", () => {
  assert.equal(sugerirSintoma("nao liga de jeito nenhum", "TV"), "NAO_LIGA");
  assert.equal(sugerirSintoma("esquentou tudo dentro", "Geladeira"), "NAO_GELA");
  // NAO_GELA não se aplica a TV: não deve classificar errado
  assert.notEqual(sugerirSintoma("esquentou tudo dentro", "TV"), "NAO_GELA");
});

test("temSinalDeRisco pega palavras de risco", () => {
  assert.equal(temSinalDeRisco("saiu fumaca do aparelho"), true);
  assert.equal(temSinalDeRisco("nao liga"), false);
});
