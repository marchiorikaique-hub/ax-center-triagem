// Tipos centrais da triagem. Uma "ocorrência crua" é a linha do CSV como ela vem
// (suja: datas em 4 formatos, nomes bagunçados). A "ocorrência normalizada" é o
// que o resto do sistema usa depois de limpar.

export type Prioridade = "Critica" | "Alta" | "Media" | "Baixa";

export type StatusCanonico =
  | "aberta"
  | "em_atendimento"
  | "aguardando_peca"
  | "reaberta"
  | "fechada";

export type CanalCanonico = "formulario" | "email" | "planilha";

export type Linha =
  | "Geladeira"
  | "Maquina de Lavar"
  | "TV"
  | "Ar-Condicionado"
  | "Monitor";

export interface OcorrenciaCrua {
  id: string;
  data_abertura: string;
  canal: string;
  parceiro: string;
  uf: string;
  linha: string;
  modelo: string;
  serie: string;
  lote: string;
  descricao_cliente: string;
  codigo_sintoma: string;
  prioridade_declarada: string;
  status: string;
  data_fechamento: string;
  sla_horas: string;
  custo_peca_brl: string;
  id_origem: string;
}

export interface Ocorrencia {
  id: string;
  abertura: Date | null;
  fechamento: Date | null;
  canal: CanalCanonico;
  parceiro: string; // nome canônico
  parceiroBruto: string;
  uf: string;
  linha: Linha | string;
  modelo: string; // modelo canônico
  serie: string;
  lote: string;
  descricao: string;
  sintomaDeclarado: string;
  sintomaSugerido: string; // inferido por palavra-chave a partir da descrição
  prioridade: Prioridade | null;
  status: StatusCanonico;
  slaHoras: number | null;
  custo: number | null;
  idOrigem: string;

  // marcações da triagem (preenchidas depois)
  duplicataDe?: string; // id da ocorrência original, se for cópia de outro canal
  reincidenciaDe?: string; // id do atendimento anterior encerrado, na mesma série
  violaReabertura?: boolean; // status "Reaberta" contraria o procedimento
  prazoHoras: number; // prazo efetivo usado no cálculo de SLA
  vencida: boolean; // passou do prazo e ainda não foi fechada
}
