import { NextResponse } from "next/server";
import { enviarParaTeams, type Alerta } from "@/lib/alerts";

// Envio ao Teams. Hoje é simulado (não há webhook do workspace ainda). Quando
// houver o fluxo do Teams Workflows, troca-se enviarParaTeams por um fetch real.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const alerta = body?.alerta as Alerta | undefined;
  if (!alerta?.mensagem) {
    return NextResponse.json({ erro: "Alerta ausente." }, { status: 400 });
  }
  const r = await enviarParaTeams(alerta);
  return NextResponse.json({ ...r, simulado: true });
}
