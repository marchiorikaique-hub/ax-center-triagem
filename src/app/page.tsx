import { carregarTriagem } from "@/lib/dataset";
import { prazoCriticaHoras } from "@/lib/sla";
import { construirListas, mensagensTeams } from "@/lib/facts";
import Chat from "./components/Chat";
import Board from "./components/Board";

export const dynamic = "force-dynamic";

export default function Home() {
  const t = carregarTriagem();
  const listas = construirListas(t.ocorrencias);
  const mensagens = mensagensTeams(t);
  const unicos = t.ocorrencias.length - t.duplicidade.duplicatas;

  return (
    <main className="wrap">
      <header className="masthead">
        <div>
          <h1>Triagem de Ocorrências de Campo</h1>
          <p>Comece o dia perguntando à base e veja o que pode ser um problema do produto, não da unidade.</p>
        </div>
        <div className="meta">
          <div>Referência <b>01/09/2026</b></div>
          <div><b>{t.ocorrencias.length.toLocaleString("pt-BR")}</b> ocorrências</div>
          <div><b>{unicos.toLocaleString("pt-BR")}</b> casos únicos</div>
        </div>
      </header>

      <Chat />

      <Board
        backlog={t.backlog}
        prazoCritica={prazoCriticaHoras()}
        duplicidade={t.duplicidade}
        listas={listas}
        sistemicos={t.sistemicos}
        mensagens={mensagens}
      />

      <p className="note">
        Como funciona: a limpeza da base, a separação de duplicata e reincidência, o
        prazo e a detecção de falha sistêmica são feitos por regra determinística. A
        inteligência artificial entra só na conversa acima, para entender a pergunta e
        responder em linguagem natural. Quem conta é sempre o código, então nenhum
        número é inventado. Os alertas saem prontos para o Teams; o envio de verdade
        entra quando houver o acesso ao canal.
      </p>
    </main>
  );
}
