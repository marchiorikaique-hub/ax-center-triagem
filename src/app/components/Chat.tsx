"use client";

import { useRef, useState } from "react";
import { IconEnviar } from "./icons";

interface Turno {
  autor: "user" | "bot";
  texto: string;
  via?: "ia" | "deterministico";
}

const SUGESTOES = [
  "Quantos chamados abertos em julho?",
  "Quais modelos têm mais reincidência?",
  "O que devemos priorizar agora?",
];

export default function Chat() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || carregando) return;
    const novos: Turno[] = [...turnos, { autor: "user", texto: q }];
    setTurnos(novos);
    setTexto("");
    setCarregando(true);
    setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 40);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnos: novos.map((t) => ({ autor: t.autor, texto: t.texto })) }),
      });
      const data = await r.json();
      setTurnos([...novos, { autor: "bot", texto: data.texto ?? data.erro ?? "Não consegui responder.", via: data.via }]);
    } catch {
      setTurnos([...novos, { autor: "bot", texto: "Não consegui responder agora. Tente de novo." }]);
    } finally {
      setCarregando(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 40);
    }
  }

  return (
    <section className="chat" aria-label="Pergunte à base">
      <div className="head">
        <h2>Pergunte à base</h2>
        <p>Escreva como falaria com um colega. A resposta vem da base de ocorrências.</p>
      </div>

      <div className="thread">
        {turnos.length === 0 && !carregando && (
          <div className="vazio">
            <strong>Converse com a base</strong>
            Ex.: quantos chamados abertos em julho? · quais modelos têm reincidência? ·
            o que devemos priorizar?
          </div>
        )}
        {turnos.map((t, i) =>
          t.autor === "user" ? (
            <div key={i} className="msg user">{t.texto}</div>
          ) : (
            <div key={i} className="msg bot">
              <div className="who">Assistente da triagem</div>
              <div className="body">{t.texto}</div>
              {t.via === "deterministico" && <span className="tag">resposta por regra (IA indisponível)</span>}
            </div>
          ),
        )}
        {carregando && (
          <div className="msg bot">
            <div className="who">Assistente da triagem</div>
            <div className="typing" aria-label="digitando"><i /><i /><i /></div>
          </div>
        )}
        <div ref={fim} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: quantas ocorrências críticas estão abertas?"
          aria-label="Sua pergunta"
          autoComplete="off"
        />
        <button type="submit" disabled={carregando || !texto.trim()}>
          <IconEnviar size={15} /> Enviar
        </button>
      </form>

      {turnos.length === 0 && (
        <div className="chips">
          {SUGESTOES.map((s) => (
            <button key={s} type="button" onClick={() => enviar(s)}>{s}</button>
          ))}
        </div>
      )}
    </section>
  );
}
