import { NextResponse } from "next/server";
import { carregarTriagem } from "@/lib/dataset";
import { executarConsulta } from "@/lib/query";
import { interpretar } from "@/lib/ai";

export async function POST(req: Request) {
  const { pergunta } = await req.json().catch(() => ({ pergunta: "" }));
  if (!pergunta || typeof pergunta !== "string") {
    return NextResponse.json({ erro: "Pergunta vazia." }, { status: 400 });
  }

  const { ocorrencias } = carregarTriagem();
  const { filtro, via } = await interpretar(pergunta);
  const resultado = executarConsulta(ocorrencias, filtro);

  return NextResponse.json({ ...resultado, via });
}
