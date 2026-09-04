export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  perfil: 'admin' | 'profissional';
  ativo: boolean;
  foto?: string;
  senha?: string;
  servicos_habilitados?: string[]; // IDs dos serviços que esta profissional realiza
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  aniversario?: string; // YYYY-MM-DD
  observacoes?: string;
  alergias?: string;
  preferencias?: {
    formato?: string; // Quadrada, Amendoada, Stiletto, etc.
    tamanho?: string; // Curto, Médio, Longo
    tecnica?: string; // Gel, Fibra de Vidro, Acrílico, Esmaltação em Gel
    cores?: string;
    estilo?: string;
  };
  consentimento_imagem: boolean;
  criado_em: string;
}

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  duracao_minutos: number;
  preco: number;
  sinal_tipo: 'porcentagem' | 'fixo' | 'nenhum';
  sinal_valor: number;
  intervalo_manutencao_dias: number; // ex: 15, 20, 30 dias (0 se não aplicável)
  custo_estimado?: number;
  ativo: boolean;
  materiais_utilizados?: { material_id: string; quantidade: number }[];
  is_pacote?: boolean;
  servicos_pacote?: string[];
  servicos_pacote_detalhes?: { servico_id: string; quantidade: number }[];
  descricao?: string;
}

export type AgendamentoStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'falta' | 'bloqueado';

export interface Agendamento {
  id: string;
  cliente_id: string; // "bloqueado" se for bloqueio de horário pessoal
  profissional_id: string;
  inicio: string; // ISO string UTC (ou fuso salão)
  fim: string; // ISO string
  status: AgendamentoStatus;
  valor_total: number;
  valor_sinal: number;
  observacoes?: string;
  origem: 'cliente' | 'admin';
  motivo_cancelamento?: string;
  cancelado_por?: 'cliente' | 'admin';
  criado_em: string;
}

export interface ItemAgendamento {
  id: string;
  agendamento_id: string;
  servico_id: string;
  nome_servico: string;
  duracao_minutos: number;
  preco_cobrado: number;
}

export type PagamentoStatus = 'pendente' | 'sinal pago' | 'pago parcialmente' | 'pago' | 'estornado';
export type MetodoPagamento = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'transferencia';

export interface Pagamento {
  id: string;
  agendamento_id: string;
  tipo: MetodoPagamento;
  valor: number;
  status: PagamentoStatus;
  data_pagamento: string;
  comprovante_url?: string;
  observacao?: string;
}

export interface FotoInspiracao {
  id: string;
  cliente_id: string;
  agendamento_id?: string;
  tipo: 'antes' | 'depois' | 'inspiracao';
  url: string;
  legenda?: string;
  consentimento_publico: boolean;
  criado_em: string;
}

export interface ListaEspera {
  id: string;
  cliente_id: string;
  servico_id: string;
  profissional_id?: string;
  data_preferida: string; // YYYY-MM-DD
  periodo_preferido: 'manha' | 'tarde' | 'noite' | 'qualquer';
  status: 'aguardando' | 'atendido' | 'expirado' | 'cancelado';
  criado_em: string;
}

export interface Notificacao {
  id: string;
  cliente_id: string;
  agendamento_id: string;
  tipo: 'confirmacao' | 'lembrete' | 'retorno_manutencao' | 'lista_espera';
  canal: 'whatsapp';
  mensagem: string;
  status_envio: 'pendente' | 'enviado' | 'erro';
  enviado_em?: string;
  respondido_em?: string;
}

export interface ConfigSalao {
  nome: string;
  proprietaria: string;
  telefone: string;
  email: string;
  endereco: string;
  instagram: string;
  chave_pix: string;
  instrucoes_pix: string;
  horarios_trabalho: {
    [key: number]: { // 0=Domingo, 1=Segunda, etc.
      ativo: boolean;
      inicio: string; // HH:MM
      fim: string; // HH:MM
    }
  };
  regras: {
    cancelamento_limite_horas: number;
    sinal_obrigatorio_geral: boolean;
    lembrete_horas_antecedencia: number;
  };
  templates_whatsapp: {
    confirmacao: string;
    lembrete: string;
    retorno_manutencao: string;
    lista_espera: string;
    contato_geral?: string;
  };
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
}

export interface Material {
  id: string;
  nome: string;
  marca: string;
  preco_compra: number;
  rendimento: number; // quantidade de usos/aplicações
  custo_por_uso: number; // preco_compra / rendimento
}

export interface ModalAlertaConfig {
  titulo: string;
  mensagem: string;
  link?: string;
  tipo?: 'sucesso' | 'info' | 'aviso' | 'erro';
  textoBotao?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirm?: boolean;
}
