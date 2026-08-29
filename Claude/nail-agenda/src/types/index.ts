// Modelo de dados — Agenda Nail Designer
// Datas são armazenadas em ISO 8601 (UTC) como string.

export type Perfil = 'administradora' | 'profissional'

export interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string
  perfil: Perfil
  ativo: boolean
  foto?: string
  corAgenda: string // cor usada para identificar a profissional na agenda
}

export type CategoriaServico =
  | 'mao'
  | 'pe'
  | 'alongamento'
  | 'manutencao'
  | 'decoracao'
  | 'spa'
  | 'outra'

export type SinalTipo = 'nenhum' | 'valor_fixo' | 'percentual'

export interface Servico {
  id: string
  nome: string
  categoria: CategoriaServico
  duracaoMinutos: number
  preco: number
  sinalTipo: SinalTipo
  sinalValor: number // valor em R$ ou percentual (0-100), conforme sinalTipo
  intervaloManutencaoDias: number | null
  custoEstimado: number | null
  ativo: boolean
  criadoEm: string
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  email?: string
  aniversario?: string // ISO date (yyyy-MM-dd)
  observacoes?: string
  alergias?: string
  preferencias?: string
  consentimentoImagem: boolean
  criadoEm: string
}

export type StatusAgendamento =
  | 'pendente'
  | 'confirmado'
  | 'concluido'
  | 'cancelado'
  | 'falta'
  | 'bloqueado'

export type OrigemAgendamento = 'publico' | 'manual' | 'lista_espera'

export interface ItemAgendamento {
  id: string
  servicoId: string
  nomeServico: string
  duracaoMinutos: number
  precoCobrado: number
}

export interface Agendamento {
  id: string
  clienteId: string | null // null para bloqueios pessoais
  profissionalId: string
  inicio: string // ISO datetime UTC
  fim: string // ISO datetime UTC
  status: StatusAgendamento
  itens: ItemAgendamento[]
  valorTotal: number
  valorSinal: number
  observacoes?: string
  origem: OrigemAgendamento
  codigoReserva?: string
  motivoCancelamento?: string
  canceladoPor?: string
  canceladoEm?: string
  proximaManutencaoSugerida?: string // ISO date
  criadoEm: string
  tituloBloqueio?: string // usado quando status = bloqueado
}

export type TipoPagamento = 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
export type StatusPagamento = 'pendente' | 'sinal_pago' | 'pago_parcial' | 'pago' | 'estornado'

export interface Pagamento {
  id: string
  agendamentoId: string
  tipo: TipoPagamento
  valor: number
  status: StatusPagamento
  dataPagamento: string
  comprovanteUrl?: string
  observacao?: string
}

export interface FotoInspiracao {
  id: string
  clienteId: string
  agendamentoId?: string
  tipo: 'antes' | 'depois' | 'inspiracao'
  url: string
  legenda?: string
  consentimentoPublico: boolean
  criadoEm: string
}

export type StatusListaEspera = 'aguardando' | 'notificado' | 'convertido' | 'expirado'

export interface ListaEspera {
  id: string
  clienteId: string
  servicoId: string
  profissionalId: string | null
  dataPreferida: string | null // ISO date
  periodoPreferido: 'manha' | 'tarde' | 'noite' | 'qualquer'
  status: StatusListaEspera
  criadoEm: string
}

export type TipoNotificacao = 'lembrete' | 'confirmacao' | 'manutencao' | 'lista_espera' | 'outro'
export type CanalNotificacao = 'whatsapp' | 'sms' | 'email' | 'sistema'
export type StatusEnvio = 'pendente' | 'enviado' | 'respondido' | 'falhou'

export interface Notificacao {
  id: string
  clienteId: string
  agendamentoId?: string
  tipo: TipoNotificacao
  canal: CanalNotificacao
  mensagem: string
  statusEnvio: StatusEnvio
  enviadoEm?: string
  respondidoEm?: string
  criadoEm: string
}

export interface HorarioDia {
  ativo: boolean
  inicio: string // "09:00"
  fim: string // "19:00"
  pausaInicio?: string
  pausaFim?: string
}

export interface ConfiguracaoSalao {
  nomeSalao: string
  nomeProfissionalPrincipal: string
  logoUrl?: string
  endereco?: string
  instagram?: string
  linkPublico: string
  fusoHorario: string
  horarios: Record<
    'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado',
    HorarioDia
  >
  politicaCancelamentoHoras: number
  politicaSinalPadraoPercentual: number
  perdeSinalNaFalta: boolean
  lembreteHorasAntes: number
  modelosMensagem: {
    confirmacao: string
    lembrete: string
    cancelamento: string
    manutencao: string
    listaEspera: string
  }
}

export interface Database {
  usuarios: Usuario[]
  clientes: Cliente[]
  servicos: Servico[]
  agendamentos: Agendamento[]
  pagamentos: Pagamento[]
  fotos: FotoInspiracao[]
  listaEspera: ListaEspera[]
  notificacoes: Notificacao[]
  configuracao: ConfiguracaoSalao
}
