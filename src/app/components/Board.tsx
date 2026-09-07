"use client";

import { useState } from "react";
import {
  IconAlerta, IconRelogio, IconCopia, IconRepetir, IconChevron, IconEnviar, IconOk,
} from "./icons";

interface LinhaLista {
  id: string; modelo: string; uf: string; linha: string;
  prioridade: string; abertura: string | null; diasAberto: number; extra?: string;
}
interface Alerta { tipo: string; severidade: string; titulo: string; mensagem: string; }
interface Sistemico {
  modelo: string; lote: string | null; linha: string;
  serieMensal: { mes: string; n: number }[]; mesPico: string; nPico: number;
  mediaAnterior: number; sintomaDominante: string; ufDominante: string; custoMedio: number | null;
}
export interface BoardProps {
  backlog: { abertas: number; vencidas: number; criticasAbertas: number; criticasVencidas: number; idadeMediaDias: number; indeterminadas: number; relogioIncerto: number };
  prazoCritica: number;
  duplicidade: { duplicatas: number; reincidencias: number };
  listas: {
    criticasVencidas: LinhaLista[];
    abertasVencidas: { total: number; itens: LinhaLista[] };
    duplicatas: LinhaLista[];
    reincidencias: LinhaLista[];
  };
  sistemicos: Sistemico[];
  mensagens: Alerta[];
}

type Aba = "sistemica" | "criticas" | "vencidas" | "duplicatas" | "reincidencias";

export default function Board(p: BoardProps) {
  const [aberta, setAberta] = useState<Aba | null>("sistemica");
  const toggle = (a: Aba) => setAberta((cur) => (cur === a ? null : a));

  const cards: { aba: Aba; classe: string; icon: React.ReactNode; label: string; n: number; sub?: string }[] = [
    { aba: "sistemica", classe: "alert", icon: <IconAlerta size={15} />, label: "Falha sistêmica suspeita", n: p.sistemicos.length, sub: "modelos com volume disparando" },
    { aba: "criticas", classe: "alert", icon: <IconAlerta size={15} />, label: "Críticas vencidas", n: p.backlog.criticasVencidas, sub: `${p.backlog.criticasAbertas} críticas abertas` },
    { aba: "vencidas", classe: "warnv", icon: <IconRelogio size={15} />, label: "Abertas fora do prazo", n: p.backlog.vencidas, sub: `prazo crítico usado: ${p.prazoCritica}h` },
    { aba: "duplicatas", classe: "", icon: <IconCopia size={15} />, label: "Duplicatas entre canais", n: p.duplicidade.duplicatas, sub: "mesmo caso em 2 canais" },
    { aba: "reincidencias", classe: "", icon: <IconRepetir size={15} />, label: "Reincidências", n: p.duplicidade.reincidencias, sub: "voltou após fechar" },
  ];

  return (
    <section className="board">
      <h3>O que precisa de atenção hoje</h3>
      <div className="cards">
        {cards.map((c) => (
          <button
            key={c.aba}
            className={`card ${c.classe}`}
            aria-expanded={aberta === c.aba}
            onClick={() => toggle(c.aba)}
          >
            <div className="top"><span className="ic">{c.icon}</span><span className="label">{c.label}</span></div>
            <div className="n">{c.n}</div>
            {c.sub && <div className="sub">{c.sub}</div>}
            <span className="chev"><IconChevron size={16} /></span>
          </button>
        ))}
      </div>

      {(p.backlog.indeterminadas > 0 || p.backlog.relogioIncerto > 0) && (
        <p className="note">
          Sobre o prazo: o relógio conta a partir da data de abertura, e nem toda
          abertura é confiável. {p.backlog.indeterminadas} ocorrências abertas estão
          sem data de abertura válida, então ficam de fora da conta de vencidas (não
          são “em dia”, são indeterminadas). Outras {p.backlog.relogioIncerto} estão
          como “Reaberta” sem a data do reinício, então o prazo delas é uma
          estimativa pelo original.
        </p>
      )}

      {aberta === "sistemica" && <PainelSistemica sistemicos={p.sistemicos} mensagens={p.mensagens} />}
      {aberta === "criticas" && (
        <Painel titulo="Críticas fora do prazo" total={p.listas.criticasVencidas.length}>
          <Tabela linhas={p.listas.criticasVencidas} />
          <Mensagens mensagens={p.mensagens.filter((m) => m.tipo === "critico_vencido")} />
        </Painel>
      )}
      {aberta === "vencidas" && (
        <Painel titulo="Ocorrências abertas fora do prazo" total={p.listas.abertasVencidas.total} nota={`prazo crítico usado: ${p.prazoCritica}h`}>
          <Tabela linhas={p.listas.abertasVencidas.itens} truncadoEm={p.listas.abertasVencidas.total} />
        </Painel>
      )}
      {aberta === "duplicatas" && (
        <Painel titulo="Duplicatas entre canais" total={p.listas.duplicatas.length}>
          <Tabela linhas={p.listas.duplicatas} mostrarExtra />
        </Painel>
      )}
      {aberta === "reincidencias" && (
        <Painel titulo="Reincidências" total={p.listas.reincidencias.length}>
          <Tabela linhas={p.listas.reincidencias} mostrarExtra />
        </Painel>
      )}
    </section>
  );
}

function Painel({ titulo, total, nota, children }: { titulo: string; total: number; nota?: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="phead">
        <h4>{titulo}</h4>
        <span className="count">{total} {nota ? `· ${nota}` : ""}</span>
      </div>
      {children}
    </div>
  );
}

function Tabela({ linhas, mostrarExtra, truncadoEm }: { linhas: LinhaLista[]; mostrarExtra?: boolean; truncadoEm?: number }) {
  if (linhas.length === 0) return <p style={{ padding: "16px 20px", color: "var(--ink-3)", fontSize: 13 }}>Nada aqui no momento.</p>;
  return (
    <div className="scroll">
      <table className="tbl">
        <thead>
          <tr>
            <th>Ocorrência</th><th>Modelo</th><th>Linha</th><th>UF</th>
            {mostrarExtra ? <th>Vínculo</th> : <th>Prioridade</th>}
            <th style={{ textAlign: "right" }}>Dias aberta</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id}>
              <td className="mut">{l.id}</td>
              <td>{l.modelo}</td>
              <td className="mut">{l.linha}</td>
              <td className="mut">{l.uf}</td>
              {mostrarExtra ? (
                <td className="mut">{l.extra}</td>
              ) : (
                <td>{l.prioridade === "Critica" ? <span className="pill crit">Crítica</span> : l.prioridade}</td>
              )}
              <td className="num">{l.diasAberto}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {truncadoEm && truncadoEm > linhas.length && (
        <p style={{ padding: "10px 20px", color: "var(--ink-3)", fontSize: 12 }}>
          Mostrando as {linhas.length} mais antigas de {truncadoEm}.
        </p>
      )}
    </div>
  );
}

function PainelSistemica({ sistemicos, mensagens }: { sistemicos: Sistemico[]; mensagens: Alerta[] }) {
  if (sistemicos.length === 0) {
    return <div className="panel"><p style={{ padding: "18px 20px", color: "var(--ink-3)", fontSize: 13 }}>Nenhum modelo acima do limiar de alerta.</p></div>;
  }
  return (
    <div className="panel">
      <div className="phead">
        <h4>Modelos com volume disparando</h4>
        <span className="count">o mês corrente passou do dobro da média dos 2 anteriores</span>
      </div>
      <div style={{ padding: "16px 20px 4px" }}>
        {sistemicos.map((c) => {
          const escopo = c.lote ? `${c.modelo} · lote ${c.lote}` : c.modelo;
          const max = Math.max(...c.serieMensal.map((s) => s.n), 1);
          return (
            <div key={`${c.modelo}-${c.lote}`} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 2 }}>
                <strong style={{ fontWeight: 600 }}>{c.linha} · {escopo}</strong>
                <span style={{ color: "var(--ink-3)" }}>
                  sintoma: {c.sintomaDominante || "n/d"} · UF: {c.ufDominante}{c.custoMedio ? ` · peça R$ ${c.custoMedio}` : ""}
                </span>
              </div>
              <div className="spark">
                {c.serieMensal.map((s) => (
                  <div key={s.mes} className={`bar ${s.mes === c.mesPico ? "pk" : ""}`} style={{ height: `${(s.n / max) * 100}%` }} title={`${s.mes}: ${s.n}`}>
                    <b>{s.n}</b><span>{s.mes.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Mensagens mensagens={mensagens.filter((m) => m.tipo === "falha_sistemica")} />
    </div>
  );
}

function Mensagens({ mensagens }: { mensagens: Alerta[] }) {
  if (mensagens.length === 0) return null;
  return (
    <div className="alerts">
      {mensagens.map((m, i) => <MsgTeams key={i} alerta={m} />)}
    </div>
  );
}

function MsgTeams({ alerta }: { alerta: Alerta }) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok">("idle");
  async function enviar() {
    setEstado("enviando");
    try {
      await fetch("/api/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alerta }) });
      setEstado("ok");
    } catch {
      setEstado("idle");
    }
  }
  return (
    <div className={`tmsg ${alerta.severidade === "critico" ? "" : "warn"}`}>
      <div className="m-top"><span className="dot" /><span className="m-title">{alerta.titulo}</span></div>
      <div className="m-body">{alerta.mensagem}</div>
      <div className="m-foot">
        <span className="len">{alerta.mensagem.length} / 900 caracteres</span>
        {estado === "ok" ? (
          <span className="send done"><IconOk size={14} /> Enviado (simulação)</span>
        ) : (
          <button className="send" onClick={enviar} disabled={estado === "enviando"}>
            <IconEnviar size={14} /> {estado === "enviando" ? "Enviando…" : "Enviar ao Teams"}
          </button>
        )}
      </div>
    </div>
  );
}
