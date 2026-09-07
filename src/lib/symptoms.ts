// Classificação de sintoma por palavra-chave. É DETERMINÍSTICA de propósito:
// as descrições da base são só ~95 frases repetidas, então regex resolve e é
// auditável. Não jogamos LLM aqui. O campo codigo_sintoma da base é ignorado
// como fonte de verdade (vem vazio em ~43% e errado em ~1 de cada 5 preenchidos).

import type { Linha } from "./types";

interface RegraSintoma {
  codigo: string;
  linhas: Linha[]; // em que linhas esse código é aplicável (da tabela oficial)
  padrao: RegExp;
}

// Ordem importa: regras mais específicas antes das genéricas ("nao liga").
const REGRAS: RegraSintoma[] = [
  { codigo: "NAO_DRENA", linhas: ["Maquina de Lavar"], padrao: /nao drena|nao escoa|fica cheia|nao esvazia/ },
  { codigo: "NAO_CENTRIFUGA", linhas: ["Maquina de Lavar"], padrao: /centrifug/ },
  { codigo: "NAO_GELA", linhas: ["Geladeira"], padrao: /nao gela|nao refriger|esquentou|quente por dentro|parou de gelar|nao esta refrigerando/ },
  { codigo: "TEMP_ALTA_GABINETE", linhas: ["Geladeira"], padrao: /temperatura alta/ },
  { codigo: "RUIDO_COMPRESSOR", linhas: ["Geladeira"], padrao: /compressor/ },
  { codigo: "PORTA_DESALINHADA", linhas: ["Geladeira"], padrao: /porta desalinhada|nao veda|borracha de vedacao/ },
  { codigo: "VAZAMENTO_GAS", linhas: ["Ar-Condicionado"], padrao: /gas refrigerante|vazamento na linha|baixa pressao/ },
  { codigo: "NAO_RESFRIA", linhas: ["Ar-Condicionado"], padrao: /nao resfria|nao gela o ambiente|ar quente|nao esfria o ambiente/ },
  { codigo: "RUIDO_UNIDADE_EXTERNA", linhas: ["Ar-Condicionado"], padrao: /unidade externa/ },
  { codigo: "SEM_AUDIO", linhas: ["TV"], padrao: /sem audio|sem som|audio sumiu|mudo/ },
  { codigo: "TELA_ESCURA", linhas: ["TV", "Monitor"], padrao: /tela escura|sem imagem|tela apagada|nao aparece imagem/ },
  { codigo: "LINHAS_TELA", linhas: ["TV", "Monitor"], padrao: /linhas|manchas|listras/ },
  { codigo: "FLICKER", linhas: ["Monitor"], padrao: /pisca|cintila|flicker|tremul/ },
  { codigo: "SEM_SINAL", linhas: ["Monitor"], padrao: /sem sinal|ausencia de sinal/ },
  { codigo: "ERRO_DISPLAY", linhas: ["Maquina de Lavar", "TV"], padrao: /codigo de erro|erro no display|erro no visor/ },
  { codigo: "CONTROLE_NAO_RESPONDE", linhas: ["TV", "Ar-Condicionado"], padrao: /controle/ },
  { codigo: "VAZAMENTO_AGUA", linhas: ["Geladeira", "Maquina de Lavar"], padrao: /vazamento|vazando|pano embaixo|poca de agua|escorrendo/ },
  { codigo: "NAO_LIGA", linhas: ["Geladeira", "Maquina de Lavar", "TV", "Ar-Condicionado", "Monitor"], padrao: /nao liga|nao acende|morreu|nem a luz/ },
];

/**
 * Sugere um código de sintoma a partir da descrição livre, respeitando a linha
 * do produto. Devolve "" quando não há evidência suficiente (não inventamos).
 */
export function sugerirSintoma(descricao: string, linha: string): string {
  const d = (descricao || "").toLowerCase();
  if (!d.trim()) return "";
  for (const r of REGRAS) {
    if (r.padrao.test(d) && r.linhas.includes(linha as Linha)) return r.codigo;
  }
  return "";
}

// Palavras que indicam risco real (alimentam a sugestão de prioridade crítica).
const RISCO = /fumaca|cheiro de queimado|queimou|faisca|faiscou|choque|fogo|pegou fogo|estouro|estourou|curto/;

export function temSinalDeRisco(descricao: string): boolean {
  return RISCO.test((descricao || "").toLowerCase());
}
