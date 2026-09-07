import { carregarTriagem } from "@/lib/dataset";
import { prazoCriticaHoras } from "@/lib/sla";
import AskBox from "./components/AskBox";

export const dynamic = "force-dynamic";

export default function Home() {
  const t = carregarTriagem();
  const { backlog, duplicidade, sistemicos, alertas, coberturaSintoma } = t;
  const totalUnicas = t.ocorrencias.filter((o) => !o.duplicataDe).length;

  return (
    <main className="wrap">
      <header className="top">
        <h1>Triagem de Ocorrências de Campo</h1>
        <p>
          Painel da operação para começar o dia: o que precisa de atenção agora e o
          que pode ser um problema do produto, não da unidade.
        </p>
        <p className="data-hoje">
          Base: {t.ocorrencias.length} ocorrências · {totalUnicas} casos únicos ·
          Data de referência: 01/09/2026 · Prazo crítico assumido: {prazoCriticaHoras()}h
        </p>
      </header>

      <section>
        <h2>O que precisa de atenção hoje</h2>
        <div className="alertas">
          {alertas.map((a, i) => (
            <div key={i} className={`alerta ${a.severidade === "critico" ? "critico" : ""}`}>
              <div className="cab">
                <span className="tt">{a.titulo}</span>
                <span className="tag">→ Teams (prévia)</span>
              </div>
              <pre>{a.mensagem}</pre>
              <div className="len">{a.mensagem.length} / 900 caracteres</div>
            </div>
          ))}
          {alertas.length === 0 && <p className="nota">Nenhum alerta no momento.</p>}
        </div>
      </section>

      <section>
        <h2>Suspeitas de falha sistêmica (olhando o acumulado)</h2>
        {sistemicos.map((c) => {
          const max = Math.max(...c.serieMensal.map((p) => p.n), 1);
          const escopo = c.lote ? `${c.modelo} · lote ${c.lote}` : c.modelo;
          return (
            <div key={`${c.modelo}-${c.lote}`} className="spark-wrap">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <strong>{escopo}</strong>
                <span style={{ color: "var(--ink-dim)" }}>
                  {c.linha} · sintoma: {c.sintomaDominante || "n/d"} · UF: {c.ufDominante}
                </span>
              </div>
              <div className="spark">
                {c.serieMensal.map((p) => (
                  <div
                    key={p.mes}
                    className={`bar ${p.mes === c.mesPico ? "pico" : ""}`}
                    style={{ height: `${(p.n / max) * 100}%` }}
                    title={`${p.mes}: ${p.n}`}
                  >
                    <span>{p.mes.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {sistemicos.length === 0 && <p className="nota">Nenhum padrão acima do limiar.</p>}
        <p className="nota">
          Regra: o mês corrente tem pelo menos o dobro da média dos dois meses
          anteriores e no mínimo 8 casos. Duplicatas não entram na conta.
        </p>
      </section>

      <section>
        <h2>Fila e prazos</h2>
        <div className="kpis">
          <div className="kpi">
            <div className="n">{backlog.abertas}</div>
            <div className="l">Ocorrências abertas</div>
            <div className="s">idade média {backlog.idadeMediaDias} dias</div>
          </div>
          <div className="kpi warn">
            <div className="n">{backlog.vencidas}</div>
            <div className="l">Fora do prazo</div>
          </div>
          <div className="kpi crit">
            <div className="n">{backlog.criticasVencidas}</div>
            <div className="l">Críticas vencidas</div>
            <div className="s">{backlog.criticasAbertas} críticas abertas</div>
          </div>
          <div className="kpi">
            <div className="n">{duplicidade.duplicatas}</div>
            <div className="l">Duplicatas entre canais</div>
            <div className="s">{duplicidade.reincidencias} reincidências</div>
          </div>
        </div>
        <p className="nota">
          {duplicidade.reaberturasIrregulares} ocorrências estão como “Reaberta”, o que
          contraria o procedimento (que manda abrir um caso novo). Ponto para alinhar.
        </p>
      </section>

      <section>
        <h2>Pergunte à base (linguagem natural)</h2>
        <AskBox />
        <p className="nota">
          A IA só traduz a pergunta em um filtro; a contagem é sempre feita pelo
          código, sobre o dado limpo. Sem chave da OpenAI, as perguntas comuns já
          respondem pela regra determinística.
        </p>
      </section>

      <section>
        <h2>Qualidade do campo de sintoma</h2>
        <table className="mini">
          <tbody>
            <tr>
              <td>Preenchido pelo parceiro</td>
              <td>{coberturaSintoma.comCodigo}</td>
            </tr>
            <tr>
              <td>Recuperado pela descrição (regra de texto)</td>
              <td>{coberturaSintoma.recuperadosPorTexto}</td>
            </tr>
            <tr>
              <td>Sem evidência suficiente</td>
              <td>{coberturaSintoma.semEvidencia}</td>
            </tr>
          </tbody>
        </table>
        <p className="nota">
          O código enviado pelo parceiro é pouco confiável, então classificamos o
          sintoma pela descrição, por palavra-chave. Sem IA: as descrições são
          poucas frases repetidas, e regra de texto é auditável.
        </p>
      </section>
    </main>
  );
}
