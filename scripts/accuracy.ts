// Mede a acurácia da interpretação de perguntas em linguagem natural (seção g do
// desafio). Compara o filtro produzido com o filtro rotulado à mão em
// eval/casos-rotulados.json. Roda contra a IA se houver OPENAI_API_KEY; senão,
// contra o parser determinístico. Uso: pnpm accuracy
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { interpretar } from "../src/lib/ai.ts";
import type { Consulta } from "../src/lib/query.ts";

interface Caso {
  pergunta: string;
  esperado: Consulta;
}

function ufsIguais(a?: string[], b?: string[]): boolean {
  const sa = new Set(a ?? []);
  const sb = new Set(b ?? []);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function filtrosBatem(got: Consulta, exp: Consulta): boolean {
  return (
    got.metrica === exp.metrica &&
    (got.linha ?? null) === (exp.linha ?? null) &&
    (got.mes ?? null) === (exp.mes ?? null) &&
    (got.prioridade ?? null) === (exp.prioridade ?? null) &&
    Boolean(got.apenasAbertas) === Boolean(exp.apenasAbertas) &&
    ufsIguais(got.ufs, exp.ufs)
  );
}

async function main() {
  const casos: Caso[] = JSON.parse(
    readFileSync(join(process.cwd(), "eval", "casos-rotulados.json"), "utf-8"),
  );
  const modo = process.env.OPENAI_API_KEY ? "IA (OpenAI)" : "determinístico";
  console.log(`\nAvaliando ${casos.length} casos rotulados — modo: ${modo}\n`);

  let acertos = 0;
  for (const caso of casos) {
    const { filtro, via } = await interpretar(caso.pergunta);
    const ok = filtrosBatem(filtro, caso.esperado);
    if (ok) acertos++;
    const marca = ok ? "OK " : "XX ";
    console.log(`${marca}[${via}] ${caso.pergunta}`);
    if (!ok) {
      console.log(`      esperado: ${JSON.stringify(caso.esperado)}`);
      console.log(`      obtido:   ${JSON.stringify(filtro)}`);
    }
  }

  const pct = Math.round((acertos / casos.length) * 100);
  console.log(`\nAcurácia: ${acertos}/${casos.length} (${pct}%)\n`);
}

main();
