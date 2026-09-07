import { NextResponse } from "next/server";
import { carregarTriagem } from "@/lib/dataset";
import { responderChat, type Turno } from "@/lib/chat";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const turnos: Turno[] = Array.isArray(body?.turnos) ? body.turnos.slice(-8) : [];
  if (!turnos.some((x) => x.autor === "user" && x.texto?.trim())) {
    return NextResponse.json({ erro: "Pergunta vazia." }, { status: 400 });
  }
  const t = carregarTriagem();
  const resposta = await responderChat(t, turnos);
  return NextResponse.json(resposta);
}
