export interface Usuario {
  id: string;
  salao_id?: string;
  nome: string;
  email: string;
  telefone: string;
  perfil: 'admin' | 'profissional';
  especialidade?: string; // Título/especialidade exibida aos clientes (ex: Especialista Master, Designer, etc.)
  ativo: boolean;
  foto?: string;
  senha?: string;
  servicos_habilitados?: string[]; // IDs dos serviços que esta profissional realiza
  chave_pix?: string; // Chave Pix própria da profissional
  usar_pix_proprio?: boolean; // Se true, o Pix dos agendamentos dela vai para a chave própria ao invés da proprietária
  comissao_padrao_porcentagem?: number; // Percentual de comissão padrão (ex: 50%)
  descontar_taxa_cartao?: boolean; // Se desconta taxa do repasse
  descontar_materiais?: boolean; // Se desconta materiais do repasse
}

export interface Cliente {
  id: string;
  salao_id?: string;
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
    anamnese?: Anamnese;
    assinatura?: AssinaturaCliente;
    [key: string]: any;
  };
  consentimento_imagem: boolean;
  anamnese?: Anamnese;
  assinatura?: AssinaturaCliente;
  criado_em: string;
}

export interface Servico {
  id: string;
  salao_id?: string;
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
  foto?: string; // Foto principal de vitrine para o catálogo online
  fotos?: string[]; // Galeria de fotos adicionais do serviço
  destaque_catalogo?: boolean; // Se o serviço fica em destaque na vitrine
  itens_inclusos?: string[]; // Itens inclusos no procedimento (exibidos em detalhes no catálogo)
  orientacoes_agendamento?: string; // Dicas ou observações pré-agendamento (exibidos em detalhes no catálogo)
}

export type AgendamentoStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'falta' | 'bloqueado';

export interface Agendamento {
  id: string;
  salao_id?: string;
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
  confirmado_por?: 'cliente' | 'admin';
  produtos?: ItemComandaProduto[]; // Produtos consumidos/comprados no atendimento
  pago_com_clube?: boolean; // Se foi baixado do saldo de assinatura recorrente
  criado_em: string;
}

export interface ItemAgendamento {
  id: string;
  salao_id?: string;
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
  salao_id?: string;
  agendamento_id: string;
  tipo: MetodoPagamento;
  valor: number;
  status: PagamentoStatus;
  data_pagamento: string;
  comprovante_url?: string;
  observacao?: string;
  origem_tipo?: 'servico' | 'produto' | 'assinatura';
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
  salao_id?: string;
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
  salao_id?: string;
  nome: string;
  proprietaria: string;
  telefone: string;
  email: string;
  endereco: string;
  instagram: string;
  chave_pix: string;
  instrucoes_pix: string;
  regra_devolucao_sinal?: string;
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
    sinal_obrigatorio_todos?: boolean;
    sinal_obrigatorio_novos?: boolean;
    sinal_padrao?: number;
    antecedencia_minima_minutos?: number;
    limite_horas_sinal?: number;
    lembrete_horas_antecedencia: number;
    alerta_sonoro_ativo?: boolean;
    alerta_visual_ativo?: boolean;
  };
  templates_whatsapp: {
    confirmacao: string;
    lembrete: string;
    retorno_manutencao: string;
    lista_espera: string;
    contato_geral?: string;
    clientes_sumidas?: string; // Template para reativação de clientes inativas
  };
  meta_whatsapp?: {
    phoneNumberId: string;
    accessToken: string;
    ativo: boolean;
  };
  catalogo_personalizacao?: CatalogoPersonalizacao;
}

export interface CatalogoExtraConfig {
  id: string;
  nome: string;
  duracao: number;
  preco: number;
  descricao: string;
  ativo?: boolean;
}

export interface CatalogoPersonalizacao {
  hero_selo?: string; // ex: "Atendimento com hora marcada"
  hero_titulo?: string; // ex: "Unhas impecáveis, no seu estilo."
  hero_subtitulo?: string; // ex: "Escolha seu serviço, veja o tempo estimado..."
  hero_foto_url?: string; // Imagem em destaque do Hero
  hero_card_subtitulo?: string; // ex: "Alongamentos & Cuidados"
  hero_card_tag?: string; // ex: "Alta Durabilidade"
  badge_confianca_1?: string;
  badge_confianca_2?: string;
  badge_confianca_3?: string;
  sobre_titulo?: string;
  sobre_descricao?: string;
  itens_inclusos_padrao?: string[];
  orientacao_padrao?: string;
  extras?: CatalogoExtraConfig[];
}

export const REGRA_DEVOLUCAO_PADRAO = 'Cancelamentos realizados com até {horas} horas de antecedência têm devolução integral do sinal via Pix. Após esse prazo, o valor não é reembolsável.';

export interface NotificacaoClienteAcao {
  id: string;
  tipo: 'agendamento' | 'confirmacao' | 'espera' | 'cancelamento' | 'pagamento_sinal';
  titulo: string;
  mensagem: string;
  detalhes?: string;
  hora: string;
  agendamentoId?: string;
  listaEsperaId?: string;
  clienteNome?: string;
}

export interface AvisoCliente {
  id: string;
  tipo: 'agendamento' | 'confirmacao' | 'espera' | 'cancelamento' | 'pagamento_sinal';
  titulo: string;
  mensagem: string;
  detalhes?: string;
  hora: string;
  criadoEm: string;
  agendamentoId?: string;
  listaEsperaId?: string;
  clienteNome?: string;
  lido: boolean;
}

export interface Despesa {
  id: string;
  salao_id?: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  fechamento_id?: string;
}

export interface Material {
  id: string;
  salao_id?: string;
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

// --- FICHA DE ANAMNESE DIGITAL COM ASSINATURA TOUCH ---
export interface Anamnese {
  id: string;
  cliente_id: string;
  salao_id?: string;
  data_preenchimento: string; // ISO string
  possui_alergia: boolean;
  detalhes_alergia?: string;
  diabetica: boolean;
  gestante: boolean;
  micose_ou_fungo: boolean;
  habito_roer: boolean;
  problemas_circulatorios?: boolean;
  medicamentos_uso_continuo?: string;
  procedimentos_anteriores?: string;
  observacoes_adicionais?: string;
  assinatura_base64: string; // Imagem PNG da assinatura coletada no Canvas
  termo_aceite: boolean;
}

// --- PRODUTOS E COMANDA (PDV DE BALCÃO) ---
export interface Produto {
  id: string;
  salao_id?: string;
  nome: string;
  marca?: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  criado_em?: string;
}

export interface ItemComandaProduto {
  id: string;
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

// --- CLUBE DE ASSINATURA RECORRENTE ---
export interface ItemServicoPlano {
  servico_id: string;
  nome_servico: string;
  quantidade: number;
  profissional_id?: string; // Profissional designada para este serviço no plano
}

export interface ItemSaldoAssinatura {
  servico_id: string;
  nome_servico: string;
  saldo_restante: number;
  total_mes: number;
  profissional_id?: string; // Profissional designada
}

export interface PlanoAssinatura {
  id: string;
  salao_id?: string;
  nome: string;
  descricao?: string;
  preco_mensal: number;
  itens_servicos?: ItemServicoPlano[]; // Ex: [{ servico_id: 's1', nome_servico: 'Manicure', quantidade: 4 }, { servico_id: 's2', nome_servico: 'Pedicure', quantidade: 3 }]
  qtd_procedimentos_mes: number; // soma total de procedimentos no mês
  servicos_permitidos_ids: string[];
  validade_dias: number;
  ativo: boolean;
  destaque_catalogo?: boolean; // Se marcado, exibe o selo "Plano Recomendado" no catálogo online
}

export interface AssinaturaCliente {
  plano_id: string;
  nome_plano: string;
  data_inicio: string;
  data_renovacao: string;
  itens_saldo?: ItemSaldoAssinatura[]; // Saldo individual por procedimento
  saldo_restante: number;
  total_mes: number;
  status: 'ativo' | 'pausado' | 'cancelado';
}

// --- COMISSÕES E REPASSES (LEI DO SALÃO-PARCEIRO) ---
export interface FechamentoComissao {
  id: string;
  salao_id?: string;
  profissional_id: string;
  nome_profissional: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_faturado_bruto: number;
  taxa_comissao_porcentagem: number;
  valor_comissao_bruta: number;
  desconto_taxas_cartao: number;
  desconto_materiais: number;
  outros_descontos: number;
  valor_liquido_pago: number;
  data_pagamento: string;
  pago: boolean;
  observacoes?: string;
}
