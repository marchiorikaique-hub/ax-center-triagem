"use client";

import { useState } from "react";

interface Resposta {
  resposta: string;
  via: "ia" | "deterministico";
  itens?: { rotulo: string; valor: number }[];
}

const SUGESTOES = [
  "Quantas ocorrências de geladeira em julho no Nordeste?",
  "Quais modelos têm mais reincidência?",
  "Quantos chamados críticos abertos?",
  "O que mais cresceu no último mês?",
];

export default function AskBox() {
  const [pergunta, setPergunta] = useState("");
  const [resp, setResp] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function perguntar(texto: string) {
    if (!texto.trim()) return;
    setCarregando(true);
    setResp(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto }),
      });
      setResp(await r.json());
    } catch {
      setResp({ resposta: "Não consegui responder agora.", via: "deterministico" });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="ask">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(pergunta);
        }}
      >
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunte em português: quantas geladeiras em julho no Nordeste?"
          aria-label="Pergunta sobre a base"
        />
        <button type="submit" disabled={carregando}>
          {carregando ? "..." : "Perguntar"}
        </button>
      </form>

      {resp && (
        <div className="resp">
          <div className="txt">{resp.resposta}</div>
          {resp.itens && resp.itens.length > 0 && (
            <table className="mini" style={{ marginTop: 10 }}>
              <tbody>
                {resp.itens.map((i) => (
                  <tr key={i.rotulo}>
                    <td>{i.rotulo}</td>
                    <td>{i.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="via">
            interpretado por: {resp.via === "ia" ? "IA (OpenAI)" : "regra determinística"}
          </div>
        </div>
      )}

      <div className="sugestoes">
        {SUGESTOES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setPergunta(s);
              perguntar(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
