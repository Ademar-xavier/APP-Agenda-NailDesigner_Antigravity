import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Cliente, 
  Servico, 
  Agendamento, 
  Pagamento, 
  ListaEspera, 
  ConfigSalao,
  AgendamentoStatus,
  MetodoPagamento,
  Usuario,
  Despesa,
  Material,
  ModalAlertaConfig,
  NotificacaoClienteAcao,
  AvisoCliente,
  REGRA_DEVOLUCAO_PADRAO,
  Anamnese,
  Produto,
  ItemComandaProduto,
  PlanoAssinatura,
  ItemServicoPlano,
  AssinaturaCliente,
  FechamentoComissao
} from '../types';
import { dbSetAll, dbSetItem, dbDeleteItem, STORES, migrarLocalStorageParaIndexedDB } from '../services/dbStorage';
import { registrarListenerSync, enfileirarTarefaSync, processarFilaOffline } from '../services/syncQueue';
import { 
  supabase,
  salvarClienteSupabase,
  deletarClienteSupabase,
  salvarServicoSupabase,
  deletarServicoSupabase,
  decodeServicoDescricao,
  salvarAgendamentoSupabase,
  atualizarStatusAgendamentoSupabase,
  atualizarValorSinalAgendamentoSupabase,
  deletarAgendamentoSupabase,
  salvarListaEsperaSupabase,
  atualizarStatusListaEsperaSupabase,
  carregarDadosNuvemSupabase,
  salvarMaterialSupabase,
  deletarMaterialSupabase,
  salvarDespesaSupabase,
  deletarDespesaSupabase,
  salvarConfiguracoesSupabase,
  salvarUsuarioSupabase,
  persistirAvisosNaoLidosSupabase,
  getRealtimeBroadcastChannel
} from '../services/supabase';
import { solicitarPermissaoNotificacoes, dispararNotificacaoBarraStatus, inicializarCanalNotificacoes } from '../services/notificacoesMobile';
import { App as CapApp } from '@capacitor/app';
import { 
  encontrarPlanoVip, 
  calcularIntervaloVip,
  obterConfiguracaoSessaoVip,
  calcularDuracaoSessaoVip,
  obterServicosIdsSessaoVip
} from '../utils/planoVipHelper';

export const ENV_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';

// Lock/debounce em memória para evitar duplicação de sessões VIP disparadas em lote
const sessoesVipProcessadas = new Map<string, number>();

// Emite sinal sonoro suave e elegante (dois tons em acorde harmônico) usando a Web Audio API nativa
const emitirTonsHarmonicos = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;

    // Tom 1 (G5 - 783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tom 2 (C6 - 1046.50 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (err) {}
};

export const tocarAlertaSonoro = () => {
  try {
    // Vibração háptica no celular
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([150, 80, 150]); } catch (err) {}
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Em dispositivos móveis (Android/iOS), se o contexto estiver suspenso, retoma antes de emitir
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        emitirTonsHarmonicos(ctx);
      }).catch(() => {});
    } else {
      emitirTonsHarmonicos(ctx);
    }
  } catch (e) {
    console.warn('Alerta sonoro não pôde ser executado:', e);
  }
};

interface AppStateContextType {
  clientes: Cliente[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  pagamentos: Pagamento[];
  listaEspera: ListaEspera[];
  configSalao: ConfigSalao;
  equipe: Usuario[];
  currentUser: Usuario | null;
  
  // Ações de Autenticação
  login: (usuarioId: string) => void;
  loginWithCredentials: (identificador: string, senhaDigitada: string) => boolean;
  logout: () => void;

  // Ações de Equipe
  addEquipe: (membro: Omit<Usuario, 'id' | 'ativo'>) => void;
  updateEquipe: (id: string, updated: Partial<Usuario>) => void;
  deleteEquipe: (id: string) => void;
  toggleEquipeAtivo: (id: string) => void;

  // Ações de Clientes
  addCliente: (cliente: Omit<Cliente, 'id' | 'criado_em'>) => Cliente;
  updateCliente: (id: string, cliente: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  
  // Ações de Serviços
  addServico: (servico: Omit<Servico, 'id' | 'ativo'> & { ativo?: boolean }) => Promise<void> | void;
  updateServico: (id: string, servico: Partial<Servico>) => Promise<void> | void;
  deleteServico: (id: string) => Promise<void> | void;
  
  // Ações de Agendamentos
  addAgendamento: (
    agendamento: Omit<Agendamento, 'id' | 'criado_em' | 'fim'> & { fim?: string }, 
    servicosSelecionados: string[],
    recorrenciaManual?: {
      tipo: 'semanal' | 'quinzenal' | 'dias_20' | 'dias_21' | 'mensal' | 'personalizado';
      intervaloDias: number;
      repeticoes: number;
      tipoLabel: string;
    },
    planoVipId?: string
  ) => { success: boolean; error?: string; agendamento?: Agendamento; criados?: number };
  updateAgendamentoStatus: (id: string, status: AgendamentoStatus, canceladoPor?: 'cliente' | 'admin', motivo?: string, confirmadoPor?: 'cliente' | 'admin') => void;
  atualizarValorSinalAgendamento: (id: string, valorSinal: number) => void;
  atualizarServicosEProfissionalAgendamento: (id: string, novosServicosIds: string[], novaProfissionalId: string, ajustarFuturos?: boolean) => void;
  cancelAgendamento: (id: string, motivo: string, canceladoPor: 'cliente' | 'admin') => void;
  deleteAgendamento: (id: string) => void;
  confirmarSinal: (id: string, valor: number, metodo: MetodoPagamento) => void;
  concluirAtendimento: (
    id: string, 
    valorRestante: number, 
    metodo: MetodoPagamento, 
    dataProximaManutencao?: string,
    produtosVendidos?: ItemComandaProduto[],
    pagoComClube?: boolean,
    servicoAbaterId?: string,
    desconto?: { valor: number; motivo?: string }
  ) => void;
  
  // Ações de Lista de Espera
  addListaEspera: (item: Omit<ListaEspera, 'id' | 'criado_em' | 'status'>) => ListaEspera;
  updateListaEsperaStatus: (id: string, status: ListaEspera['status']) => void;
  atenderListaEspera: (id: string, agendamentoId: string) => void;
  
  // Configurações
  updateConfigSalao: (config: Partial<ConfigSalao>) => void;
  
  // Google Agenda
  googleConnected: boolean;
  googleUserEmail: string;
  googleLastSync: string;
  conectarGoogleAgenda: (email: string) => void;
  desconectarGoogleAgenda: () => void;
  sincronizarGoogleAgenda: (eventos: any[]) => void;
  limparAgendamentosSimuladosGoogle: () => void;
  deduplicarClientes: () => Promise<{ removidos: number; unificados: number }>;

  // Sincronização em Nuvem (Supabase)
  isSyncingCloud: boolean;
  lastCloudSyncTime: string | null;
  sincronizarComNuvem: (forcarSobrescrita?: boolean) => Promise<{ sucesso: boolean; mensagem: string }>;
  enviarDadosParaNuvem: () => Promise<{ sucesso: boolean; mensagem: string }>;

  // Despesas
  despesas: Despesa[];
  addDespesa: (despesa: Omit<Despesa, 'id'>) => void;
  updateDespesa: (id: string, despesa: Partial<Despesa>) => void;
  deleteDespesa: (id: string) => void;
  categoriasDespesa: string[];
  addCategoriaDespesa: (nome: string) => void;
  deleteCategoriaDespesa: (nome: string) => void;

  // Técnicas
  tecnicas: string[];
  addTecnica: (nome: string) => void;
  deleteTecnica: (nome: string) => void;

  // Formatos
  formatos: string[];
  addFormato: (nome: string) => void;
  deleteFormato: (nome: string) => void;

  // Categorias de Serviços
  categoriasServico: string[];
  addCategoriaServico: (nome: string) => void;
  deleteCategoriaServico: (nome: string) => void;

  // Categorias de Produtos
  categoriasProduto: string[];
  addCategoriaProduto: (nome: string) => void;
  deleteCategoriaProduto: (nome: string) => void;

  // Materiais
  materiais: Material[];
  addMaterial: (material: Omit<Material, 'id' | 'custo_por_uso'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;

  // Auxiliares
  ajustarHorarioAlmoco: (params: {
    data: string;
    profissionalId: string;
    inicio: string;
    fim: string;
    escopo: 'dia' | 'profissional' | 'salao';
  }) => Promise<void>;
  excluirOuLiberarAlmoco: (params: {
    data: string;
    profissionalId: string;
    escopo: 'dia' | 'profissional' | 'salao';
  }) => Promise<void>;
  checkConflitoHorario: (inicio: string, fim: string, profissionalId: string, ignorarAgendamentoId?: string) => boolean;
  obterServicosDeAgendamento: (agendamentoId: string) => Servico[];
  obterRecomendacoesManutencao: () => { 
    cliente: Cliente; 
    servico: Servico; 
    dataSugerida: string; 
    diasAtraso: number;
    diasRestantes: number;
    statusManutencao: 'atrasada' | 'hoje' | 'em_breve' | 'programada';
  }[];
  obterProximoHorarioLivre: (data: string, duracaoMinutos: number) => string | null;
  notificacaoGlobal: { mensagem: string; tipo: 'sucesso' | 'info' | 'erro' } | null;
  mostrarNotificacaoGlobal: (mensagem: string, tipo?: 'sucesso' | 'info' | 'erro') => void;
  modalAlerta: ModalAlertaConfig | null;
  mostrarAlerta: (config: ModalAlertaConfig) => void;
  fecharAlerta: () => void;
  confirmarAcao: (config: {
    titulo?: string;
    mensagem: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'sucesso' | 'info' | 'aviso' | 'erro';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  notificacaoClienteAcao: NotificacaoClienteAcao | null;
  fecharNotificacaoClienteAcao: () => void;
  dispararNotificacaoCliente: (notif: Omit<NotificacaoClienteAcao, 'id' | 'hora'>) => void;
  tocarAlertaSonoro: () => void;
  avisosNaoLidos: AvisoCliente[];
  marcarAvisoComoLido: (idOuRefId: string) => void;
  marcarTodosAvisosComoLidos: () => void;

  // Produtos e PDV de Balcão
  produtos: Produto[];
  addProduto: (produto: Omit<Produto, 'id'>) => void;
  updateProduto: (id: string, produto: Partial<Produto>) => void;
  deleteProduto: (id: string) => void;
  darBaixaEstoqueProduto: (produtoId: string, quantidade: number) => void;

  // Anamnese Digital
  salvarAnamneseCliente: (clienteId: string, anamnese: Anamnese) => void;

  // Clube de Assinatura Recorrente
  planosAssinatura: PlanoAssinatura[];
  addPlanoAssinatura: (plano: Omit<PlanoAssinatura, 'id'>) => void;
  updatePlanoAssinatura: (id: string, plano: Partial<PlanoAssinatura>) => void;
  deletePlanoAssinatura: (id: string) => void;
  vincularAssinaturaCliente: (clienteId: string, planoId: string) => void;
  cancelarAssinaturaCliente: (clienteId: string) => void;
  abaterSaldoAssinatura: (clienteId: string, servicoId?: string) => boolean;
  reservarRecorrenciaSemanalVip: (agendamentoInicialId: string, agendamentoInicialObj?: Agendamento, servicosIniciaisIds?: string[], planoIdOverride?: string) => { success: boolean; criados: number; mensagem: string };

  // Comissões (Lei do Salão-Parceiro)
  fechamentosComissao: FechamentoComissao[];
  salvarFechamentoComissao: (fechamento: Omit<FechamentoComissao, 'id'>) => void;
  deleteFechamentoComissao: (fechamentoId: string) => void;

  // Sincronização e Conectividade Offline
  syncStatus: { online: boolean; pendentes: number; sincronizando: boolean };
  processarFilaSync: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Serviços baseados nos dados reais de faturamento da imagem 5 + Manicure tradicional da imagem do Claude
const servicosIniciais: Servico[] = [
  { id: 's1', nome: 'Alongamento em fibra', categoria: 'alongamento', duracao_minutos: 120, preco: 160, sinal_tipo: 'fixo', sinal_valor: 30, intervalo_manutencao_dias: 20, ativo: true, descricao: 'Técnica de alongamento premium utilizando fibra de vidro importada. Alta resistência e acabamento natural.' },
  { id: 's2', nome: 'Esmaltação em gel', categoria: 'alongamento', duracao_minutos: 60, preco: 70, sinal_tipo: 'fixo', sinal_valor: 15, intervalo_manutencao_dias: 15, ativo: true, descricao: 'Esmaltação secada em cabine LED/UV. Durabilidade incrível de até 15 dias sem lascar e brilho duradouro.' },
  { id: 's3', nome: 'Manutenção de alongamento', categoria: 'manutencao', duracao_minutos: 90, preco: 110, sinal_tipo: 'fixo', sinal_valor: 20, intervalo_manutencao_dias: 20, ativo: true, descricao: 'Reposição do gel e lixamento técnico. Recomendado a cada 20 dias para manter a saúde e beleza das unhas.' },
  { id: 's4', nome: 'Combo mão + pé', categoria: 'mao', duracao_minutos: 105, preco: 95, sinal_tipo: 'nenhum', sinal_valor: 0, intervalo_manutencao_dias: 0, ativo: true, is_pacote: true, servicos_pacote: ['s9', 's5'], servicos_pacote_detalhes: [{ servico_id: 's9', quantidade: 1 }, { servico_id: 's5', quantidade: 1 }], descricao: 'Combo promocional prático contendo 1 Manicure Tradicional (mão) e 1 Pedicure Spa (pé).' },
  { id: 's5', nome: 'Pedicure spa', categoria: 'pe', duracao_minutos: 60, preco: 55, sinal_tipo: 'nenhum', sinal_valor: 0, intervalo_manutencao_dias: 15, ativo: true, descricao: 'Cuidado completo para os pés, lixamento, esfoliação hidratante e cutilagem fina com acabamento clássico.' },
  { id: 's6', nome: 'Nail art / decoração', categoria: 'decoracao', duracao_minutos: 30, preco: 25, sinal_tipo: 'nenhum', sinal_valor: 0, intervalo_manutencao_dias: 0, ativo: true, descricao: 'Decorações feitas à mão, encapsuladas, aplicação de pedrarias, foil ou glitters premium por unha.' },
  { id: 's7', nome: 'Blindagem de Unha', categoria: 'alongamento', duracao_minutos: 60, preco: 90, sinal_tipo: 'fixo', sinal_valor: 15, intervalo_manutencao_dias: 20, ativo: true, descricao: 'Camada de gel protetora sobre as unhas naturais para evitar quebras e descamações, mantendo o esmalte por mais tempo.' },
  { id: 's8', nome: 'Pé e Mão Simples', categoria: 'mao', duracao_minutos: 60, preco: 70, sinal_tipo: 'nenhum', sinal_valor: 0, intervalo_manutencao_dias: 15, ativo: true, descricao: 'Cutilagem rápida e esmaltação comum simples nas mãos e nos pés.' },
  { id: 's9', nome: 'Manicure tradicional', categoria: 'mao', duracao_minutos: 45, preco: 45, sinal_tipo: 'fixo', sinal_valor: 10, intervalo_manutencao_dias: 15, ativo: true, descricao: 'Cutilagem clássica, hidratação das cutículas e esmaltação tradicional com as melhores marcas do mercado.' }
];

const clientesIniciais: Cliente[] = [
  { id: 'c1', nome: 'Ana Souza', telefone: '(35) 98765-4321', email: 'ana.souza@gmail.com', aniversario: '1995-05-12', observacoes: 'Prefere lixar bem os cantinhos. Gosta de tons nude.', alergias: 'Nenhuma', preferencias: { formato: 'Quadrada', tamanho: 'Médio', tecnica: 'Gel', cores: 'Tons Nude', estilo: 'Clássico' }, consentimento_imagem: true, criado_em: '2026-06-01T10:00:00Z' }
];

// Equipe inicial com dados reais e senha padrão para comercialização
const equipeInicial: Usuario[] = [
  { id: 'u1', nome: 'Sheila Santos', email: 'sheila@agenda.com', telefone: '35 99714-1856', perfil: 'admin', especialidade: 'Especialista Master', ativo: true, senha: 'admin', horario_almoco_ativo: true, horario_almoco_inicio: '12:00', horario_almoco_fim: '13:00' },
  { id: 'u2', nome: 'Lurdinha', email: 'lurdinha@agenda.com', telefone: '35 99182-1220', perfil: 'profissional', especialidade: 'Designer', ativo: true, senha: 'admin', horario_almoco_ativo: true, horario_almoco_inicio: '12:00', horario_almoco_fim: '13:00' }
];

// Agendamentos, pagamentos e lista de espera iniciam vazios (alimentados pelo banco de dados da nuvem)
const agendamentosIniciais: Agendamento[] = [];
const pagamentosIniciais: Pagamento[] = [];
const listaEsperaInicial: ListaEspera[] = [];

const configSalaoInicial: ConfigSalao = {
  nome: 'Sheila Santos Nails Designer',
  proprietaria: 'Sheila Santos',
  telefone: '35 99714-1856',
  email: 'contato@sheilasantosnails.com.br',
  endereco: 'Rua das Flores, 123 - Jardins, São Paulo - SP',
  instagram: '@sheilasantos.naildesigner',
  chave_pix: 'pix@sheilasantosnails.com.br',
  instrucoes_pix: 'Envie o comprovante em até 2 hours para garantir o seu horário. O valor do sinal é deduzido do total no dia do atendimento.',
  regra_devolucao_sinal: 'Cancelamentos realizados com até {horas} horas de antecedência têm devolução integral do sinal via Pix. Após esse prazo, o valor não é reembolsável.',
  horarios_trabalho: {
    1: { ativo: true, inicio: '09:00', fim: '18:00' }, // Segunda
    2: { ativo: true, inicio: '09:00', fim: '18:00' }, // Terça
    3: { ativo: true, inicio: '09:00', fim: '18:00' }, // Quarta
    4: { ativo: true, inicio: '09:00', fim: '20:00' }, // Quinta
    5: { ativo: true, inicio: '09:00', fim: '20:00' }, // Sexta
    6: { ativo: true, inicio: '08:00', fim: '17:00' }, // Sábado
    0: { ativo: false, inicio: '09:00', fim: '12:00' } // Domingo
  },
  regras: {
    cancelamento_limite_horas: 24,
    sinal_obrigatorio_geral: true,
    sinal_obrigatorio_todos: false,
    sinal_obrigatorio_novos: true,
    sinal_padrao: 15,
    lembrete_horas_antecedencia: 24,
    alerta_sonoro_ativo: true,
    alerta_visual_ativo: true
  },
  templates_whatsapp: {
    confirmacao: 'Olá, {cliente}! Seu agendamento para {servico} com {profissional} no dia {data} às {hora} foi recebido. Para confirmar, efetue o pagamento do sinal de R$ {sinal} na chave Pix {chave_pix} e envie o comprovante aqui.\n\n👉 Confirme sua presença em 1 toque:\n{link_confirmacao}',
    lembrete: 'Olá, {cliente}! Passando para lembrar do seu atendimento {dia_relativo} ({data}) às {hora} ({servico}).\n\n👉 Confirme sua presença em 1 toque:\n{link_confirmacao}\n\nTe espero!',
    retorno_manutencao: 'Olá, {cliente}! Faz {dias_visita} dias desde o seu último {servico}. Está na hora de fazer sua manutenção para manter suas unhas lindas e saudáveis! Agende pelo link: {link_agendamento}',
    lista_espera: 'Olá, {cliente}! Um horário que você desejava ficou vago para o dia {data} no período {periodo}. Gostaria de agendar? Responda rápido para garantir!',
    contato_geral: 'Olá, {cliente}! Tudo bem? Gostaria de agendar seu horário conosco no Sheila Santos Nails? 💕\n\n📅 Escolha o melhor dia e horário pelo nosso link online:\n{link_agendamento}'
  }
};

const itensAgendamentoMock: { [agendamentoId: string]: string[] } = {
  'a1': ['s1'], 'a2': ['s1'], 'a3': ['s2'], 'a4': ['s2'], 'a5': ['s2'],
  'a6': ['s3'], 'a7': ['s4'], 'a8': ['s5'], 'a9': ['s6'], 'a10': ['s6'],
  'a11': ['s3'], 'a12': ['s1'], 'a13': ['s2'], 'a14': ['s7'], 'a15': ['s6'],
  'a_elaine': ['s9'], 'a_juliana': ['s2'], 'a_fernanda': ['s2'], 'a_camille': ['s2'],
  'a16': ['s2'], 'a17': ['s2']
};

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const limparFocoAtivo = () => {
    if (document.activeElement instanceof HTMLElement) {
      try {
        document.activeElement.blur();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Feedback visual global de salvamento e sincronização com a nuvem
  const [notificacaoGlobal, setNotificacaoGlobal] = useState<{ mensagem: string; tipo: 'sucesso' | 'info' | 'erro' } | null>(null);

  const mostrarNotificacaoGlobal = (mensagem: string, tipo: 'sucesso' | 'info' | 'erro' = 'sucesso') => {
    setNotificacaoGlobal({ mensagem, tipo });
    setTimeout(() => {
      setNotificacaoGlobal(null);
    }, 3800);
  };

  // Notificação Visual (Popup) e Sonora para ações de clientes em tempo real
  const [notificacaoClienteAcao, setNotificacaoClienteAcao] = useState<NotificacaoClienteAcao | null>(null);

  // Lista de Avisos Não Lidos (persistente em localStorage para o card do Dashboard e indicadores nas abas)
  const [avisosNaoLidos, setAvisosNaoLidos] = useState<AvisoCliente[]>(() => {
    try {
      const salvo = localStorage.getItem('nail_app_avisos_nao_lidos_v1');
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (e) {}
    return [];
  });

  const salvarAvisosLocalStorage = (avisos: AvisoCliente[]) => {
    try {
      localStorage.setItem('nail_app_avisos_nao_lidos_v1', JSON.stringify(avisos));
    } catch (e) {}
  };

  const getAvisosDisparadosSet = (): Set<string> => {
    try {
      const raw = localStorage.getItem('nail_avisos_disparados_ids');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  };

  const registrarAvisoDisparado = (id: string) => {
    if (!id) return;
    try {
      const s = getAvisosDisparadosSet();
      s.add(id);
      const arr = Array.from(s).slice(-150);
      localStorage.setItem('nail_avisos_disparados_ids', JSON.stringify(arr));
    } catch (e) {}
  };

  const adicionarAvisoNaoLido = (avisoData: Omit<AvisoCliente, 'id' | 'criadoEm' | 'lido'>) => {
    const novoAviso: AvisoCliente = {
      id: 'aviso_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      criadoEm: new Date().toISOString(),
      lido: false,
      ...avisoData
    };

    setAvisosNaoLidos(prev => {
      // Evita duplicatas do mesmo agendamento com o mesmo tipo
      const filtrados = prev.filter(a => !(a.agendamentoId && a.agendamentoId === novoAviso.agendamentoId && a.tipo === novoAviso.tipo));
      const atualizados = [novoAviso, ...filtrados];
      salvarAvisosLocalStorage(atualizados);
      persistirAvisosNaoLidosSupabase(atualizados);
      return atualizados;
    });
  };

  const marcarAvisoComoLido = (idOuRefId: string) => {
    if (!idOuRefId) return;
    const alvo = idOuRefId.toLowerCase().trim();
    const alvoLimpo = alvo.replace(/^#/, '').trim();

    setAvisosNaoLidos(prev => {
      const atualizados = prev.filter(a => {
        const id = (a.id || '').toLowerCase().trim();
        const agId = (a.agendamentoId || '').toLowerCase().replace(/^#/, '').trim();
        const leId = (a.listaEsperaId || '').toLowerCase().replace(/^#/, '').trim();
        const cliId = ((a as any).clienteId || '').toLowerCase().trim();
        const cliNome = (a.clienteNome || '').toLowerCase().trim();
        const detalhes = (a.detalhes || '').toLowerCase();
        const titulo = (a.titulo || '').toLowerCase();
        const mensagem = (a.mensagem || '').toLowerCase();

        // Se corresponder ao id direto ou normalizado
        if (id === alvo || id === alvoLimpo) return false;
        if (id === `aviso_rec_${alvoLimpo}` || id.endsWith(`_${alvoLimpo}`)) return false;
        if (agId && (agId === alvo || agId === alvoLimpo)) return false;
        if (leId && (leId === alvo || leId === alvoLimpo)) return false;
        if (cliId && (cliId === alvo || cliId === alvoLimpo)) return false;
        if (cliNome && (cliNome === alvo || cliNome === alvoLimpo)) return false;
        // Se o campo detalhes, mensagem ou título contém o código exato
        if (alvoLimpo && (detalhes.includes(`#${alvoLimpo}`) || detalhes.includes(alvoLimpo))) return false;
        if (alvoLimpo && (mensagem.includes(`#${alvoLimpo}`) || titulo.includes(`#${alvoLimpo}`))) return false;

        return true;
      });

      salvarAvisosLocalStorage(atualizados);
      persistirAvisosNaoLidosSupabase(atualizados);
      return atualizados;
    });
  };

  const marcarTodosAvisosComoLidos = () => {
    setAvisosNaoLidos([]);
    salvarAvisosLocalStorage([]);
    persistirAvisosNaoLidosSupabase([]);
  };

  const dispararNotificacaoCliente = (notif: Omit<NotificacaoClienteAcao, 'id' | 'hora'>) => {
    // Registra imediatamente na lista de avisos não lidos para o Dashboard e Confirmações
    const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    adicionarAvisoNaoLido({
      tipo: notif.tipo,
      titulo: notif.titulo,
      mensagem: notif.mensagem,
      detalhes: notif.detalhes,
      hora: horaAgora,
      agendamentoId: notif.agendamentoId,
      listaEsperaId: notif.listaEsperaId,
      clienteNome: notif.clienteNome
    });

    // Verifica se os alertas estão habilitados nas configurações (padrão true)
    let sonoroAtivo = true;
    let visualAtivo = true;
    try {
      const cfgLocal = localStorage.getItem('nail_config_salao');
      if (cfgLocal) {
        const parsed = JSON.parse(cfgLocal);
        if (parsed?.regras?.alerta_sonoro_ativo !== undefined) {
          sonoroAtivo = parsed.regras.alerta_sonoro_ativo;
        }
        if (parsed?.regras?.alerta_visual_ativo !== undefined) {
          visualAtivo = parsed.regras.alerta_visual_ativo;
        }
      }
    } catch (e) {}

    if (sonoroAtivo) {
      tocarAlertaSonoro();
    }

    if (visualAtivo) {
      const novaNotif: NotificacaoClienteAcao = {
        id: Math.random().toString(36).substring(2, 9),
        hora: horaAgora,
        ...notif
      };
      setNotificacaoClienteAcao(novaNotif);
      setTimeout(() => {
        setNotificacaoClienteAcao(prev => (prev?.id === novaNotif.id ? null : prev));
      }, 9000);
    }

    // Dispara notificação nativa no topo do celular (Barra de Notificações e Central de Notificações)
    if (notif.agendamentoId) registrarAvisoDisparado(notif.agendamentoId);
    if (notif.listaEsperaId) registrarAvisoDisparado(notif.listaEsperaId);
    dispararNotificacaoBarraStatus(notif.titulo, notif.mensagem, notif.detalhes, notif.agendamentoId);
  };

  const fecharNotificacaoClienteAcao = () => {
    setNotificacaoClienteAcao(null);
  };

  // Desbloqueia AudioContext na primeira interação e inicializa canal de Notificações
  useEffect(() => {
    inicializarCanalNotificacoes().catch(() => {});

    const unlockAudioAndNotification = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') ctx.resume();
        }
      } catch (e) {}

      // Solicita permissão para notificações na barra de status do celular
      solicitarPermissaoNotificacoes();

      window.removeEventListener('click', unlockAudioAndNotification);
      window.removeEventListener('touchstart', unlockAudioAndNotification);
    };
    window.addEventListener('click', unlockAudioAndNotification, { once: true });
    window.addEventListener('touchstart', unlockAudioAndNotification, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudioAndNotification);
      window.removeEventListener('touchstart', unlockAudioAndNotification);
    };
  }, []);

  // Modal de Alerta / Confirmação Visual Elegante (Substituto para alert e confirm nativos)
  const [modalAlerta, setModalAlerta] = useState<ModalAlertaConfig | null>(null);

  const mostrarAlerta = (config: ModalAlertaConfig) => {
    setModalAlerta(config);
  };

  const fecharAlerta = () => {
    setModalAlerta(null);
  };

  const confirmarAcao = (config: {
    titulo?: string;
    mensagem: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'sucesso' | 'info' | 'aviso' | 'erro';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setModalAlerta({
      titulo: config.titulo || 'Confirmar Ação',
      mensagem: config.mensagem,
      tipo: config.tipo || 'aviso',
      textoBotao: config.textoConfirmar || 'Confirmar',
      textoCancelar: config.textoCancelar || 'Cancelar',
      isConfirm: true,
      onConfirm: () => {
        setModalAlerta(null);
        config.onConfirm();
      },
      onCancel: () => {
        setModalAlerta(null);
        if (config.onCancel) config.onCancel();
      }
    });
  };

  // Intercepta window.alert para garantir uma experiência visual elegante e sem caixas nativas do navegador
  useEffect(() => {
    (window as any).alert = (msg: any) => {
      setModalAlerta({
        titulo: 'Aviso',
        mensagem: String(msg || ''),
        tipo: 'info',
        textoBotao: 'Entendido'
      });
    };
  }, []);

  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const saved = localStorage.getItem('nail_clientes');
      return saved ? JSON.parse(saved) : clientesIniciais;
    } catch (e) {
      console.error(e);
      return clientesIniciais;
    }
  });
  
  const [servicos, setServicos] = useState<Servico[]>(() => {
    try {
      const saved = localStorage.getItem('nail_servicos');
      return saved ? JSON.parse(saved) : servicosIniciais;
    } catch (e) {
      console.error(e);
      return servicosIniciais;
    }
  });

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    try {
      const saved = localStorage.getItem('nail_agendamentos');
      if (saved) {
        const parsed: Agendamento[] = JSON.parse(saved);
        return parsed.filter(a => 
          (!/^a\d+$/.test(a.id) || !a.inicio.startsWith('2026-08')) &&
          !(a.cliente_id === 'bloqueado' && a.status === 'cancelado') &&
          a.motivo_cancelamento !== 'EXCLUIDO_ADMIN'
        );
      }
      return agendamentosIniciais;
    } catch (e) {
      console.error(e);
      return agendamentosIniciais;
    }
  });

  const [pagamentos, setPagamentos] = useState<Pagamento[]>(() => {
    try {
      const saved = localStorage.getItem('nail_pagamentos');
      if (saved) {
        const parsed: Pagamento[] = JSON.parse(saved);
        return parsed.filter(p => !/^p\d+$/.test(p.id) || !p.data_pagamento.startsWith('2026-08'));
      }
      return pagamentosIniciais;
    } catch (e) {
      console.error(e);
      return pagamentosIniciais;
    }
  });

  const [listaEspera, setListaEspera] = useState<ListaEspera[]>(() => {
    try {
      const saved = localStorage.getItem('nail_lista_espera');
      if (saved) {
        const parsed: ListaEspera[] = JSON.parse(saved);
        return parsed.filter(l => !/^w\d+$/.test(l.id) || !l.data_preferida.startsWith('2026-08'));
      }
      return listaEsperaInicial;
    } catch (e) {
      console.error(e);
      return listaEsperaInicial;
    }
  });

  const [configSalao, setConfigSalao] = useState<ConfigSalao>(() => {
    try {
      const saved = localStorage.getItem('nail_config_salao');
      return saved ? JSON.parse(saved) : configSalaoInicial;
    } catch (e) {
      console.error(e);
      return configSalaoInicial;
    }
  });

  const [itensAgendamento, setItensAgendamento] = useState<{ [key: string]: string[] }>(() => {
    try {
      const saved = localStorage.getItem('nail_itens_agendamento');
      return saved ? JSON.parse(saved) : itensAgendamentoMock;
    } catch (e) {
      console.error(e);
      return itensAgendamentoMock;
    }
  });

  // Estado de Equipe e Autenticação (Sincroniza estritamente conforme o banco e armazenamento local)
  const [equipe, setEquipe] = useState<Usuario[]>(() => {
    try {
      const saved = localStorage.getItem('nail_equipe');
      if (saved) {
        const parsed: Usuario[] = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed.map(u => ({ 
            ...u, 
            especialidade: u.especialidade || (u.perfil === 'admin' ? 'Especialista Master' : 'Designer'),
            senha: u.senha || (u.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin') 
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return equipeInicial.map(u => ({
      ...u,
      especialidade: u.especialidade || (u.perfil === 'admin' ? 'Especialista Master' : 'Designer'),
      senha: u.perfil === 'admin' ? ENV_ADMIN_PASSWORD : (u.senha || 'admin')
    }));
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    try {
      const isSessionAlive = sessionStorage.getItem('nail_session_active') === '1';
      if (isSessionAlive) {
        // A sessão continua viva (o app foi minimizado ou reaberto no mesmo ciclo de vida)
        const savedSession = sessionStorage.getItem('nail_current_user');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.id) return parsed;
        }
        const savedLocal = localStorage.getItem('nail_session_user');
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          if (parsed && parsed.id) {
            sessionStorage.setItem('nail_current_user', savedLocal);
            return parsed;
          }
        }
      } else {
        // App foi completamente fechado/encerrado (cold start)!
        // Limpa para exigir login novamente conforme regra de segurança
        localStorage.removeItem('nail_session_user');
        localStorage.removeItem('nail_current_user');
        sessionStorage.removeItem('nail_current_user');
        sessionStorage.removeItem('nail_session_active');
      }
    } catch (e) {}
    return null;
  });

  // Salva a sessão do usuário com indicador de sessão ativa (mantém ao minimizar/maximizar)
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('nail_session_active', '1');
        sessionStorage.setItem('nail_current_user', JSON.stringify(currentUser));
        localStorage.setItem('nail_session_user', JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem('nail_session_active');
        sessionStorage.removeItem('nail_current_user');
        localStorage.removeItem('nail_session_user');
        localStorage.removeItem('nail_current_user');
      }
    } catch (e) {}
  }, [currentUser]);

  const [despesas, setDespesas] = useState<Despesa[]>(() => {
    const saved = localStorage.getItem('nail_despesas');
    return saved ? JSON.parse(saved) : [
      { id: 'd1', descricao: 'Gel UV X&D e Tips de unha', categoria: 'Materiais', valor: 85, data: '2026-08-24' },
      { id: 'd2', descricao: 'Esmaltes novos tons nude', categoria: 'Materiais', valor: 60, data: '2026-08-26' },
      { id: 'd3', descricao: 'Lixas banana e luvas desc.', categoria: 'Materiais', valor: 45, data: '2026-08-28' }
    ];
  });

  const [categoriasDespesa, setCategoriasDespesa] = useState<string[]>(() => {
    const saved = localStorage.getItem('nail_categorias_despesa');
    return saved ? JSON.parse(saved) : ['Aluguel', 'Energia/Água', 'Materiais', 'Marketing', 'Impostos', 'Outros'];
  });

  const [tecnicas, setTecnicas] = useState<string[]>(() => {
    const saved = localStorage.getItem('nail_tecnicas');
    return saved ? JSON.parse(saved) : ['Gel', 'Fibra de Vidro', 'Banho de Gel', 'Blindagem', 'Esmaltação em Gel', 'Mão Simples'];
  });

  const [formatos, setFormatos] = useState<string[]>(() => {
    const saved = localStorage.getItem('nail_formatos');
    return saved ? JSON.parse(saved) : ['Quadrada', 'Amendoada', 'Oval', 'Stiletto', 'Redonda', 'Bailarina'];
  });

  const [categoriasServico, setCategoriasServico] = useState<string[]>(() => {
    const saved = localStorage.getItem('nail_categorias_servico');
    return saved ? JSON.parse(saved) : ['Alongamento', 'Manutenção', 'Mão Simples', 'Pé Simples', 'Decoração', 'Spa / Cuidado'];
  });

  const [categoriasProduto, setCategoriasProduto] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nail_categorias_produto');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      'Home Care & Pós-Atendimento',
      'Óleos & Hidratação',
      'Esmaltes & Finalizadores',
      'Acessórios & Lixas',
      'Cuidados com Cutículas',
      'Geral'
    ];
  });

  const [materiais, setMateriais] = useState<Material[]>(() => {
    const sanitize = (m: any): Material => {
      const preco = Number(m.preco_compra) || 0;
      const rend = Number(m.rendimento) || 1;
      const custo = (typeof m.custo_por_uso === 'number' && !isNaN(m.custo_por_uso) && m.custo_por_uso > 0)
        ? m.custo_por_uso
        : (rend > 0 ? Number((preco / rend).toFixed(2)) : 0);
      return {
        ...m,
        preco_compra: preco,
        rendimento: rend,
        custo_por_uso: custo
      };
    };

    try {
      const saved = localStorage.getItem('nail_materiais');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitize);
        }
      }
    } catch (e) {}

    return [
      { id: 'm1', nome: 'Gel UV Construtor', marca: 'X&D', preco_compra: 60, rendimento: 15, custo_por_uso: 4 },
      { id: 'm2', nome: 'Tips de Unha (caixa)', marca: 'Gelish', preco_compra: 45, rendimento: 50, custo_por_uso: 0.9 },
      { id: 'm3', nome: 'Esmalte em Gel Nude', marca: 'D&Z', preco_compra: 25, rendimento: 20, custo_por_uso: 1.25 },
      { id: 'm4', nome: 'Prep Higienizador', marca: 'Beltart', preco_compra: 35, rendimento: 70, custo_por_uso: 0.5 },
      { id: 'm5', nome: 'Base Coat Gel', marca: 'Volia', preco_compra: 80, rendimento: 40, custo_por_uso: 2 },
      { id: 'm6', nome: 'Top Coat Selante', marca: 'Volia', preco_compra: 85, rendimento: 40, custo_por_uso: 2.12 }
    ];
  });

  // Produtos e Balcão de Vendas (PDV)
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    try {
      const saved = localStorage.getItem('nail_produtos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'prod_1', nome: 'Óleo Hidratante de Cutículas (Caneta)', marca: 'O.P.I', categoria: 'Home Care', preco_custo: 8.0, preco_venda: 22.0, estoque_atual: 15, estoque_minimo: 5, ativo: true },
      { id: 'prod_2', nome: 'Creme Reparador de Mãos e Pés 60g', marca: 'Granado', categoria: 'Hidratação', preco_custo: 14.5, preco_venda: 35.0, estoque_atual: 8, estoque_minimo: 3, ativo: true },
      { id: 'prod_3', nome: 'Sérum Fortalecedor com Queratina', marca: 'D&Z', categoria: 'Tratamento', preco_custo: 18.0, preco_venda: 45.0, estoque_atual: 10, estoque_minimo: 4, ativo: true },
      { id: 'prod_4', nome: 'Lixa Diamantada Profissional', marca: 'O.P.I', categoria: 'Acessórios', preco_custo: 3.5, preco_venda: 12.0, estoque_atual: 25, estoque_minimo: 8, ativo: true }
    ];
  });

  // Clube de Assinatura Recorrente de Unhas
  const [planosAssinatura, setPlanosAssinatura] = useState<PlanoAssinatura[]>(() => {
    try {
      const saved = localStorage.getItem('nail_planos_assinatura');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'plano_1', nome: 'Clube VIP Manicure Semanal', descricao: '4 atendimentos no mês de Manicure Tradicional ou Mão Simples', preco_mensal: 150.0, qtd_procedimentos_mes: 4, servicos_permitidos_ids: ['s9', 's8'], validade_dias: 30, ativo: true },
      { id: 'plano_2', nome: 'Clube VIP Pé & Mão Completo', descricao: '4 atendimentos no mês com Pé e Mão garantidos', preco_mensal: 280.0, qtd_procedimentos_mes: 4, servicos_permitidos_ids: ['s4', 's8', 's5'], validade_dias: 30, ativo: true },
      { id: 'plano_3', nome: 'Clube Manutenção de Alongamento', descricao: '2 manutenções mensais inclusas com esmaltação', preco_mensal: 190.0, qtd_procedimentos_mes: 2, servicos_permitidos_ids: ['s3', 's2'], validade_dias: 30, ativo: true }
    ];
  });

  // Comissões e Repasses (Salão-Parceiro)
  const [fechamentosComissao, setFechamentosComissao] = useState<FechamentoComissao[]>(() => {
    try {
      const saved = localStorage.getItem('nail_fechamentos_comissao');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Status de Conectividade e Fila Offline (SyncQueue)
  const [syncStatus, setSyncStatus] = useState<{ online: boolean; pendentes: number; sincronizando: boolean }>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendentes: 0,
    sincronizando: false
  });

  // Migração para IndexedDB e ouvinte de conexão na montagem
  useEffect(() => {
    migrarLocalStorageParaIndexedDB();
    const unsub = registrarListenerSync((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  // Salvar no LocalStorage e no IndexedDB sempre que houver modificações
  useEffect(() => {
    localStorage.setItem('nail_produtos', JSON.stringify(produtos));
    dbSetAll(STORES.PRODUTOS, produtos);
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem('nail_categorias_produto', JSON.stringify(categoriasProduto));
  }, [categoriasProduto]);

  useEffect(() => {
    localStorage.setItem('nail_planos_assinatura', JSON.stringify(planosAssinatura));
    dbSetAll(STORES.PLANOS_ASSINATURA, planosAssinatura);
  }, [planosAssinatura]);

  useEffect(() => {
    localStorage.setItem('nail_fechamentos_comissao', JSON.stringify(fechamentosComissao));
    dbSetAll(STORES.COMISSOES, fechamentosComissao);
  }, [fechamentosComissao]);

  useEffect(() => {
    localStorage.setItem('nail_app_seeded', 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('nail_clientes', JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem('nail_despesas', JSON.stringify(despesas));
  }, [despesas]);

  useEffect(() => {
    localStorage.setItem('nail_categorias_despesa', JSON.stringify(categoriasDespesa));
  }, [categoriasDespesa]);

  useEffect(() => {
    localStorage.setItem('nail_tecnicas', JSON.stringify(tecnicas));
  }, [tecnicas]);

  useEffect(() => {
    localStorage.setItem('nail_formatos', JSON.stringify(formatos));
  }, [formatos]);

  useEffect(() => {
    localStorage.setItem('nail_categorias_servico', JSON.stringify(categoriasServico));
  }, [categoriasServico]);

  useEffect(() => {
    localStorage.setItem('nail_materiais', JSON.stringify(materiais));
  }, [materiais]);

  useEffect(() => {
    localStorage.setItem('nail_servicos', JSON.stringify(servicos));
  }, [servicos]);

  useEffect(() => {
    localStorage.setItem('nail_agendamentos', JSON.stringify(agendamentos));

    // Limpeza automática de pagamentos e itens órfãos cujos agendamentos foram excluídos
    const idsValidos = new Set(agendamentos.map(a => a.id));
    setPagamentos(prev => {
      const filtrados = prev.filter(p => !p.agendamento_id || idsValidos.has(p.agendamento_id));
      if (filtrados.length !== prev.length) {
        try { localStorage.setItem('nail_pagamentos', JSON.stringify(filtrados)); } catch (e) {}
        return filtrados;
      }
      return prev;
    });

    setItensAgendamento(prev => {
      let mudou = false;
      const novo: { [key: string]: string[] } = {};
      Object.keys(prev).forEach(key => {
        if (idsValidos.has(key)) {
          novo[key] = prev[key];
        } else {
          mudou = true;
        }
      });
      if (mudou) {
        try { localStorage.setItem('nail_itens_agendamento', JSON.stringify(novo)); } catch (e) {}
        return novo;
      }
      return prev;
    });
  }, [agendamentos]);

  useEffect(() => {
    localStorage.setItem('nail_pagamentos', JSON.stringify(pagamentos));
  }, [pagamentos]);

  useEffect(() => {
    localStorage.setItem('nail_lista_espera', JSON.stringify(listaEspera));
  }, [listaEspera]);

  useEffect(() => {
    localStorage.setItem('nail_config_salao', JSON.stringify(configSalao));
  }, [configSalao]);

  useEffect(() => {
    localStorage.setItem('nail_itens_agendamento', JSON.stringify(itensAgendamento));
  }, [itensAgendamento]);

  useEffect(() => {
    localStorage.setItem('nail_equipe', JSON.stringify(equipe));
  }, [equipe]);

  // Estado de Sincronização em Nuvem (Supabase)
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

  // Sincronização em Nuvem (Supabase): Torna o banco na nuvem a fonte definitiva da verdade
  const sincronizarComNuvem = async (forcarSobrescrita = true): Promise<{ sucesso: boolean; mensagem: string }> => {
    setIsSyncingCloud(true);
    try {
      const dados = await carregarDadosNuvemSupabase();
      if (!dados) {
        setIsSyncingCloud(false);
        return { sucesso: false, mensagem: 'Não foi possível conectar ao banco Supabase.' };
      }

      // 1. Clientes da Nuvem (mescla inteligente preservando anamnese e assinatura sincronizada com os planos)
      const planosNuvemRef = dados.configuracoes?.config_salao?.planos_assinatura || dados.configuracoes?.planos_assinatura || planosAssinatura;

      if (dados.clientes && dados.clientes.length > 0) {
        setClientes(prevClientes => {
          const clientesMesclados = dados.clientes.map((cNu: any) => {
            const cLocal = prevClientes.find(p => p.id === cNu.id);
            const anamnese = cNu.anamnese || cNu.preferencias?.anamnese || cLocal?.anamnese;
            let assinatura = cNu.assinatura || cNu.preferencias?.assinatura || cLocal?.assinatura;

            // Sincroniza a frequência e identificadores com o plano cadastrado na nuvem
            if (assinatura && Array.isArray(planosNuvemRef)) {
              const planoCorrespondente = planosNuvemRef.find((p: any) => p.id === assinatura.plano_id)
                || planosNuvemRef.find((p: any) => p.nome?.trim().toLowerCase() === assinatura.nome_plano?.trim().toLowerCase());
              if (planoCorrespondente) {
                const f = planoCorrespondente.frequencia_dias || 7;
                const fNorm = Math.max(7, Math.round(f / 7) * 7);
                const divergente = !assinatura.frequencia_dias || assinatura.frequencia_dias !== fNorm || assinatura.plano_id !== planoCorrespondente.id;
                assinatura = {
                  ...assinatura,
                  plano_id: planoCorrespondente.id,
                  nome_plano: planoCorrespondente.nome,
                  frequencia_dias: fNorm,
                  total_mes: planoCorrespondente.qtd_procedimentos_mes || assinatura.total_mes
                };
                if (divergente) {
                  salvarClienteSupabase({
                    ...cNu,
                    anamnese,
                    assinatura
                  }).catch(() => {});
                }
              }
            }

            return {
              ...cNu,
              anamnese,
              assinatura
            };
          });

          try { localStorage.setItem('nail_clientes', JSON.stringify(clientesMesclados)); } catch (e) {}
          dbSetAll(STORES.CLIENTES, clientesMesclados);

          return clientesMesclados;
        });
      }

      // 2. Agendamentos da Nuvem
      if (dados.agendamentos && dados.agendamentos.length > 0) {
        const agendamentosValidos = dados.agendamentos.filter((a: any) => 
          !(a.cliente_id === 'bloqueado' && a.status === 'cancelado') && 
          a.motivo_cancelamento !== 'EXCLUIDO_ADMIN'
        );

        // Hidrata pago_com_clube, plano_id e reconcilia o valor do plano VIP na Sessão 1 se estiver zerado ou divergente
        const agsFormatados = agendamentosValidos.map((a: any) => {
          const isVip = !!(a.pago_com_clube || a.observacoes?.includes('Clube VIP') || a.observacoes?.includes('👑'));
          const isSessao1Vip = isVip && (a.observacoes?.includes('Sessão 1') || a.observacoes?.includes('[👑 Adesão Clube VIP:')) && !a.observacoes?.includes('Sessão 2') && !a.observacoes?.includes('Sessão 3') && !a.observacoes?.includes('Sessão 4');

          const cliCorrespondente = dados.clientes?.find((c: any) => c.id === a.cliente_id);
          const planoIdTag = a.observacoes?.match(/\[PLANO_ID:([a-zA-Z0-9_\-]+)\]/i)?.[1];
          const planoIdEfetivo = a.plano_id || planoIdTag || cliCorrespondente?.assinatura?.plano_id;

          let valorEfetivo = Number(a.valor_total) || 0;
          let planoIdFinal = planoIdEfetivo;

          if (isSessao1Vip && Array.isArray(planosNuvemRef)) {
            const planoEncontrado = encontrarPlanoVip(planoIdEfetivo, cliCorrespondente?.assinatura, a.observacoes, planosNuvemRef);
            if (planoEncontrado && planoEncontrado.preco_mensal > 0) {
              planoIdFinal = planoEncontrado.id;
              if (valorEfetivo === 0 || valorEfetivo !== planoEncontrado.preco_mensal) {
                valorEfetivo = planoEncontrado.preco_mensal;
                salvarAgendamentoSupabase({ ...a, valor_total: valorEfetivo, pago_com_clube: true }).catch(() => {});
              }
            }
          }

          return {
            ...a,
            valor_total: valorEfetivo,
            pago_com_clube: isVip,
            plano_id: planoIdFinal
          };
        });

        setAgendamentos(agsFormatados);
        try { localStorage.setItem('nail_agendamentos', JSON.stringify(agsFormatados)); } catch (e) {}

        // Hidrata itensAgendamento a partir de itens_servicos de cada agendamento
        const novosItensAgendamento: { [key: string]: string[] } = {};
        agendamentosValidos.forEach((a: any) => {
          if (a.itens_servicos && Array.isArray(a.itens_servicos) && a.itens_servicos.length > 0) {
            novosItensAgendamento[a.id] = a.itens_servicos;
          }
        });
        if (Object.keys(novosItensAgendamento).length > 0) {
          setItensAgendamento(prev => {
            const merged = { ...prev, ...novosItensAgendamento };
            try { localStorage.setItem('nail_itens_agendamento', JSON.stringify(merged)); } catch (e) {}
            return merged;
          });
        }
      } else if (forcarSobrescrita && dados.agendamentos && dados.agendamentos.length === 0) {
        setAgendamentos([]);
        try { localStorage.setItem('nail_agendamentos', JSON.stringify([])); } catch (e) {}
      }

      // 3. Lista de Espera da Nuvem
      if (dados.listaEspera) {
        setListaEspera(dados.listaEspera);
        try { localStorage.setItem('nail_lista_espera', JSON.stringify(dados.listaEspera)); } catch (e) {}
      }

      // 4. Serviços da Nuvem (com regras de sinal e intervalo de manutenção preservados)
      if (dados.servicos && dados.servicos.length > 0) {
        setServicos(prevServicos => {
          const servicosFormatados = dados.servicos
            .filter((s: any) => s.ativo !== false)
            .map((s: any) => {
              const { descricao: cleanDesc, extra } = decodeServicoDescricao(s.descricao);
              const dias = Number(s.intervalo_manutencao_dias !== undefined ? s.intervalo_manutencao_dias : (s.retorno_dias ?? 0));
              const local = prevServicos.find(p => p.id === s.id);
              const isPacote = s.is_pacote !== undefined 
                ? Boolean(s.is_pacote) 
                : (extra.is_pacote !== undefined ? Boolean(extra.is_pacote) : (local?.is_pacote ?? false));

              const servicosPacote = (s.servicos_pacote && s.servicos_pacote.length > 0)
                ? s.servicos_pacote
                : (s.itens_combo && s.itens_combo.length > 0)
                  ? s.itens_combo
                  : (extra.servicos_pacote && extra.servicos_pacote.length > 0)
                    ? extra.servicos_pacote
                    : (local?.servicos_pacote || []);

              const pacoteDetalhes = (extra.servicos_pacote_detalhes && extra.servicos_pacote_detalhes.length > 0)
                ? extra.servicos_pacote_detalhes
                : (s.servicos_pacote_detalhes && s.servicos_pacote_detalhes.length > 0)
                  ? s.servicos_pacote_detalhes
                  : (local?.servicos_pacote_detalhes && local.servicos_pacote_detalhes.length > 0)
                    ? local.servicos_pacote_detalhes
                    : servicosPacote.map((subId: string) => ({ servico_id: subId, quantidade: 1 }));

              const catFinal = s.categoria || extra.categoria || local?.categoria || 'Geral';

              return {
                ...s,
                categoria: catFinal,
                is_pacote: isPacote,
                servicos_pacote: servicosPacote,
                servicos_pacote_detalhes: pacoteDetalhes,
                descricao: cleanDesc,
                duracao_minutos: Number(s.duracao_minutos) || 60,
                preco: Number(s.preco) || 0,
                intervalo_manutencao_dias: dias,
                retorno_dias: dias,
                sinal_tipo: extra.sinal_tipo || s.sinal_tipo || local?.sinal_tipo || 'nenhum',
                sinal_valor: Number(extra.sinal_valor !== undefined ? extra.sinal_valor : (s.sinal_valor !== undefined ? s.sinal_valor : (local?.sinal_valor ?? 0))),
                materiais_utilizados: extra.materiais_utilizados || s.materiais_utilizados || local?.materiais_utilizados || [],
                foto: extra.foto || s.foto || local?.foto || '',
                foto_thumb: extra.foto_thumb || s.foto_thumb || local?.foto_thumb || '',
                fotos: extra.fotos || s.fotos || local?.fotos || [],
                destaque_catalogo: extra.destaque_catalogo !== undefined ? extra.destaque_catalogo : (s.destaque_catalogo !== undefined ? s.destaque_catalogo : (local?.destaque_catalogo ?? false)),
                itens_inclusos: extra.itens_inclusos || local?.itens_inclusos || undefined,
                orientacoes_agendamento: extra.orientacoes_agendamento || local?.orientacoes_agendamento || undefined
              };
            });
          try { localStorage.setItem('nail_servicos', JSON.stringify(servicosFormatados)); } catch (e) {}
          dbSetAll(STORES.SERVICOS, servicosFormatados);
          return servicosFormatados;
        });
      }

      // 5. Equipe / Profissionais da Nuvem
      const equipeConfigSalao = dados.configuracoes?.config_salao?.equipe;
      const listaEquipeNuvem = (equipeConfigSalao && equipeConfigSalao.length > 0)
        ? equipeConfigSalao
        : (dados.configuracoes?.equipe && dados.configuracoes.equipe.length > 0)
          ? dados.configuracoes.equipe
          : dados.usuarios;

      if (listaEquipeNuvem && listaEquipeNuvem.length > 0) {
        const usuariosComSenha = listaEquipeNuvem.map((u: any) => {
          const salvoEmConfig = equipeConfigSalao?.find((c: any) => c.id === u.id);
          const servsHabilitados = (u.servicos_habilitados && Array.isArray(u.servicos_habilitados) && u.servicos_habilitados.length > 0)
            ? u.servicos_habilitados
            : (salvoEmConfig?.servicos_habilitados || []);

          return {
            ...u,
            senha: u.senha || (u.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin'),
            servicos_habilitados: servsHabilitados,
            horario_almoco_ativo: u.horario_almoco_ativo !== undefined ? u.horario_almoco_ativo : (salvoEmConfig?.horario_almoco_ativo !== undefined ? salvoEmConfig.horario_almoco_ativo : true),
            horario_almoco_inicio: u.horario_almoco_inicio || salvoEmConfig?.horario_almoco_inicio || '12:00',
            horario_almoco_fim: u.horario_almoco_fim || salvoEmConfig?.horario_almoco_fim || '13:00'
          };
        });

        setEquipe(usuariosComSenha);
        try { localStorage.setItem('nail_equipe', JSON.stringify(usuariosComSenha)); } catch (e) {}
      }

      // 6. Materiais da Nuvem (calculando custo_por_uso para evitar NaN)
      if (dados.materiais && dados.materiais.length > 0) {
        const matsFormatados = dados.materiais.map((m: any) => {
          const preco = Number(m.preco_compra) || 0;
          const rend = Number(m.rendimento) || 1;
          const custo = (typeof m.custo_por_uso === 'number' && !isNaN(m.custo_por_uso) && m.custo_por_uso > 0)
            ? m.custo_por_uso
            : (rend > 0 ? Number((preco / rend).toFixed(2)) : 0);
          return {
            ...m,
            preco_compra: preco,
            rendimento: rend,
            custo_por_uso: custo
          };
        });
        setMateriais(matsFormatados);
        try { localStorage.setItem('nail_materiais', JSON.stringify(matsFormatados)); } catch (e) {}
      }

      // 8. Despesas da Nuvem
      if (dados.despesas && dados.despesas.length > 0) {
        setDespesas(dados.despesas);
        try { localStorage.setItem('nail_despesas', JSON.stringify(dados.despesas)); } catch (e) {}
      }

      // 9. Configurações Gerais do Salão (Técnicas, Formatos, Categorias)
      if (dados.configuracoes) {
        if (dados.configuracoes.config_salao) {
          const cfg = {
            ...dados.configuracoes.config_salao,
            regra_devolucao_sinal: dados.configuracoes.config_salao.regra_devolucao_sinal || REGRA_DEVOLUCAO_PADRAO,
            regras: {
              ...dados.configuracoes.config_salao.regras,
              alerta_sonoro_ativo: dados.configuracoes.config_salao.regras?.alerta_sonoro_ativo !== false,
              alerta_visual_ativo: dados.configuracoes.config_salao.regras?.alerta_visual_ativo !== false
            }
          };
          setConfigSalao(cfg);
          try { localStorage.setItem('nail_config_salao', JSON.stringify(cfg)); } catch (e) {}

          // Sincronização de Avisos Não Lidos da Nuvem para este Aparelho (Fonte da Verdade: Nuvem)
          const avisosNuvem = dados.configuracoes.config_salao.avisos_nao_lidos;
          if (Array.isArray(avisosNuvem)) {
            setAvisosNaoLidos(prev => {
              const idsLocais = new Set(prev.map(a => a.id));
              const novissimos = avisosNuvem.filter(a => !idsLocais.has(a.id));
              const disparados = getAvisosDisparadosSet();

              novissimos.forEach(av => {
                if (!av.lido && !disparados.has(av.id) && (!av.agendamentoId || !disparados.has(av.agendamentoId))) {
                  registrarAvisoDisparado(av.id);
                  if (av.agendamentoId) registrarAvisoDisparado(av.agendamentoId);
                  dispararNotificacaoBarraStatus(av.titulo, av.mensagem, av.detalhes, av.agendamentoId);
                  tocarAlertaSonoro();
                  setNotificacaoClienteAcao({
                    id: av.id,
                    hora: av.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    tipo: av.tipo,
                    titulo: av.titulo,
                    mensagem: av.mensagem,
                    detalhes: av.detalhes,
                    agendamentoId: av.agendamentoId,
                    listaEsperaId: av.listaEsperaId,
                    clienteNome: av.clienteNome
                  });
                  setTimeout(() => {
                    setNotificacaoClienteAcao(p => (p?.id === av.id ? null : p));
                  }, 9000);
                }
              });
              salvarAvisosLocalStorage(avisosNuvem);
              return avisosNuvem;
            });
          }
        }
        if (dados.configuracoes.tecnicas && dados.configuracoes.tecnicas.length > 0) {
          setTecnicas(dados.configuracoes.tecnicas);
          try { localStorage.setItem('nail_tecnicas', JSON.stringify(dados.configuracoes.tecnicas)); } catch (e) {}
        } else if (tecnicas.length > 0) {
          salvarConfiguracoesSupabase({ tecnicas }).catch(() => {});
        }

        if (dados.configuracoes.formatos && dados.configuracoes.formatos.length > 0) {
          setFormatos(dados.configuracoes.formatos);
          try { localStorage.setItem('nail_formatos', JSON.stringify(dados.configuracoes.formatos)); } catch (e) {}
        } else if (formatos.length > 0) {
          salvarConfiguracoesSupabase({ formatos }).catch(() => {});
        }

        if (dados.configuracoes.categorias_servico && dados.configuracoes.categorias_servico.length > 0) {
          setCategoriasServico(dados.configuracoes.categorias_servico);
          try { localStorage.setItem('nail_categorias_servico', JSON.stringify(dados.configuracoes.categorias_servico)); } catch (e) {}
        } else if (categoriasServico.length > 0) {
          salvarConfiguracoesSupabase({ categoriasServico }).catch(() => {});
        }

        if (dados.configuracoes.categorias_despesa && dados.configuracoes.categorias_despesa.length > 0) {
          setCategoriasDespesa(dados.configuracoes.categorias_despesa);
          try { localStorage.setItem('nail_categorias_despesa', JSON.stringify(dados.configuracoes.categorias_despesa)); } catch (e) {}
        } else if (categoriasDespesa.length > 0) {
          salvarConfiguracoesSupabase({ categoriasDespesa }).catch(() => {});
        }

        const catProdNuvem = dados.configuracoes.config_salao?.categorias_produto || dados.configuracoes.categorias_produto;
        if (catProdNuvem && catProdNuvem.length > 0) {
          setCategoriasProduto(catProdNuvem);
          try { localStorage.setItem('nail_categorias_produto', JSON.stringify(catProdNuvem)); } catch (e) {}
        } else if (categoriasProduto.length > 0) {
          salvarConfiguracoesSupabase({ categoriasProduto }).catch(() => {});
        }

        // 10. Planos de Assinatura VIP da Nuvem
        const planosNuvem = dados.configuracoes.config_salao?.planos_assinatura || dados.configuracoes.planos_assinatura;
        if (Array.isArray(planosNuvem) && planosNuvem.length > 0) {
          setPlanosAssinatura(planosNuvem);
          try { localStorage.setItem('nail_planos_assinatura', JSON.stringify(planosNuvem)); } catch (e) {}
          dbSetAll(STORES.PLANOS_ASSINATURA, planosNuvem);
        } else if (planosAssinatura.length > 0) {
          // Garante backup imediato dos planos locais para a nuvem
          salvarConfiguracoesSupabase({ planosAssinatura }).catch(() => {});
        }

        // 11. Produtos e Balcão PDV da Nuvem
        const produtosNuvem = dados.configuracoes.config_salao?.produtos || dados.configuracoes.produtos;
        if (Array.isArray(produtosNuvem) && produtosNuvem.length > 0) {
          setProdutos(produtosNuvem);
          try { localStorage.setItem('nail_produtos', JSON.stringify(produtosNuvem)); } catch (e) {}
          dbSetAll(STORES.PRODUTOS, produtosNuvem);
        } else if (produtos.length > 0) {
          salvarConfiguracoesSupabase({ produtos }).catch(() => {});
        }
      }

      const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastCloudSyncTime(agora);
      setIsSyncingCloud(false);
      const totalItens = (dados.clientes?.length || 0) + (dados.agendamentos?.length || 0) + (dados.servicos?.length || 0);
      return { 
        sucesso: true, 
        mensagem: totalItens > 0 
          ? `Sincronização com o Supabase concluída com sucesso às ${agora}! (${totalItens} registros baixados)`
          : `Conectado ao Supabase com sucesso às ${agora}! O banco na nuvem ainda não possui registros.`
      };
    } catch (e: any) {
      console.error('Erro na sincronizacao com Supabase:', e);
      setIsSyncingCloud(false);
      return { sucesso: false, mensagem: e.message || 'Erro ao sincronizar com a nuvem.' };
    }
  };

  // Enviar todos os dados locais para a nuvem Supabase (Upload Forçado)
  const enviarDadosParaNuvem = async (): Promise<{ sucesso: boolean; mensagem: string }> => {
    setIsSyncingCloud(true);
    try {
      let clientesSalvos = 0;
      let agendamentosSalvos = 0;
      let servicosSalvos = 0;
      let materiaisSalvos = 0;
      let despesasSalvas = 0;

      for (const c of clientes) {
        await salvarClienteSupabase(c);
        clientesSalvos++;
      }

      for (const s of servicos) {
        await salvarServicoSupabase(s);
        servicosSalvos++;
      }

      for (const m of materiais) {
        await salvarMaterialSupabase(m);
        materiaisSalvos++;
      }

      for (const d of despesas) {
        await salvarDespesaSupabase(d);
        despesasSalvas++;
      }

      await salvarConfiguracoesSupabase({
        configSalao,
        tecnicas,
        formatos,
        categoriasServico,
        categoriasDespesa,
        categoriasProduto,
        equipe,
        planosAssinatura,
        produtos
      });

      for (const u of equipe) {
        try {
          await supabase.from('usuarios').upsert(u);
        } catch (e) {}
      }

      for (const a of agendamentos) {
        const sIds = itensAgendamento[a.id] || [];
        await salvarAgendamentoSupabase(a, sIds);
        agendamentosSalvos++;
      }

      for (const l of listaEspera) {
        await salvarListaEsperaSupabase(l);
      }

      const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastCloudSyncTime(agora);
      setIsSyncingCloud(false);
      return {
        sucesso: true,
        mensagem: `Upload concluído com sucesso às ${agora}! (${clientesSalvos} clientes, ${servicosSalvos} serviços, ${materiaisSalvos} materiais, ${despesasSalvas} despesas, ${agendamentosSalvos} agendamentos salvos na nuvem)`
      };
    } catch (e: any) {
      console.error('Erro ao enviar dados para a nuvem:', e);
      setIsSyncingCloud(false);
      return { sucesso: false, mensagem: e.message || 'Erro ao enviar dados para a nuvem.' };
    }
  };

  // Sincronização Automática na Abertura do App + Ouvinte em Tempo Real (Realtime)
  useEffect(() => {
    // 1. Prioridade Máxima: busca imediatamente os dados mais recentes na nuvem
    sincronizarComNuvem(false);

    // 2. Escuta alterações em tempo real vindas de qualquer dispositivo ou cliente
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setAgendamentos(prev => {
            if (prev.some(a => a.id === payload.new.id)) return prev;
            return [payload.new as Agendamento, ...prev];
          });
          if (payload.new?.origem === 'cliente') {
            const cli = clientes.find(c => c.id === payload.new.cliente_id);
            const cliNome = cli?.nome || 'Cliente';
            const dataFmt = payload.new.inicio ? new Date(payload.new.inicio).toLocaleDateString('pt-BR') : '';
            const horaFmt = payload.new.inicio?.split('T')[1]?.substring(0, 5) || '';

            dispararNotificacaoCliente({
              tipo: 'agendamento',
              titulo: 'Novo Agendamento Recebido! 💅',
              mensagem: `${cliNome} agendou para ${dataFmt} às ${horaFmt}.`,
              detalhes: `Código #${payload.new.id} • ${payload.new.valor_sinal > 0 ? 'Aguardando sinal Pix' : 'Confirmado'}`,
              agendamentoId: payload.new.id,
              clienteNome: cliNome
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          setAgendamentos(prev => {
            const anterior = prev.find(a => a.id?.toLowerCase() === payload.new.id?.toLowerCase());
            const atualizados = prev.map(a => (a.id && a.id.toLowerCase() === payload.new.id?.toLowerCase()) ? { ...a, ...payload.new } : a);
            try { localStorage.setItem('nail_agendamentos', JSON.stringify(atualizados)); } catch (e) {}

            if (payload.new.status === 'confirmado') {
              // Sincroniza pagamentos do sinal pendentes
              setPagamentos(prevPag => {
                const temPendente = prevPag.some(p => p.agendamento_id === payload.new.id && p.status === 'pendente');
                if (temPendente) {
                  return prevPag.map(p => (p.agendamento_id === payload.new.id && p.status === 'pendente')
                    ? { ...p, status: 'sinal pago', data_pagamento: new Date().toISOString() }
                    : p
                  );
                }
                return prevPag;
              });

              // SÓ dispara som e popup se a confirmação foi feita pelo CLIENTE na página pública
              if (anterior && anterior.status !== 'confirmado' && payload.new.confirmado_por === 'cliente') {
                dispararNotificacaoCliente({
                  tipo: 'confirmacao',
                  titulo: 'Presença Confirmada! ✅',
                  mensagem: `A cliente confirmou o agendamento #${payload.new.id}.`,
                  detalhes: 'Status confirmado pela página pública.',
                  agendamentoId: payload.new.id
                });
              }
            } else if (payload.new.status === 'cancelado') {
              setPagamentos(prevPag => prevPag.map(p => (p.agendamento_id === payload.new.id && p.status === 'pendente')
                ? { ...p, status: 'estornado' }
                : p
              ));

              if (anterior && anterior.status !== 'cancelado' && payload.new.cancelado_por === 'cliente') {
                dispararNotificacaoCliente({
                  tipo: 'cancelamento',
                  titulo: 'Horário Cancelado ❌',
                  mensagem: `A cliente solicitou cancelamento do agendamento #${payload.new.id}.`,
                  detalhes: payload.new.motivo_cancelamento ? `Motivo: ${payload.new.motivo_cancelamento}` : 'Horário liberado na agenda.',
                  agendamentoId: payload.new.id
                });
              }
            } else if (payload.new.status === 'pendente') {
              setPagamentos(prevPag => {
                const existente = prevPag.find(p => p.agendamento_id === payload.new.id);
                if (existente) {
                  return prevPag.map(p => p.id === existente.id ? { ...p, status: 'pendente' } : p);
                }
                const valSinal = payload.new.valor_sinal || payload.new.valor_total || 0;
                const novoPag: Pagamento = {
                  id: 'p_' + gerarId(),
                  agendamento_id: payload.new.id,
                  tipo: 'pix',
                  valor: valSinal,
                  status: 'pendente',
                  data_pagamento: payload.new.inicio || new Date().toISOString()
                };
                return [...prevPag, novoPag];
              });
            }

            return atualizados;
          });
        } else if (payload.eventType === 'DELETE') {
          setAgendamentos(prev => {
            const filtrados = prev.filter(a => a.id && a.id.toLowerCase() !== payload.old?.id?.toLowerCase());
            try { localStorage.setItem('nail_agendamentos', JSON.stringify(filtrados)); } catch (e) {}
            return filtrados;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setListaEspera(prev => {
            if (prev.some(l => l.id === payload.new.id)) return prev;
            return [payload.new as ListaEspera, ...prev];
          });
          dispararNotificacaoCliente({
            tipo: 'espera',
            titulo: 'Nova Solicitação na Lista de Espera ⏳',
            mensagem: `A cliente ${payload.new.nome || 'Cliente'} entrou na fila de espera.`,
            detalhes: `Período: ${payload.new.periodo_preferido || 'qualquer'}`,
            listaEsperaId: payload.new.id,
            clienteNome: payload.new.nome
          });
        } else if (payload.eventType === 'UPDATE') {
          setListaEspera(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setClientes(prev => {
            const map = new Map(prev.map(c => [c.id, c]));
            map.set(payload.new.id, payload.new as Cliente);
            return Array.from(map.values());
          });
        } else if (payload.eventType === 'DELETE') {
          setClientes(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos' }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setServicos(prev => {
            const raw = payload.new;
            const { descricao: cleanDesc, extra } = decodeServicoDescricao(raw.descricao);
            const dias = Number(raw.intervalo_manutencao_dias !== undefined ? raw.intervalo_manutencao_dias : (raw.retorno_dias ?? 0));
            const existing = prev.find(s => s.id === raw.id);
            const isPacote = raw.is_pacote !== undefined 
              ? Boolean(raw.is_pacote) 
              : (extra.is_pacote !== undefined ? Boolean(extra.is_pacote) : (existing?.is_pacote ?? false));

            const servicosPacote = (raw.servicos_pacote && raw.servicos_pacote.length > 0)
              ? raw.servicos_pacote
              : (raw.itens_combo && raw.itens_combo.length > 0)
                ? raw.itens_combo
                : (extra.servicos_pacote && extra.servicos_pacote.length > 0)
                  ? extra.servicos_pacote
                  : (existing?.servicos_pacote || []);

            const pacoteDetalhes = (extra.servicos_pacote_detalhes && extra.servicos_pacote_detalhes.length > 0)
              ? extra.servicos_pacote_detalhes
              : (raw.servicos_pacote_detalhes && raw.servicos_pacote_detalhes.length > 0)
                ? raw.servicos_pacote_detalhes
                : (existing?.servicos_pacote_detalhes && existing.servicos_pacote_detalhes.length > 0)
                  ? existing.servicos_pacote_detalhes
                  : servicosPacote.map((subId: string) => ({ servico_id: subId, quantidade: 1 }));

            const catFinal = raw.categoria || extra.categoria || existing?.categoria || 'Geral';

            const formatado: Servico = {
              ...raw,
              categoria: catFinal,
              is_pacote: isPacote,
              servicos_pacote: servicosPacote,
              servicos_pacote_detalhes: pacoteDetalhes,
              descricao: cleanDesc,
              duracao_minutos: Number(raw.duracao_minutos) || 60,
              preco: Number(raw.preco) || 0,
              intervalo_manutencao_dias: dias,
              retorno_dias: dias,
              sinal_tipo: extra.sinal_tipo || raw.sinal_tipo || existing?.sinal_tipo || 'nenhum',
              sinal_valor: Number(extra.sinal_valor !== undefined ? extra.sinal_valor : (raw.sinal_valor !== undefined ? raw.sinal_valor : (existing?.sinal_valor ?? 0))),
              materiais_utilizados: extra.materiais_utilizados || raw.materiais_utilizados || existing?.materiais_utilizados || [],
              foto: extra.foto || raw.foto || existing?.foto || '',
              foto_thumb: extra.foto_thumb || raw.foto_thumb || existing?.foto_thumb || '',
              fotos: extra.fotos || raw.fotos || existing?.fotos || [],
              destaque_catalogo: extra.destaque_catalogo !== undefined ? extra.destaque_catalogo : (raw.destaque_catalogo !== undefined ? raw.destaque_catalogo : (existing?.destaque_catalogo ?? false)),
              itens_inclusos: extra.itens_inclusos || existing?.itens_inclusos || undefined,
              orientacoes_agendamento: extra.orientacoes_agendamento || existing?.orientacoes_agendamento || undefined
            };
            const map = new Map(prev.map(s => [s.id, s]));
            map.set(formatado.id, formatado);
            return Array.from(map.values());
          });
        } else if (payload.eventType === 'DELETE') {
          setServicos(prev => prev.filter(s => s.id !== payload.old?.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, (payload: any) => {
        if (payload.new?.config_salao) {
          const cfg = payload.new.config_salao;
          if (cfg) {
            setConfigSalao(prev => ({ ...prev, ...cfg }));
            try { localStorage.setItem('nail_config_salao', JSON.stringify(cfg)); } catch (e) {}
          }

          const planosNuvem = payload.new.config_salao?.planos_assinatura || payload.new.planos_assinatura;
          if (Array.isArray(planosNuvem) && planosNuvem.length > 0) {
            setPlanosAssinatura(planosNuvem);
            try { localStorage.setItem('nail_planos_assinatura', JSON.stringify(planosNuvem)); } catch (e) {}
            dbSetAll(STORES.PLANOS_ASSINATURA, planosNuvem);
          }

          const produtosNuvem = payload.new.config_salao?.produtos || payload.new.produtos;
          if (Array.isArray(produtosNuvem) && produtosNuvem.length > 0) {
            setProdutos(produtosNuvem);
            try { localStorage.setItem('nail_produtos', JSON.stringify(produtosNuvem)); } catch (e) {}
            dbSetAll(STORES.PRODUTOS, produtosNuvem);
          }

          const avisosNuvem = payload.new.config_salao?.avisos_nao_lidos;
          if (Array.isArray(avisosNuvem)) {
            setAvisosNaoLidos(prev => {
              // Identifica avisos novos que acabaram de chegar da nuvem
              const idsLocais = new Set(prev.map(a => a.id));
              const novissimos = avisosNuvem.filter(a => !idsLocais.has(a.id));
              const disparados = getAvisosDisparadosSet();

              // Dispara alarme e banner no topo do aparelho para avisos não lidos novos
              novissimos.forEach(av => {
                if (!av.lido && !disparados.has(av.id) && (!av.agendamentoId || !disparados.has(av.agendamentoId))) {
                  registrarAvisoDisparado(av.id);
                  if (av.agendamentoId) registrarAvisoDisparado(av.agendamentoId);
                  dispararNotificacaoBarraStatus(av.titulo, av.mensagem, av.detalhes, av.agendamentoId);
                  tocarAlertaSonoro();
                  setNotificacaoClienteAcao({
                    id: av.id,
                    hora: av.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    tipo: av.tipo,
                    titulo: av.titulo,
                    mensagem: av.mensagem,
                    detalhes: av.detalhes,
                    agendamentoId: av.agendamentoId,
                    listaEsperaId: av.listaEsperaId,
                    clienteNome: av.clienteNome
                  });
                  setTimeout(() => {
                    setNotificacaoClienteAcao(p => (p?.id === av.id ? null : p));
                  }, 9000);
                }
              });

              salvarAvisosLocalStorage(avisosNuvem);
              return avisosNuvem;
            });
          }
        }
      })
      .subscribe();

    // 3. Ouvinte BroadcastChannel entre abas (comunicação instantânea 0ms)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('nail_agenda_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'PLANOS_UPDATED' && Array.isArray(event.data.planos)) {
            setPlanosAssinatura(event.data.planos);
            try { localStorage.setItem('nail_planos_assinatura', JSON.stringify(event.data.planos)); } catch (e) {}
            dbSetAll(STORES.PLANOS_ASSINATURA, event.data.planos);
          }

          if (event.data?.type === 'STATUS_UPDATED') {
            const { id, status, canceladoPor, motivo, confirmadoPor } = event.data;
            setAgendamentos(prev => prev.map(a => {
              if (a.id && a.id.toLowerCase() === id.toLowerCase()) {
                return {
                  ...a,
                  status,
                  ...(canceladoPor ? { cancelado_por: canceladoPor } : {}),
                  ...(motivo ? { motivo_cancelamento: motivo } : {}),
                  ...(confirmadoPor ? { confirmado_por: confirmadoPor } : {})
                };
              }
              return a;
            }));

            if (status === 'confirmado') {
              setPagamentos(prevPag => {
                const temPendente = prevPag.some(p => p.agendamento_id === id && p.status === 'pendente');
                if (temPendente) {
                  return prevPag.map(p => (p.agendamento_id === id && p.status === 'pendente')
                    ? { ...p, status: 'sinal pago', data_pagamento: new Date().toISOString() }
                    : p
                  );
                }
                return prevPag;
              });

              // Só notifica se foi confirmado pelo CLIENTE na página pública
              if (confirmadoPor === 'cliente') {
                dispararNotificacaoCliente({
                  tipo: 'confirmacao',
                  titulo: 'Presença Confirmada! ✅',
                  mensagem: `A cliente confirmou o agendamento #${id}.`,
                  agendamentoId: id
                });
              }
            } else if (status === 'cancelado') {
              setPagamentos(prevPag => prevPag.map(p => (p.agendamento_id === id && p.status === 'pendente')
                ? { ...p, status: 'estornado' }
                : p
              ));

              if (canceladoPor === 'cliente') {
                dispararNotificacaoCliente({
                  tipo: 'cancelamento',
                  titulo: 'Agendamento Cancelado ❌',
                  mensagem: `A cliente cancelou o agendamento #${id}.`,
                  detalhes: motivo ? `Motivo: ${motivo}` : undefined,
                  agendamentoId: id
                });
              }
            } else if (status === 'pendente') {
              setPagamentos(prevPag => {
                const existente = prevPag.find(p => p.agendamento_id === id);
                if (existente) {
                  return prevPag.map(p => p.id === existente.id ? { ...p, status: 'pendente' } : p);
                }
                const ag = agendamentos.find(a => a.id === id);
                const valSinal = ag ? (ag.valor_sinal || ag.valor_total || 0) : 0;
                const novoPag: Pagamento = {
                  id: 'p_' + gerarId(),
                  agendamento_id: id,
                  tipo: 'pix',
                  valor: valSinal,
                  status: 'pendente',
                  data_pagamento: ag?.inicio || new Date().toISOString()
                };
                return [...prevPag, novoPag];
              });
            }
          } else if (event.data?.type === 'VALOR_SINAL_UPDATED') {
            const { id, valorSinal } = event.data;
            setAgendamentos(prev => prev.map(a => {
              if (a.id && a.id.toLowerCase() === id.toLowerCase()) {
                return {
                  ...a,
                  valor_sinal: Number(valorSinal) || 0
                };
              }
              return a;
            }));
          } else if (event.data?.type === 'CLIENTE_ACAO') {
            if (event.data.notificacao) {
              dispararNotificacaoCliente(event.data.notificacao);
            }
          }
        };
      }
    } catch (err) {}

    // 4. Ouvinte Supabase Realtime Broadcast Multi-Dispositivos (comunicação instantânea pela nuvem < 50ms)
    const realtimeBroadcastChannel = getRealtimeBroadcastChannel()
      .on('broadcast', { event: 'CLIENTE_ACAO' }, (event: any) => {
        if (event.payload) {
          dispararNotificacaoCliente(event.payload);
          sincronizarComNuvem(false);
        }
      })
      .on('broadcast', { event: 'AVISOS_SYNC' }, (event: any) => {
        if (event.payload?.avisos && Array.isArray(event.payload.avisos)) {
          setAvisosNaoLidos(event.payload.avisos);
          salvarAvisosLocalStorage(event.payload.avisos);
        }
      });

    // 5. Ouvinte de retorno do usuário para a aba (re-sincroniza do banco com cooldown inteligente de 2 minutos)
    let lastFocusSyncTime = Date.now();
    const isRotaPublicaVisitante = (): boolean => {
      if (typeof window === 'undefined') return false;
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const isPublicRoute = hash.includes('catalogo') || search.includes('catalogo') || pathname.includes('catalogo') ||
                            hash.includes('agendar') || search.includes('agendar') || pathname.includes('agendar') ||
                            hash.includes('confirmar') || search.includes('confirmar') || pathname.includes('confirmar') ||
                            hash.includes('instalar') || search.includes('instalar') || pathname.includes('instalar');
      const isExplicitAdmin = hash.includes('admin') || search.includes('app=1') ||
                              window.location.protocol === 'file:' ||
                              navigator.userAgent.includes('Electron') ||
                              !!(window as any).Capacitor?.isNativePlatform?.();
      return isPublicRoute && !isExplicitAdmin;
    };

    const handleReSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastFocusSyncTime > 2 * 60 * 1000) {
          lastFocusSyncTime = now;
          sincronizarComNuvem(false);
        }
      }
    };
    window.addEventListener('focus', handleReSync);
    document.addEventListener('visibilitychange', handleReSync);

    // 6. Ouvinte nativo do ciclo de vida móvel (ao maximizar o app após minimizar)
    let capAppListener: any = null;
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          const now = Date.now();
          if (now - lastFocusSyncTime > 2 * 60 * 1000) {
            lastFocusSyncTime = now;
            sincronizarComNuvem(false);
          }
        }
      }).then(handle => {
        capAppListener = handle;
      }).catch(() => {});
    } catch (e) {}

    // 7. Polling de contingência conservador (a cada 5 minutos - APENAS no painel administrativo, NUNCA em páginas públicas)
    const pollInterval = setInterval(() => {
      if (!isRotaPublicaVisitante()) {
        sincronizarComNuvem(false);
      }
    }, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(realtimeBroadcastChannel);
      bc?.close();
      window.removeEventListener('focus', handleReSync);
      document.removeEventListener('visibilitychange', handleReSync);
      if (capAppListener && typeof capAppListener.remove === 'function') {
        capAppListener.remove();
      }
      clearInterval(pollInterval);
    };
  }, []);

  // Auxiliar para gerar ID único
  const gerarId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  // Código amigável para a cliente (apenas letras maiúsculas e números)
  const gerarCodigoReserva = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AG';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // --- Ações de Autenticação ---
  const login = (userId: string) => {
    const user = equipe.find(u => u.id === userId && u.ativo);
    if (user) {
      setCurrentUser(user);
    }
  };

  const loginWithCredentials = (identificador: string, senhaDigitada: string): boolean => {
    const termo = identificador.trim().toLowerCase();
    
    // Procura por ID, e-mail, nome ou se digitou 'admin'
    let user = equipe.find(u => 
      u.ativo && (
        u.id.toLowerCase() === termo ||
        u.email.toLowerCase() === termo ||
        u.nome.toLowerCase().includes(termo) ||
        (termo === 'admin' && u.perfil === 'admin')
      )
    );

    // Se a equipe não tem ninguém ativo ou não encontrou o admin e digitou admin / admin
    if (!user && (termo === 'admin' || termo === 'admin@salao.com' || equipe.length === 0)) {
      const adminDefault: Usuario = {
        id: 'admin_master',
        nome: 'Administrador',
        email: 'admin@salao.com',
        telefone: '',
        perfil: 'admin',
        ativo: true,
        senha: ENV_ADMIN_PASSWORD
      };
      setEquipe(prev => [adminDefault, ...prev.filter(u => u.id !== 'admin_master')]);
      user = adminDefault;
    }

    if (user) {
      const senhaValida = user.senha || (user.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin');
      const isMasterAdminMatch = user.perfil === 'admin' && senhaDigitada === ENV_ADMIN_PASSWORD;

      if (senhaDigitada === senhaValida || isMasterAdminMatch) {
        setCurrentUser(user);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    try {
      sessionStorage.removeItem('nail_session_active');
      sessionStorage.removeItem('nail_current_user');
      localStorage.removeItem('nail_session_user');
      localStorage.removeItem('nail_current_user');
      sessionStorage.removeItem('nail_current_view');
      localStorage.removeItem('nail_current_view');
    } catch (e) {}
    setCurrentUser(null);
  };

  // --- Ações de Equipe ---
  const addEquipe = async (membro: Omit<Usuario, 'id' | 'ativo'>) => {
    const novo: Usuario = {
      ...membro,
      id: 'u_' + gerarId(),
      ativo: true,
      senha: membro.senha || (membro.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin'),
      servicos_habilitados: membro.servicos_habilitados || []
    };
    const nextEquipe = [...equipe, novo];
    setEquipe(nextEquipe);
    try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

    salvarUsuarioSupabase(novo).then();
    const res = await salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe });
    if (res.sucesso) {
      mostrarNotificacaoGlobal(`✅ Profissional ${novo.nome} salva e confirmada na nuvem!`);
    } else {
      mostrarNotificacaoGlobal(`⚠️ Salva localmente. Erro ao sincronizar nuvem: ${res.erro}`);
    }
  };

  const updateEquipe = async (id: string, updated: Partial<Usuario>) => {
    const nextEquipe = equipe.map(u => u.id === id ? { ...u, ...updated } : u);
    setEquipe(nextEquipe);
    try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

    const membro = nextEquipe.find(u => u.id === id);
    if (membro) {
      salvarUsuarioSupabase(membro).then();
    }
    const res = await salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe });
    if (res.sucesso) {
      mostrarNotificacaoGlobal(`✅ Alterações de ${membro?.nome || 'profissional'} salvas e confirmadas na nuvem!`);
    } else {
      mostrarNotificacaoGlobal(`⚠️ Salvo localmente. Erro ao sincronizar nuvem: ${res.erro}`);
    }
  };

  const deleteEquipe = async (id: string) => {
    const nextEquipe = equipe.filter(u => u.id !== id);
    setEquipe(nextEquipe);
    try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

    try { supabase.from('usuarios').delete().eq('id', id).then(); } catch (e) {}
    salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe }).then();
    mostrarNotificacaoGlobal('✅ Profissional removida da nuvem!');
  };

  const toggleEquipeAtivo = (id: string) => {
    setEquipe(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
  };

  // --- Gestão de Horário de Almoço das Profissionais / Salão ---
  const ajustarHorarioAlmoco = async (params: {
    data: string; // YYYY-MM-DD
    profissionalId: string; // ID da profissional ou 'todas'
    inicio: string; // HH:mm ex: '12:00'
    fim: string; // HH:mm ex: '13:00'
    escopo: 'dia' | 'profissional' | 'salao';
  }) => {
    const { data, profissionalId, inicio, fim, escopo } = params;

    if (escopo === 'dia') {
      // Ajuste pontual apenas para o dia especificado
      const profsAlvo = profissionalId === 'todas' 
        ? equipe.filter(u => u.ativo) 
        : equipe.filter(u => u.id === profissionalId);

      const novosAgendamentos: Agendamento[] = [...agendamentos];

      for (const p of profsAlvo) {
        const inicioStr = `${data}T${inicio}:00`;
        const fimStr = `${data}T${fim}:00`;

        // Procura se já existe agendamento de almoço deste dia para esta profissional
        const idxExistente = novosAgendamentos.findIndex(a => 
          a.profissional_id === p.id && 
          a.inicio.startsWith(data) && 
          (a.observacoes?.includes('[Almoço]') || a.observacoes?.includes('[Almoço Cancelado]'))
        );

        if (idxExistente >= 0) {
          const agExistente = novosAgendamentos[idxExistente];
          novosAgendamentos[idxExistente] = {
            ...agExistente,
            inicio: inicioStr,
            fim: fimStr,
            status: 'bloqueado',
            observacoes: `[Almoço] Horário de Almoço - ${p.nome}`
          };
          salvarAgendamentoSupabase(novosAgendamentos[idxExistente]).then();
        } else {
          const novoAlmoco: Agendamento = {
            id: 'alm_' + gerarId(),
            cliente_id: 'bloqueado',
            profissional_id: p.id,
            inicio: inicioStr,
            fim: fimStr,
            status: 'bloqueado',
            valor_total: 0,
            valor_sinal: 0,
            observacoes: `[Almoço] Horário de Almoço - ${p.nome}`,
            origem: 'admin',
            criado_em: new Date().toISOString()
          };
          novosAgendamentos.push(novoAlmoco);
          salvarAgendamentoSupabase(novoAlmoco).then();
        }
      }

      setAgendamentos(novosAgendamentos);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(novosAgendamentos)); } catch (e) {}
      mostrarNotificacaoGlobal(`✅ Horário de almoço de ${data} ajustado para ${inicio} às ${fim}!`);

    } else if (escopo === 'profissional') {
      // Atualiza o cadastro padrão da profissional
      const nextEquipe = equipe.map(u => {
        if (u.id === profissionalId) {
          return {
            ...u,
            horario_almoco_ativo: true,
            horario_almoco_inicio: inicio,
            horario_almoco_fim: fim
          };
        }
        return u;
      });

      setEquipe(nextEquipe);
      try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

      // Limpa qualquer cancelamento ou bloqueio pontual que estava nesta data para valer o novo padrão
      const agsFiltrados = agendamentos.filter(a => {
        const isPontualDesteDia = a.profissional_id === profissionalId && 
          a.inicio.startsWith(data) && 
          (a.observacoes?.includes('[Almoço]') || a.observacoes?.includes('[Almoço Cancelado]'));
        if (isPontualDesteDia) {
          try { supabase.from('agendamentos').delete().eq('id', a.id).then(); } catch (e) {}
          return false;
        }
        return true;
      });
      setAgendamentos(agsFiltrados);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(agsFiltrados)); } catch (e) {}

      const membro = nextEquipe.find(u => u.id === profissionalId);
      if (membro) salvarUsuarioSupabase(membro).then();
      await salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe });
      mostrarNotificacaoGlobal(`✅ Horário de almoço padrão de ${membro?.nome || 'profissional'} atualizado para ${inicio} às ${fim}!`);

    } else if (escopo === 'salao') {
      // Atualiza todas as profissionais da equipe
      const nextEquipe = equipe.map(u => ({
        ...u,
        horario_almoco_ativo: true,
        horario_almoco_inicio: inicio,
        horario_almoco_fim: fim
      }));

      setEquipe(nextEquipe);
      try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

      // Limpa bloqueios pontuais nesta data para valer o padrão de todo o salão
      const agsFiltrados = agendamentos.filter(a => {
        const isPontualDesteDia = a.inicio.startsWith(data) && 
          (a.observacoes?.includes('[Almoço]') || a.observacoes?.includes('[Almoço Cancelado]'));
        if (isPontualDesteDia) {
          try { supabase.from('agendamentos').delete().eq('id', a.id).then(); } catch (e) {}
          return false;
        }
        return true;
      });
      setAgendamentos(agsFiltrados);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(agsFiltrados)); } catch (e) {}

      for (const m of nextEquipe) {
        salvarUsuarioSupabase(m).then();
      }
      await salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe });
      mostrarNotificacaoGlobal(`✅ Horário de almoço de todo o salão atualizado para ${inicio} às ${fim}!`);
    }
  };

  const excluirOuLiberarAlmoco = async (params: {
    data: string; // YYYY-MM-DD
    profissionalId: string; // ID ou 'todas'
    escopo: 'dia' | 'profissional' | 'salao';
  }) => {
    const { data, profissionalId, escopo } = params;

    if (escopo === 'dia') {
      // Liberar o horário de almoço apenas nesta data específica
      const profsAlvo = profissionalId === 'todas' 
        ? equipe.filter(u => u.ativo) 
        : equipe.filter(u => u.id === profissionalId);

      const novosAgendamentos: Agendamento[] = [...agendamentos];

      for (const p of profsAlvo) {
        const idxExistente = novosAgendamentos.findIndex(a => 
          a.profissional_id === p.id && 
          a.inicio.startsWith(data) && 
          (a.observacoes?.includes('[Almoço]') || a.observacoes?.includes('[Almoço Cancelado]'))
        );

        if (idxExistente >= 0) {
          novosAgendamentos[idxExistente] = {
            ...novosAgendamentos[idxExistente],
            status: 'cancelado',
            observacoes: `[Almoço Cancelado] - Horário liberado para atendimentos (${p.nome})`
          };
          salvarAgendamentoSupabase(novosAgendamentos[idxExistente]).then();
        } else {
          // Cria o registro marcador com status cancelado para indicar que o almoço padrão foi dispensado hoje
          const canceladoMarcador: Agendamento = {
            id: 'alm_canc_' + gerarId(),
            cliente_id: 'bloqueado',
            profissional_id: p.id,
            inicio: `${data}T${p.horario_almoco_inicio || '12:00'}:00`,
            fim: `${data}T${p.horario_almoco_fim || '13:00'}:00`,
            status: 'cancelado',
            valor_total: 0,
            valor_sinal: 0,
            observacoes: `[Almoço Cancelado] - Horário liberado para atendimentos (${p.nome})`,
            origem: 'admin',
            criado_em: new Date().toISOString()
          };
          novosAgendamentos.push(canceladoMarcador);
          salvarAgendamentoSupabase(canceladoMarcador).then();
        }
      }

      setAgendamentos(novosAgendamentos);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(novosAgendamentos)); } catch (e) {}
      mostrarNotificacaoGlobal(`✅ Horário de almoço do dia ${data} liberado para atendimentos!`);

    } else if (escopo === 'profissional') {
      // Desativa o almoço padrão no cadastro desta profissional
      const nextEquipe = equipe.map(u => {
        if (u.id === profissionalId) {
          return {
            ...u,
            horario_almoco_ativo: false
          };
        }
        return u;
      });

      setEquipe(nextEquipe);
      try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

      // Remove eventuais agendamentos pontuais de almoço nesta data
      const agsFiltrados = agendamentos.filter(a => {
        const isPontualDesteDia = a.profissional_id === profissionalId && 
          a.inicio.startsWith(data) && 
          (a.observacoes?.includes('[Almoço]') || a.observacoes?.includes('[Almoço Cancelado]'));
        if (isPontualDesteDia) {
          try { supabase.from('agendamentos').delete().eq('id', a.id).then(); } catch (e) {}
          return false;
        }
        return true;
      });
      setAgendamentos(agsFiltrados);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(agsFiltrados)); } catch (e) {}

      const membro = nextEquipe.find(u => u.id === profissionalId);
      if (membro) salvarUsuarioSupabase(membro).then();
      await salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe });
      mostrarNotificacaoGlobal(`✅ Horário de almoço de ${membro?.nome || 'profissional'} desativado!`);

    } else if (escopo === 'salao') {
      // Desativa o almoço para todo o salão
      const nextEquipe = equipe.map(u => ({
        ...u,
        horario_almoco_ativo: false
      }));

      setEquipe(nextEquipe);
      try { localStorage.setItem('nail_equipe', JSON.stringify(nextEquipe)); } catch (e) {}

      const agsFiltrados = agendamentos.filter(a => {
        const isPontualDesteDia = a.inicio.startsWith(data) && 
          (a.observacoes?.includes('[Almoço]') || a.observacoes?.includes('[Almoço Cancelado]'));
        if (isPontualDesteDia) {
          try { supabase.from('agendamentos').delete().eq('id', a.id).then(); } catch (e) {}
          return false;
        }
        return true;
      });
      setAgendamentos(agsFiltrados);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(agsFiltrados)); } catch (e) {}

      for (const m of nextEquipe) {
        salvarUsuarioSupabase(m).then();
      }
      await salvarConfiguracoesSupabase({ configSalao, equipe: nextEquipe });
      mostrarNotificacaoGlobal('✅ Horário de almoço desativado para todo o salão!');
    }
  };

  // --- Ações de Clientes ---
  const addCliente = (newCliente: Omit<Cliente, 'id' | 'criado_em'>) => {
    const cliente: Cliente = {
      ...newCliente,
      id: 'c_' + gerarId(),
      criado_em: new Date().toISOString()
    };
    setClientes(prev => [...prev, cliente]);
    salvarClienteSupabase(cliente);
    mostrarNotificacaoGlobal(`✅ Cliente "${cliente.nome}" cadastrada e sincronizada com a nuvem!`);
    return cliente;
  };

  const updateCliente = (id: string, updated: Partial<Cliente>) => {
    setClientes(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updated } : c);
      const cli = next.find(c => c.id === id);
      if (cli) salvarClienteSupabase(cli);
      return next;
    });
    mostrarNotificacaoGlobal('✅ Dados da cliente salvos e sincronizados com a nuvem!');
  };

  const deleteCliente = (id: string) => {
    limparFocoAtivo();
    setClientes(prev => prev.filter(c => c.id !== id));
    deletarClienteSupabase(id);
    mostrarNotificacaoGlobal('✅ Cliente removida da nuvem com sucesso!');
  };

  // --- Ações de Serviços ---
  const addServico = async (newServico: Omit<Servico, 'id' | 'ativo'> & { ativo?: boolean }) => {
    const servico: Servico = {
      ...newServico,
      id: 's_' + gerarId(),
      ativo: newServico.ativo !== undefined ? newServico.ativo : true
    };
    const next = [...servicos, servico];
    setServicos(next);
    try { localStorage.setItem('nail_servicos', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.SERVICOS, next);

    // Habilita automaticamente o novo serviço na lista da profissional administradora e ativas
    setEquipe(prevEquipe => {
      const equipeAtualizada = prevEquipe.map(u => {
        if (u.ativo) {
          const habilitados = Array.isArray(u.servicos_habilitados) ? u.servicos_habilitados : [];
          if (!habilitados.includes(servico.id)) {
            return { ...u, servicos_habilitados: [...habilitados, servico.id] };
          }
        }
        return u;
      });
      try { localStorage.setItem('nail_equipe', JSON.stringify(equipeAtualizada)); } catch (e) {}
      salvarConfiguracoesSupabase({ configSalao, equipe: equipeAtualizada }).catch(() => {});
      return equipeAtualizada;
    });

    const res = await salvarServicoSupabase(servico);
    if (res.sucesso) {
      mostrarNotificacaoGlobal(`✅ Serviço "${servico.nome}" salvo e confirmado na nuvem!`);
    } else {
      mostrarNotificacaoGlobal(`⚠️ Salvo localmente. Erro ao salvar na nuvem: ${res.erro}`);
    }
  };

  const updateServico = async (id: string, updated: Partial<Servico>) => {
    const atual = servicos.find(s => s.id === id);
    const servicoSalvo: Servico = {
      ...(atual || {} as any),
      ...updated,
      id
    };

    setServicos(prev => {
      const next = prev.map(s => s.id === id ? servicoSalvo : s);
      try { localStorage.setItem('nail_servicos', JSON.stringify(next)); } catch (e) {}
      dbSetAll(STORES.SERVICOS, next);
      return next;
    });

    const res = await salvarServicoSupabase(servicoSalvo);
    if (res.sucesso) {
      mostrarNotificacaoGlobal(`✅ Serviço "${servicoSalvo.nome}" salvo e verificado na nuvem!`);
    } else {
      mostrarNotificacaoGlobal(`⚠️ Salvo localmente. Erro na nuvem: ${res.erro}`);
    }
  };

  const deleteServico = async (id: string) => {
    limparFocoAtivo();
    setServicos(prev => {
      const next = prev.filter(s => s.id !== id);
      try { localStorage.setItem('nail_servicos', JSON.stringify(next)); } catch (e) {}
      dbDeleteItem(STORES.SERVICOS, id);
      return next;
    });

    // Remove referências do serviço excluído de qualquer plano VIP existente
    setPlanosAssinatura(prev => {
      const atualizados = prev.map(p => {
        let mudou = false;
        let itens = p.itens_servicos;
        if (itens && itens.some(i => i.servico_id === id)) {
          itens = itens.filter(i => i.servico_id !== id);
          mudou = true;
        }
        let permitidos = p.servicos_permitidos_ids;
        if (permitidos && permitidos.includes(id)) {
          permitidos = permitidos.filter(sid => sid !== id);
          mudou = true;
        }
        return mudou ? { ...p, itens_servicos: itens, servicos_permitidos_ids: permitidos } : p;
      });
      return atualizados;
    });

    const res = await deletarServicoSupabase(id);
    if (res.sucesso) {
      mostrarNotificacaoGlobal('✅ Serviço excluído definitivamente do catálogo e da nuvem!');
    } else {
      mostrarNotificacaoGlobal('✅ Serviço excluído localmente!');
    }
  };

  // --- Ações de Despesas ---
  const addDespesa = (nova: Omit<Despesa, 'id'>) => {
    const despesa: Despesa = {
      ...nova,
      id: 'd_' + gerarId()
    };
    setDespesas(prev => [...prev, despesa]);
    salvarDespesaSupabase(despesa);
    mostrarNotificacaoGlobal(`✅ Despesa "${despesa.descricao}" registrada na nuvem!`);
  };

  const updateDespesa = (id: string, updated: Partial<Despesa>) => {
    setDespesas(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...updated } : d);
      const desp = next.find(d => d.id === id);
      if (desp) salvarDespesaSupabase(desp);
      return next;
    });
    mostrarNotificacaoGlobal('✅ Despesa atualizada e sincronizada com a nuvem!');
  };

  const deleteDespesa = (id: string) => {
    limparFocoAtivo();
    const despesaParaDeletar = despesas.find(d => d.id === id);
    setDespesas(prev => prev.filter(d => d.id !== id));
    deletarDespesaSupabase(id);

    // Se for uma despesa decorrente de comissão/repasse pago, estorna o fechamento de comissão correspondente
    if (despesaParaDeletar) {
      setFechamentosComissao(prev => prev.filter(f => {
        if (despesaParaDeletar.fechamento_id && f.id === despesaParaDeletar.fechamento_id) {
          return false;
        }
        if (despesaParaDeletar.categoria === 'Comissões' && 
            despesaParaDeletar.descricao.includes(f.nome_profissional) && 
            despesaParaDeletar.descricao.includes(f.periodo_inicio)) {
          return false;
        }
        return true;
      }));
    }

    mostrarNotificacaoGlobal('✅ Despesa removida da nuvem!');
  };

  const addCategoriaDespesa = (nome: string) => {
    const n = nome.trim();
    if (n && !categoriasDespesa.includes(n)) {
      const next = [...categoriasDespesa, n];
      setCategoriasDespesa(next);
      try { localStorage.setItem('nail_categorias_despesa', JSON.stringify(next)); } catch (e) {}
      salvarConfiguracoesSupabase({ categoriasDespesa: next }).catch(() => {});
      mostrarNotificacaoGlobal(`✅ Categoria de despesa "${n}" salva na nuvem!`);
    }
  };

  const deleteCategoriaDespesa = (nome: string) => {
    limparFocoAtivo();
    const next = categoriasDespesa.filter(c => c !== nome);
    setCategoriasDespesa(next);
    try { localStorage.setItem('nail_categorias_despesa', JSON.stringify(next)); } catch (e) {}
    salvarConfiguracoesSupabase({ categoriasDespesa: next }).catch(() => {});
    mostrarNotificacaoGlobal(`🗑️ Categoria "${nome}" excluída da nuvem.`);
  };

  // --- Ações de Técnicas ---
  const addTecnica = (nome: string) => {
    const n = nome.trim();
    if (n && !tecnicas.includes(n)) {
      const next = [...tecnicas, n];
      setTecnicas(next);
      try { localStorage.setItem('nail_tecnicas', JSON.stringify(next)); } catch (e) {}
      salvarConfiguracoesSupabase({ tecnicas: next }).catch(() => {});
      mostrarNotificacaoGlobal(`✅ Técnica "${n}" salva na nuvem!`);
    }
  };

  const deleteTecnica = (nome: string) => {
    limparFocoAtivo();
    const next = tecnicas.filter(t => t !== nome);
    setTecnicas(next);
    try { localStorage.setItem('nail_tecnicas', JSON.stringify(next)); } catch (e) {}
    salvarConfiguracoesSupabase({ tecnicas: next }).catch(() => {});
    mostrarNotificacaoGlobal(`🗑️ Técnica "${nome}" excluída da nuvem.`);
  };

  // --- Ações de Formatos ---
  const addFormato = (nome: string) => {
    const n = nome.trim();
    if (n && !formatos.includes(n)) {
      const next = [...formatos, n];
      setFormatos(next);
      try { localStorage.setItem('nail_formatos', JSON.stringify(next)); } catch (e) {}
      salvarConfiguracoesSupabase({ formatos: next }).catch(() => {});
      mostrarNotificacaoGlobal(`✅ Formato "${n}" salvo na nuvem!`);
    }
  };

  const deleteFormato = (nome: string) => {
    limparFocoAtivo();
    const next = formatos.filter(f => f !== nome);
    setFormatos(next);
    try { localStorage.setItem('nail_formatos', JSON.stringify(next)); } catch (e) {}
    salvarConfiguracoesSupabase({ formatos: next }).catch(() => {});
    mostrarNotificacaoGlobal(`🗑️ Formato "${nome}" excluído da nuvem.`);
  };

  // --- Ações de Categorias de Serviços ---
  const addCategoriaServico = (nome: string) => {
    const n = nome.trim();
    if (n && !categoriasServico.includes(n)) {
      const next = [...categoriasServico, n];
      setCategoriasServico(next);
      try { localStorage.setItem('nail_categorias_servico', JSON.stringify(next)); } catch (e) {}
      salvarConfiguracoesSupabase({ categoriasServico: next }).catch(() => {});
      mostrarNotificacaoGlobal(`✅ Categoria de serviço "${n}" salva na nuvem!`);
    }
  };

  const deleteCategoriaServico = (nome: string) => {
    limparFocoAtivo();
    const next = categoriasServico.filter(c => c !== nome);
    setCategoriasServico(next);
    try { localStorage.setItem('nail_categorias_servico', JSON.stringify(next)); } catch (e) {}
    salvarConfiguracoesSupabase({ categoriasServico: next }).catch(() => {});
    mostrarNotificacaoGlobal(`🗑️ Categoria de serviço "${nome}" excluída da nuvem.`);
  };

  // --- Ações de Categorias de Produtos ---
  const addCategoriaProduto = (nome: string) => {
    const n = nome.trim();
    if (n && !categoriasProduto.includes(n)) {
      const next = [...categoriasProduto, n];
      setCategoriasProduto(next);
      try { localStorage.setItem('nail_categorias_produto', JSON.stringify(next)); } catch (e) {}
      salvarConfiguracoesSupabase({ configSalao, categoriasProduto: next }).then();
      mostrarNotificacaoGlobal(`✅ Categoria de produto "${n}" adicionada!`);
    }
  };

  const deleteCategoriaProduto = (nome: string) => {
    limparFocoAtivo();
    const next = categoriasProduto.filter(c => c !== nome);
    setCategoriasProduto(next);
    try { localStorage.setItem('nail_categorias_produto', JSON.stringify(next)); } catch (e) {}
    salvarConfiguracoesSupabase({ configSalao, categoriasProduto: next }).then();
    mostrarNotificacaoGlobal(`🗑️ Categoria de produto "${nome}" removida.`);
  };

  // --- Ações de Materiais ---
  const addMaterial = async (novo: Omit<Material, 'id' | 'custo_por_uso'>) => {
    const rend = Number(novo.rendimento) || 1;
    const preco = Number(novo.preco_compra) || 0;
    const custo = rend > 0 ? Number((preco / rend).toFixed(2)) : 0;
    const material: Material = {
      ...novo,
      id: 'm_' + gerarId(),
      preco_compra: preco,
      rendimento: rend,
      custo_por_uso: custo
    };
    const next = [...materiais, material];
    setMateriais(next);
    try { localStorage.setItem('nail_materiais', JSON.stringify(next)); } catch (e) {}

    const res = await salvarMaterialSupabase(material);
    if (res.sucesso) {
      mostrarNotificacaoGlobal(`✅ Material "${material.nome}" salvo e verificado na nuvem!`);
    } else {
      mostrarNotificacaoGlobal(`⚠️ Salvo localmente. Erro ao salvar na nuvem: ${res.erro}`);
    }
  };

  const updateMaterial = async (id: string, updated: Partial<Material>) => {
    let materialSalvo: Material | undefined;
    setMateriais(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const merged = { ...m, ...updated };
          const rend = Number(merged.rendimento) || 1;
          const preco = Number(merged.preco_compra) || 0;
          const custo = rend > 0 ? Number((preco / rend).toFixed(2)) : 0;
          return {
            ...merged,
            preco_compra: preco,
            rendimento: rend,
            custo_por_uso: custo
          };
        }
        return m;
      });
      materialSalvo = next.find(m => m.id === id);
      try { localStorage.setItem('nail_materiais', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    if (materialSalvo) {
      const res = await salvarMaterialSupabase(materialSalvo);
      if (res.sucesso) {
        mostrarNotificacaoGlobal(`✅ Insumo "${materialSalvo.nome}" salvo e verificado na nuvem!`);
      } else {
        mostrarNotificacaoGlobal(`⚠️ Salvo localmente. Erro ao sincronizar nuvem: ${res.erro}`);
      }
    }
  };

  const deleteMaterial = async (id: string) => {
    limparFocoAtivo();
    setMateriais(prev => {
      const next = prev.filter(m => m.id !== id);
      try { localStorage.setItem('nail_materiais', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    deletarMaterialSupabase(id);
    mostrarNotificacaoGlobal('✅ Material removido da nuvem!');
  };

  const obterServicosDeAgendamento = (agendamentoId: string): Servico[] => {
    let ids = itensAgendamento[agendamentoId] || [];
    if (ids.length === 0) {
      const agend = agendamentos.find(a => a.id === agendamentoId) as any;
      if (agend?.itens_servicos && Array.isArray(agend.itens_servicos) && agend.itens_servicos.length > 0) {
        ids = agend.itens_servicos;
      }
    }
    return servicos.filter(s => ids.includes(s.id));
  };

  // --- Formatação Segura de Data/Hora Local (sem distorção UTC) ---
  const formatarDataHoraLocal = (d: Date): string => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const seg = String(d.getSeconds()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}`;
  };

  // --- Lógica de Conflitos (100% à prova de distorção de fuso horário UTC vs Local) ---
  const checkConflitoHorario = (inicioStr: string, fimStr: string, profissionalId: string, ignorarAgendamentoId?: string) => {
    const normalizarDataHora = (str: string): number => {
      if (!str) return 0;
      const limpo = str.replace('Z', '').split('+')[0];
      const [data, hora] = limpo.split('T');
      if (!data || !hora) return 0;
      const [ano, mes, dia] = data.split('-').map(Number);
      const [h, m, s] = (hora || '00:00:00').split(':').map(Number);
      return Date.UTC(ano, mes - 1, dia, h || 0, m || 0, s || 0);
    };

    const inicio = normalizarDataHora(inicioStr);
    let fim = normalizarDataHora(fimStr);
    if (!fim || fim <= inicio) {
      fim = inicio + 30 * 60000;
    }
    
    // 1. Checa agendamentos reais existentes
    const temConflitoAgendamento = agendamentos.some(a => {
      if (a.id === ignorarAgendamentoId) return false;
      if (a.status === 'cancelado' || a.status === 'falta') return false;
      if (a.profissional_id !== profissionalId) return false;
      
      const aInicio = normalizarDataHora(a.inicio);
      let aFim = normalizarDataHora(a.fim);
      if (!aFim || aFim <= aInicio) {
        const sServs = obterServicosDeAgendamento(a.id);
        const dur = sServs.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) || 60;
        aFim = aInicio + dur * 60000;
      }
      
      return Math.max(inicio, aInicio) < Math.min(fim, aFim);
    });

    if (temConflitoAgendamento) return true;

    // 2. Checa colisão com Horário de Almoço padrão da profissional
    const dataStr = inicioStr.split('T')[0];
    if (!dataStr) return false;

    // Se estiver testando ou ignorando um agendamento do próprio almoço, não checa almoço padrão
    if (ignorarAgendamentoId && (ignorarAgendamentoId.startsWith('alm_') || ignorarAgendamentoId.startsWith('almoco_'))) {
      return false;
    }

    const prof = equipe.find(u => u.id === profissionalId);
    if (!prof || prof.horario_almoco_ativo === false) return false;

    const almocoInicioStr = prof.horario_almoco_inicio || '12:00';
    const almocoFimStr = prof.horario_almoco_fim || '13:00';

    // Se houver cancelamento/liberação pontual de almoço para esta profissional nesta data, NÃO gera conflito com o almoço padrão
    const almocoCanceladoNesteDia = agendamentos.some(a => 
      a.profissional_id === profissionalId &&
      a.inicio.startsWith(dataStr) &&
      (a.status === 'cancelado' || a.status === 'falta') &&
      (a.observacoes?.includes('[Almoço Cancelado]') || a.observacoes?.includes('[Almoço Liberado]'))
    );
    if (almocoCanceladoNesteDia) return false;

    // Se já existe um agendamento ativo de almoço para esta data e profissional, ele já foi checado no passo 1
    const almocoRealAtivoNesteDia = agendamentos.some(a =>
      a.id !== ignorarAgendamentoId &&
      a.profissional_id === profissionalId &&
      a.inicio.startsWith(dataStr) &&
      a.status !== 'cancelado' &&
      a.status !== 'falta' &&
      a.observacoes?.includes('[Almoço]')
    );
    if (almocoRealAtivoNesteDia) return false;

    // Valida sobreposição com o almoço padrão
    const almocoInicio = normalizarDataHora(`${dataStr}T${almocoInicioStr}:00`);
    const almocoFim = normalizarDataHora(`${dataStr}T${almocoFimStr}:00`);

    if (almocoInicio && almocoFim && almocoInicio < almocoFim) {
      if (Math.max(inicio, almocoInicio) < Math.min(fim, almocoFim)) {
        return true;
      }
    }

    return false;
  };

  // --- Ações de Agendamento ---
  const addAgendamento = (
    novoAgendamento: Omit<Agendamento, 'id' | 'criado_em' | 'fim'> & { fim?: string }, 
    servicosSelecionados: string[] = [],
    recorrenciaManual?: {
      tipo: 'semanal' | 'quinzenal' | 'dias_20' | 'dias_21' | 'mensal' | 'personalizado';
      intervaloDias: number;
      repeticoes: number;
      tipoLabel: string;
    },
    planoVipId?: string
  ) => {
    const servs = servicos.filter(s => servicosSelecionados.includes(s.id));
    let duracaoTotal = servs.reduce((acc, s) => acc + s.duracao_minutos, 0);
    if (duracaoTotal <= 0) {
      if (novoAgendamento.fim) {
        const diffMin = Math.round((new Date(novoAgendamento.fim).getTime() - new Date(novoAgendamento.inicio).getTime()) / (60 * 1000));
        duracaoTotal = diffMin > 0 ? diffMin : 60;
      } else {
        duracaoTotal = 60;
      }
    }

    // Regra VIP: Se for atendimento do Clube VIP, calcula a duração da Sessão 1
    if (novoAgendamento.pago_com_clube || planoVipId) {
      const cli = clientes.find(c => c.id === novoAgendamento.cliente_id);
      const plano = (planoVipId ? planosAssinatura.find(p => p.id === planoVipId) : null)
        || planosAssinatura.find(p => p.id === cli?.assinatura?.plano_id)
        || planosAssinatura.find(p => p.nome?.trim().toLowerCase() === cli?.assinatura?.nome_plano?.trim().toLowerCase());
      if (plano) {
        const durS1 = calcularDuracaoSessaoVip(plano, 1, servicos);
        if (durS1 > 0) {
          duracaoTotal = durS1;
        }
      }
    }
    
    let fimStr = novoAgendamento.fim;
    if (!fimStr) {
      const dataInicio = new Date(novoAgendamento.inicio);
      const dataFim = new Date(dataInicio.getTime() + duracaoTotal * 60 * 1000);
      fimStr = formatarDataHoraLocal(dataFim);
    }
    
    const conflito = checkConflitoHorario(novoAgendamento.inicio, fimStr, novoAgendamento.profissional_id);
    if (conflito && novoAgendamento.cliente_id !== 'bloqueado') {
      return { success: false, error: 'O horário selecionado conflita com outro agendamento ativo.' };
    }

    const id = gerarCodigoReserva();
    const grupoId = (recorrenciaManual && recorrenciaManual.repeticoes > 1)
      ? 'rec_' + Math.random().toString(36).substring(2, 9)
      : undefined;

    const obsInicial = (recorrenciaManual && recorrenciaManual.repeticoes > 1)
      ? `[🔁 Recorrência ${recorrenciaManual.tipoLabel}: Sessão 1 de ${recorrenciaManual.repeticoes}] ${novoAgendamento.observacoes || ''}`.trim()
      : novoAgendamento.observacoes;
    
    const agendamento: Agendamento = {
      ...novoAgendamento,
      id,
      fim: fimStr,
      recorrencia_grupo_id: grupoId,
      recorrencia_tipo: recorrenciaManual?.tipo,
      recorrencia_posicao: recorrenciaManual && recorrenciaManual.repeticoes > 1 ? `1 de ${recorrenciaManual.repeticoes}` : undefined,
      observacoes: obsInicial,
      criado_em: new Date().toISOString()
    };

    setItensAgendamento(prev => ({
      ...prev,
      [id]: servicosSelecionados
    }));

    if (agendamento.valor_sinal > 0) {
      const pagSinal: Pagamento = {
        id: 'p_' + gerarId(),
        agendamento_id: id,
        tipo: 'pix',
        valor: agendamento.valor_sinal,
        status: 'pendente',
        data_pagamento: new Date().toISOString()
      };
      setPagamentos(prev => [...prev, pagSinal]);
    }

    // Gera as repetições se a recorrência manual estilo Google Agenda estiver ativa
    const novosRecorrentes: Agendamento[] = [];
    const novosItensMap: Record<string, string[]> = {};

    if (recorrenciaManual && recorrenciaManual.repeticoes > 1 && grupoId) {
      const feriadosNacionais = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
      const [dataPartOrig, horaPartOrig] = novoAgendamento.inicio.replace(' ', 'T').split('T');
      const [anoOrig, mesOrig, diaOrig] = dataPartOrig.split('-').map(Number);
      const horaStrLimpa = (horaPartOrig || '10:00:00').substring(0, 8);

      for (let rep = 1; rep < recorrenciaManual.repeticoes; rep++) {
        const dRep = new Date(anoOrig, mesOrig - 1, diaOrig);
        dRep.setDate(dRep.getDate() + rep * recorrenciaManual.intervaloDias);

        let tentativas = 0;
        while (tentativas < 14) {
          const diaSemana = dRep.getDay();
          const expediente = configSalao.horarios_trabalho?.[diaSemana];
          const mStrF = String(dRep.getMonth() + 1).padStart(2, '0');
          const dStrF = String(dRep.getDate()).padStart(2, '0');
          const mmdd = `${mStrF}-${dStrF}`;
          const isFeriado = feriadosNacionais.includes(mmdd);
          const isFechado = !expediente || !expediente.ativo;

          if (!isFeriado && !isFechado) {
            break;
          }
          dRep.setDate(dRep.getDate() + 1);
          tentativas++;
        }

        const anoRep = dRep.getFullYear();
        const mesRep = String(dRep.getMonth() + 1).padStart(2, '0');
        const diaRep = String(dRep.getDate()).padStart(2, '0');
        const dataRepStr = `${anoRep}-${mesRep}-${diaRep}`;
        const inicioRepStr = `${dataRepStr}T${horaStrLimpa}`;

        const [hR, mR] = horaStrLimpa.split(':').map(Number);
        const dRepFim = new Date(anoRep, dRep.getMonth(), Number(diaRep), hR, mR + duracaoTotal);
        const fimRepStr = formatarDataHoraLocal(dRepFim);

        const idRep = gerarCodigoReserva();
        const obsRep = `[🔁 Recorrência ${recorrenciaManual.tipoLabel}: Sessão ${rep + 1} de ${recorrenciaManual.repeticoes}] ${novoAgendamento.observacoes ? novoAgendamento.observacoes.replace(/\[🔁.*?\]\s*/g, '') : ''}`.trim();

        const agRep: Agendamento = {
          ...novoAgendamento,
          id: idRep,
          inicio: inicioRepStr,
          fim: fimRepStr,
          status: novoAgendamento.status === 'bloqueado' ? 'bloqueado' : 'confirmado',
          valor_total: novoAgendamento.valor_total,
          valor_sinal: 0,
          pago_com_clube: novoAgendamento.pago_com_clube,
          recorrencia_grupo_id: grupoId,
          recorrencia_tipo: recorrenciaManual.tipo,
          recorrencia_posicao: `${rep + 1} de ${recorrenciaManual.repeticoes}`,
          observacoes: obsRep,
          criado_em: new Date().toISOString()
        };

        novosRecorrentes.push(agRep);
        novosItensMap[idRep] = servicosSelecionados;
        salvarAgendamentoSupabase(agRep, servicosSelecionados);
      }
    }

    setAgendamentos(prev => [...prev, agendamento, ...novosRecorrentes]);
    salvarAgendamentoSupabase(agendamento, servicosSelecionados);

    if (novosRecorrentes.length > 0) {
      setItensAgendamento(prev => ({ ...prev, [id]: servicosSelecionados, ...novosItensMap }));
      mostrarNotificacaoGlobal(`🔁 1º agendamento e mais ${novosRecorrentes.length} repetições (${recorrenciaManual?.tipoLabel}) foram reservados na agenda!`);
    } else {
      mostrarNotificacaoGlobal('✅ Agendamento salvo e sincronizado com a nuvem!');
    }

    // Regra de Negócio: Se NÃO for recorrência manual e for Clube VIP, agenda as sessões da assinatura
    const isVipParaRecorrencia = Boolean(
      agendamento.pago_com_clube ||
      planoVipId ||
      agendamento.observacoes?.includes('Clube VIP') ||
      agendamento.observacoes?.includes('👑')
    );
    if (!recorrenciaManual && (agendamento.status === 'confirmado' || isVipParaRecorrencia)) {
      setTimeout(() => {
        reservarRecorrenciaSemanalVip(id, agendamento, servicosSelecionados, planoVipId);
      }, 100);
    }

    return { success: true, agendamento, criados: 1 + novosRecorrentes.length };
  };

  const updateAgendamentoStatus = (
    id: string, 
    status: AgendamentoStatus,
    canceladoPor?: 'cliente' | 'admin',
    motivo?: string,
    confirmadoPor?: 'cliente' | 'admin'
  ) => {
    setAgendamentos(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          status,
          ...(canceladoPor ? { cancelado_por: canceladoPor } : {}),
          ...(motivo ? { motivo_cancelamento: motivo } : {}),
          ...(confirmadoPor ? { confirmado_por: confirmadoPor } : {})
        };
      }
      return a;
    }));

    // Sincronização automática com a tabela de pagamentos
    if (status === 'confirmado') {
      setPagamentos(prev => {
        const temPendente = prev.some(p => p.agendamento_id === id && p.status === 'pendente');
        if (temPendente) {
          return prev.map(p => (p.agendamento_id === id && p.status === 'pendente')
            ? { ...p, status: 'sinal pago', data_pagamento: new Date().toISOString() }
            : p
          );
        }
        return prev;
      });

      // Regra de Negócio: Se a cliente possui Clube VIP ativo, reserva os horários recorrentes conforme a frequência do plano
      setTimeout(() => {
        const agConfirmado = agendamentos.find(a => a.id === id);
        const cliConfirmado = clientes.find(c => c.id === agConfirmado?.cliente_id);
        const plano = encontrarPlanoVip(
          cliConfirmado?.assinatura?.plano_id,
          cliConfirmado?.assinatura,
          agConfirmado?.observacoes,
          planosAssinatura
        );
        reservarRecorrenciaSemanalVip(id, agConfirmado, undefined, plano?.id);
      }, 300);
    } else if (status === 'cancelado') {
      const agAlvo = agendamentos.find(a => a.id === id);
      const clienteId = agAlvo?.cliente_id;
      const cliAlvo = clientes.find(c => c.id === clienteId);
      const isVip = !!(
        agAlvo?.pago_com_clube ||
        agAlvo?.observacoes?.includes('Clube VIP') ||
        agAlvo?.observacoes?.includes('👑') ||
        (cliAlvo?.assinatura && cliAlvo.assinatura.status === 'ativo')
      );

      // Regra de Negócio: Ao cancelar um agendamento VIP, excluir automaticamente todas as sessões em aberto da agenda referente àquela cliente
      if (isVip && clienteId) {
        const sessoesVipParaExcluir = agendamentos.filter(a =>
          a.cliente_id === clienteId &&
          (a.status === 'pendente' || a.status === 'confirmado') &&
          (a.pago_com_clube || a.observacoes?.includes('Clube VIP') || a.observacoes?.includes('👑') || a.id === id)
        );

        const idsExcluir = sessoesVipParaExcluir.map(a => a.id);
        if (idsExcluir.length > 0) {
          setAgendamentos(prev => {
            const restantes = prev.filter(a => !idsExcluir.includes(a.id));
            try { localStorage.setItem('nail_agendamentos', JSON.stringify(restantes)); } catch (e) {}
            dbSetAll(STORES.AGENDAMENTOS, restantes);
            return restantes;
          });
          idsExcluir.forEach(aid => {
            deletarAgendamentoSupabase(aid);
            marcarAvisoComoLido(aid);
          });
          setPagamentos(prev => prev.map(p => idsExcluir.includes(p.agendamento_id) ? { ...p, status: 'estornado' } : p));
          mostrarNotificacaoGlobal(`🗑️ Agendamento cancelado e ${idsExcluir.length} sessões em aberto do Clube VIP foram excluídas da agenda!`);
          return;
        }
      }

      setPagamentos(prev => prev.map(p => (p.agendamento_id === id && p.status === 'pendente')
        ? { ...p, status: 'estornado' }
        : p
      ));
    } else if (status === 'concluido') {
      const agAlvo = agendamentos.find(a => a.id === id);
      const clienteId = agAlvo?.cliente_id;
      const cliAlvo = clientes.find(c => c.id === clienteId);
      const isVip = !!(
        agAlvo?.pago_com_clube ||
        agAlvo?.observacoes?.includes('Clube VIP') ||
        agAlvo?.observacoes?.includes('👑') ||
        (cliAlvo?.assinatura && cliAlvo.assinatura.status === 'ativo')
      );
      if (isVip && clienteId && cliAlvo?.assinatura && cliAlvo.assinatura.saldo_restante > 0) {
        const servs = obterServicosDeAgendamento(id);
        abaterSaldoAssinatura(clienteId, servs[0]?.id);
      }
    } else if (status === 'pendente') {
      setPagamentos(prev => {
        const existente = prev.find(p => p.agendamento_id === id);
        if (existente) {
          return prev.map(p => p.id === existente.id ? { ...p, status: 'pendente' } : p);
        }
        const ag = agendamentos.find(a => a.id === id);
        const valSinal = ag ? (ag.valor_sinal || ag.valor_total || 0) : 0;
        const novoPag: Pagamento = {
          id: 'p_' + gerarId(),
          agendamento_id: id,
          tipo: 'pix',
          valor: valSinal,
          status: 'pendente',
          data_pagamento: ag?.inicio || new Date().toISOString()
        };
        return [...prev, novoPag];
      });
    }

    atualizarStatusAgendamentoSupabase(id, status, canceladoPor, motivo, confirmadoPor);
    marcarAvisoComoLido(id);
  };

  const atualizarValorSinalAgendamento = (id: string, valorSinal: number) => {
    const valor = Math.max(0, Number(valorSinal) || 0);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, valor_sinal: valor } : a));

    // Atualiza ou insere o pagamento pendente do sinal
    if (valor > 0) {
      setPagamentos(prev => {
        const existente = prev.find(p => p.agendamento_id === id && p.status === 'pendente');
        if (existente) {
          return prev.map(p => p.id === existente.id ? { ...p, valor } : p);
        } else {
          const novoPag: Pagamento = {
            id: 'p_' + gerarId(),
            agendamento_id: id,
            tipo: 'pix',
            valor,
            status: 'pendente',
            data_pagamento: new Date().toISOString()
          };
          return [...prev, novoPag];
        }
      });
    }

    atualizarValorSinalAgendamentoSupabase(id, valor);
    mostrarNotificacaoGlobal(`✅ Sinal de R$ ${valor.toFixed(2).replace('.', ',')} configurado para o agendamento!`);
  };

  const cancelAgendamento = (id: string, motivo: string, canceladoPor: 'cliente' | 'admin') => {
    const agAlvo = agendamentos.find(a => a.id === id);
    const isVip = agAlvo?.pago_com_clube || agAlvo?.observacoes?.includes('Clube VIP');
    const clienteId = agAlvo?.cliente_id;

    // Regra de Negócio: Ao cancelar um agendamento VIP, excluir automaticamente todas as sessões em aberto da agenda referente àquela cliente
    if (isVip && clienteId) {
      const sessoesVipParaExcluir = agendamentos.filter(a =>
        a.cliente_id === clienteId &&
        (a.status === 'pendente' || a.status === 'confirmado') &&
        (a.pago_com_clube || a.observacoes?.includes('Clube VIP') || a.id === id)
      );

      const idsExcluir = sessoesVipParaExcluir.map(a => a.id);
      if (idsExcluir.length > 0) {
        setAgendamentos(prev => {
          const restantes = prev.filter(a => !idsExcluir.includes(a.id));
          try { localStorage.setItem('nail_agendamentos', JSON.stringify(restantes)); } catch (e) {}
          dbSetAll(STORES.AGENDAMENTOS, restantes);
          return restantes;
        });
        idsExcluir.forEach(aid => {
          deletarAgendamentoSupabase(aid);
          marcarAvisoComoLido(aid);
        });
        setPagamentos(prev => prev.map(p => idsExcluir.includes(p.agendamento_id) ? { ...p, status: 'estornado' } : p));
        mostrarNotificacaoGlobal(`🗑️ Agendamento cancelado e ${idsExcluir.length} sessões em aberto do Clube VIP foram excluídas da agenda!`);
        return;
      }
    }

    setAgendamentos(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          status: 'cancelado',
          motivo_cancelamento: motivo,
          cancelado_por: canceladoPor
        };
      }
      return a;
    }));

    atualizarStatusAgendamentoSupabase(id, 'cancelado', canceladoPor, motivo);

    setPagamentos(prev => prev.map(p => {
      if (p.agendamento_id === id) {
        if (canceladoPor === 'admin') {
          return { ...p, status: 'estornado' };
        }
      }
      return p;
    }));

    if (canceladoPor === 'admin') {
      marcarAvisoComoLido(id);
    }
  };

  const deleteAgendamento = (id: string) => {
    limparFocoAtivo();
    setAgendamentos(prev => {
      const filtrados = prev.filter(a => a.id !== id);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(filtrados)); } catch (e) {}
      return filtrados;
    });
    setItensAgendamento(prev => {
      const copia = { ...prev };
      delete copia[id];
      try { localStorage.setItem('nail_itens_agendamento', JSON.stringify(copia)); } catch (e) {}
      return copia;
    });
    deletarAgendamentoSupabase(id);
    marcarAvisoComoLido(id);
    mostrarNotificacaoGlobal('✅ Agendamento excluído e sincronizado com a nuvem!');
  };

  const confirmarSinal = (agendamentoId: string, valor: number, metodo: MetodoPagamento) => {
    updateAgendamentoStatus(agendamentoId, 'confirmado', undefined, undefined, 'admin');

    setPagamentos(prev => {
      const existente = prev.find(p => p.agendamento_id === agendamentoId && (p.status === 'pendente' || p.valor === valor));
      if (existente) {
        return prev.map(p => p.id === existente.id ? { ...p, status: 'sinal pago', tipo: metodo, valor: valor || p.valor, data_pagamento: new Date().toISOString() } : p);
      } else {
        const novoPag: Pagamento = {
          id: 'p_' + gerarId(),
          agendamento_id: agendamentoId,
          tipo: metodo,
          valor: valor,
          status: 'sinal pago',
          data_pagamento: new Date().toISOString()
        };
        return [...prev, novoPag];
      }
    });

    marcarAvisoComoLido(agendamentoId);
  };

  const atualizarServicosEProfissionalAgendamento = (
    agendamentoId: string,
    novosServicosIds: string[],
    novaProfissionalId: string,
    ajustarFuturos: boolean = true
  ) => {
    const ag = agendamentos.find(a => a.id === agendamentoId);
    if (!ag) return;

    const servicosEscolhidos = servicos.filter(s => novosServicosIds.includes(s.id));
    const duracaoTotal = servicosEscolhidos.reduce((acc, s) => acc + (s.duracao_minutos || 60), 0) || 60;
    const nomesServicosNovos = servicosEscolhidos.map(s => s.nome).join(' + ');

    // Calcula novo horário de término preservando o fuso/data original de início no formato local
    const dInicio = new Date(ag.inicio);
    const dFim = new Date(dInicio.getTime() + duracaoTotal * 60000);
    const fimStr = formatarDataHoraLocal(dFim);
    const profEfetiva = novaProfissionalId || ag.profissional_id;

    // 1. Validação estrita de conflito no agendamento atual
    const conflitoAtual = checkConflitoHorario(ag.inicio, fimStr, profEfetiva, ag.id);
    if (conflitoAtual) {
      mostrarAlerta({
        titulo: 'Conflito de Horário Detectado',
        mensagem: 'A nova duração deste atendimento ultrapassa o tempo livre e colide com outro agendamento ativo desta profissional. A alteração não foi salva para evitar sobreposição.',
        tipo: 'erro'
      });
      return;
    }

    // Mantém isenção se for sessão recorrente VIP inclusa no plano
    const isSessaoVipInclusa = Boolean(ag.pago_com_clube && ag.valor_total === 0);
    const novoValorTotal = isSessaoVipInclusa 
      ? 0 
      : servicosEscolhidos.reduce((acc, s) => acc + (Number(s.preco) || 0), 0);

    // Atualiza nome dos serviços dentro da observação se formatado como Sessão X (...)
    let obsAtualizada = ag.observacoes;
    if (obsAtualizada && nomesServicosNovos && obsAtualizada.includes('Sessão ') && obsAtualizada.includes('(') && obsAtualizada.includes(')')) {
      obsAtualizada = obsAtualizada.replace(/Sessão\s+(\d+)\s*\([^)]+\)/i, `Sessão $1 (${nomesServicosNovos})`);
    }

    const atualizado: Agendamento = {
      ...ag,
      profissional_id: profEfetiva,
      fim: fimStr,
      valor_total: novoValorTotal,
      observacoes: obsAtualizada
    };

    // Identifica agendamentos futuros da mesma série recorrente / plano VIP se solicitado
    const futurosAtualizados: { ag: Agendamento; servicosIds: string[] }[] = [];
    const conflitosFuturosDatas: string[] = [];

    if (ajustarFuturos) {
      const isVip = !!(
        ag.pago_com_clube ||
        ag.plano_id ||
        ag.observacoes?.includes('Clube VIP') ||
        ag.observacoes?.includes('👑')
      );

      agendamentos.forEach(a => {
        if (a.id === agendamentoId) return;
        if (a.status === 'cancelado' || a.status === 'concluido') return;
        if (new Date(a.inicio) <= new Date(ag.inicio)) return;

        let ehDaMesmaSerie = false;

        // Caso 1: Mesmo grupo de recorrência manual
        if (ag.recorrencia_grupo_id && a.recorrencia_grupo_id === ag.recorrencia_grupo_id) {
          ehDaMesmaSerie = true;
        }

        // Caso 2: Sessão de Clube VIP da mesma cliente
        if (!ehDaMesmaSerie && isVip && a.cliente_id === ag.cliente_id) {
          const aIsVip = !!(
            a.pago_com_clube ||
            a.plano_id ||
            a.observacoes?.includes('Clube VIP') ||
            a.observacoes?.includes('👑')
          );
          if (aIsVip) {
            if (!ag.plano_id || !a.plano_id || ag.plano_id === a.plano_id) {
              ehDaMesmaSerie = true;
            }
          }
        }

        // Caso 3: Recorrência marcada nas observações
        if (!ehDaMesmaSerie && ag.cliente_id === a.cliente_id && ag.observacoes?.includes('[🔁 Recorrência') && a.observacoes?.includes('[🔁 Recorrência')) {
          ehDaMesmaSerie = true;
        }

        if (ehDaMesmaSerie) {
          const dIniFut = new Date(a.inicio);
          const dFimFut = new Date(dIniFut.getTime() + duracaoTotal * 60000);
          const fimFutStr = formatarDataHoraLocal(dFimFut);

          // Protege cada agendamento futuro contra conflitos de horário com outros clientes!
          const temConflitoFuturo = checkConflitoHorario(a.inicio, fimFutStr, profEfetiva, a.id);
          if (temConflitoFuturo) {
            const dataFmt = new Date(a.inicio).toLocaleDateString('pt-BR');
            conflitosFuturosDatas.push(dataFmt);
            return; // Ignora apenas esta data conflitante para não sobrepor outro agendamento
          }

          const isVipFutIncluso = Boolean(a.pago_com_clube && a.valor_total === 0);
          const novoValorFut = isVipFutIncluso ? 0 : novoValorTotal;

          let obsFut = a.observacoes;
          if (obsFut && nomesServicosNovos && obsFut.includes('Sessão ') && obsFut.includes('(') && obsFut.includes(')')) {
            obsFut = obsFut.replace(/Sessão\s+(\d+)\s*\([^)]+\)/i, `Sessão $1 (${nomesServicosNovos})`);
          }

          futurosAtualizados.push({
            ag: {
              ...a,
              profissional_id: profEfetiva,
              fim: fimFutStr,
              valor_total: novoValorFut,
              observacoes: obsFut
            },
            servicosIds: novosServicosIds
          });
        }
      });
    }

    const mapaAtualizados = new Map<string, Agendamento>();
    mapaAtualizados.set(atualizado.id, atualizado);
    futurosAtualizados.forEach(item => mapaAtualizados.set(item.ag.id, item.ag));

    setAgendamentos(prev => {
      const next = prev.map(a => mapaAtualizados.get(a.id) || a);
      try { localStorage.setItem('nail_agendamentos', JSON.stringify(next)); } catch (e) {}
      dbSetAll(STORES.AGENDAMENTOS, next);
      return next;
    });

    setItensAgendamento(prev => {
      const nextItens = { ...prev, [agendamentoId]: novosServicosIds };
      futurosAtualizados.forEach(item => {
        nextItens[item.ag.id] = item.servicosIds;
      });
      try { localStorage.setItem('nail_itens_agendamento', JSON.stringify(nextItens)); } catch (e) {}
      return nextItens;
    });

    salvarAgendamentoSupabase(atualizado, novosServicosIds);
    futurosAtualizados.forEach(item => {
      salvarAgendamentoSupabase(item.ag, item.servicosIds);
    });

    if (conflitosFuturosDatas.length > 0) {
      mostrarAlerta({
        titulo: 'Aviso de Recorrências Conflitantes',
        mensagem: `O atendimento atual foi atualizado. Porém, ${conflitosFuturosDatas.length} sessão(ões) futura(s) nas datas (${conflitosFuturosDatas.join(', ')}) não puderam ser estendidas pois colidiriam com horários de outras clientes já agendadas!`,
        tipo: 'aviso'
      });
    } else if (futurosAtualizados.length > 0) {
      mostrarNotificacaoGlobal(`✅ Agendamento atualizado e propagado para ${futurosAtualizados.length} agendamento(s) futuro(s)!`);
    } else {
      mostrarNotificacaoGlobal('✅ Procedimento e profissional atualizados com sucesso!');
    }
  };

  const concluirAtendimento = (
    agendamentoId: string, 
    valorRestante: number, 
    metodo: MetodoPagamento,
    dataProximaManutencao?: string,
    produtosVendidos?: ItemComandaProduto[],
    pagoComClube?: boolean,
    servicoAbaterId?: string,
    desconto?: { valor: number; motivo?: string }
  ) => {
    const valorDesconto = Math.max(0, Number(desconto?.valor) || 0);
    const motivoDesconto = desconto?.motivo?.trim() || 'Desconto concedido';

    // 1. Atualizar agendamento com status concluído, produtos, clube e desconto
    setAgendamentos(prev => {
      const atualizados = prev.map(a => {
        if (a.id === agendamentoId) {
          const totalAdicionalProdutos = produtosVendidos ? produtosVendidos.reduce((acc, p) => acc + p.subtotal, 0) : 0;
          // Se a sessão VIP possui valor_total (mensalidade cobrada na 1ª sessão), preserva o valor recebido
          const isMensalidadeVipCobrada = a.valor_total > 0 && valorRestante > 0;
          const novoValorTotal = (pagoComClube && !isMensalidadeVipCobrada)
            ? totalAdicionalProdutos 
            : Math.max(0, (a.valor_total - valorDesconto) + totalAdicionalProdutos);

          const atualizado: Agendamento = {
            ...a,
            status: 'concluido',
            produtos: produtosVendidos && produtosVendidos.length > 0 ? produtosVendidos : undefined,
            pago_com_clube: pagoComClube,
            valor_total: novoValorTotal,
            desconto_valor: valorDesconto > 0 ? valorDesconto : undefined,
            desconto_motivo: valorDesconto > 0 ? motivoDesconto : undefined
          };
          salvarAgendamentoSupabase(atualizado);
          return atualizado;
        }
        return a;
      });
      return atualizados;
    });

    // 2. Dar baixa no estoque de cada produto vendido
    if (produtosVendidos && produtosVendidos.length > 0) {
      produtosVendidos.forEach(item => {
        darBaixaEstoqueProduto(item.produto_id, item.quantidade);
      });
    }

    // 3. Se foi pago com clube, abater saldo do cliente
    if (pagoComClube) {
      const ag = agendamentos.find(a => a.id === agendamentoId);
      const servs = obterServicosDeAgendamento(agendamentoId);
      if (ag?.cliente_id) {
        abaterSaldoAssinatura(ag.cliente_id, servicoAbaterId || servs[0]?.id);
      }
    }

    // 4. Registrar pagamento do valor recebido (restante do serviço + produtos)
    if (valorRestante > 0) {
      const pagFinal: Pagamento = {
        id: 'p_' + gerarId(),
        agendamento_id: agendamentoId,
        tipo: metodo,
        valor: valorRestante,
        status: 'pago',
        data_pagamento: new Date().toISOString(),
        observacao: valorDesconto > 0 ? `Desconto de R$ ${valorDesconto.toFixed(2)} (${motivoDesconto})` : undefined
      };
      setPagamentos(prev => [...prev, pagFinal]);
    }

    setPagamentos(prev => prev.map(p => {
      if (p.agendamento_id === agendamentoId && p.status === 'sinal pago') {
        return { ...p, status: 'pago' };
      }
      return p;
    }));

    marcarAvisoComoLido(agendamentoId);
    mostrarNotificacaoGlobal('✅ Atendimento concluído com sucesso e sincronizado na nuvem!');
  };

  // --- Ações de Lista de Espera ---
  const addListaEspera = (item: Omit<ListaEspera, 'id' | 'criado_em' | 'status'>): ListaEspera => {
    const novoItem: ListaEspera = {
      ...item,
      id: 'w_' + gerarId(),
      status: 'aguardando',
      criado_em: new Date().toISOString()
    };
    setListaEspera(prev => [...prev, novoItem]);
    salvarListaEsperaSupabase(novoItem);
    return novoItem;
  };

  const updateListaEsperaStatus = (id: string, status: ListaEspera['status']) => {
    setListaEspera(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    atualizarStatusListaEsperaSupabase(id, status);
    marcarAvisoComoLido(id);
  };

  const atenderListaEspera = (id: string, agendamentoId: string) => {
    setListaEspera(prev => prev.map(w => w.id === id ? { ...w, status: 'atendido' } : w));
    atualizarStatusListaEsperaSupabase(id, 'atendido');
    marcarAvisoComoLido(id);
    if (agendamentoId) marcarAvisoComoLido(agendamentoId);
  };

  // --- Configurações ---
  const updateConfigSalao = (updated: Partial<ConfigSalao>) => {
    setConfigSalao(prev => {
      const next = { ...prev, ...updated };
      salvarConfiguracoesSupabase({ configSalao: next }).catch(e => console.error('Erro ao salvar config no supabase:', e));
      return next;
    });
  };

  // --- Lógica de Manutenção Sugerida ---
  const obterRecomendacoesManutencao = () => {
    const hoje = new Date();
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const hojeFimDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).getTime();

    const recomendacoes: { 
      cliente: Cliente; 
      servico: Servico; 
      dataSugerida: string; 
      diasAtraso: number;
      diasRestantes: number;
      statusManutencao: 'atrasada' | 'hoje' | 'em_breve' | 'programada';
    }[] = [];

    // Expande combos e pacotes para que os sub-serviços com ciclo de retorno sejam avaliados
    const expandirServicosComSubItens = (listaServs: Servico[]): Servico[] => {
      const resultado: Servico[] = [];
      listaServs.forEach(s => {
        const itensCombo = s.servicos_pacote || (s as any).itens_combo || [];
        if (s.is_pacote && itensCombo.length > 0) {
          itensCombo.forEach((subId: string) => {
            const sub = servicos.find(serv => serv.id === subId);
            if (sub && !resultado.some(x => x.id === sub.id)) resultado.push(sub);
          });
        } else {
          if (!resultado.some(x => x.id === s.id)) resultado.push(s);
        }
      });
      return resultado;
    };

    clientes.forEach(cliente => {
      // 1. Considera APENAS atendimentos já feitos (no passado/hoje ou concluídos)
      const agendsFeitos = agendamentos
        .filter(a => 
          a.cliente_id === cliente.id && 
          a.status !== 'cancelado' &&
          a.cliente_id !== 'bloqueado' &&
          (a.status === 'concluido' || new Date(a.inicio).getTime() <= hojeFimDoDia)
        )
        .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
      
      if (agendsFeitos.length === 0) return;

      const ultimoAgend = agendsFeitos[0];
      const dataUltimoAtendimento = new Date(ultimoAgend.inicio);

      // 2. Verifica se a cliente já possui agendamento FUTURO marcado após hoje
      const temAgendamentoFuturo = agendamentos.some(a => 
        a.cliente_id === cliente.id && 
        new Date(a.inicio).getTime() > hojeFimDoDia && 
        (a.status === 'confirmado' || a.status === 'pendente')
      );

      if (temAgendamentoFuturo) return;

      let servs = expandirServicosComSubItens(obterServicosDeAgendamento(ultimoAgend.id));

      // Fallback: se itens_servicos estiver vazio, extrai por observação VIP ou valor
      if (servs.length === 0 && ultimoAgend.observacoes) {
        if (ultimoAgend.observacoes.includes('Manicure')) {
          const sMan = servicos.find(s => s.id === 's1');
          if (sMan) servs.push(sMan);
        }
        if (ultimoAgend.observacoes.includes('Pedicure')) {
          const sPed = servicos.find(s => s.id === 's_itq1t5mda');
          if (sPed) servs.push(sPed);
        }
      }
      if (servs.length === 0) {
        if (ultimoAgend.valor_total === 80) {
          const s3 = servicos.find(s => s.id === 's3');
          if (s3) servs = expandirServicosComSubItens([s3]);
        } else if (ultimoAgend.valor_total === 45) {
          const sPed = servicos.find(s => s.id === 's_itq1t5mda');
          if (sPed) servs.push(sPed);
        } else if (ultimoAgend.valor_total === 40) {
          const sMan = servicos.find(s => s.id === 's1');
          if (sMan) servs.push(sMan);
        }
      }

      const servsManutencao = servs.filter(s => {
        const d = Number(s.intervalo_manutencao_dias !== undefined ? s.intervalo_manutencao_dias : (s as any).retorno_dias) || 0;
        return d > 0;
      });
      if (servsManutencao.length === 0) return;

      servsManutencao.forEach(serv => {
        const intervaloDias = Number(serv.intervalo_manutencao_dias !== undefined ? serv.intervalo_manutencao_dias : (serv as any).retorno_dias) || 20;
        const dataSugerida = new Date(dataUltimoAtendimento.getTime() + intervaloDias * 24 * 60 * 60 * 1000);
        
        const dataSugZero = new Date(dataSugerida.getFullYear(), dataSugerida.getMonth(), dataSugerida.getDate());
        const diffMs = dataSugZero.getTime() - hojeZero.getTime();
        const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const diasAtraso = diasRestantes < 0 ? Math.abs(diasRestantes) : 0;

        let statusManutencao: 'atrasada' | 'hoje' | 'em_breve' | 'programada' = 'programada';
        if (diasRestantes < 0) {
          statusManutencao = 'atrasada';
        } else if (diasRestantes === 0) {
          statusManutencao = 'hoje';
        } else if (diasRestantes <= 7) {
          statusManutencao = 'em_breve';
        } else {
          statusManutencao = 'programada';
        }

        recomendacoes.push({
          cliente,
          servico: {
            ...serv,
            intervalo_manutencao_dias: intervaloDias
          },
          dataSugerida: dataSugerida.toISOString().split('T')[0],
          diasAtraso,
          diasRestantes,
          statusManutencao
        });
      });
    });

    return recomendacoes;
  };

  // --- Gerador inteligente de Horários Livres (Página Pública) ---
  const obterProximoHorarioLivre = (data: string, duracaoMinutos: number): string | null => {
    const diaSemana = new Date(data + 'T00:00:00').getDay();
    const expediente = configSalao.horarios_trabalho[diaSemana];
    
    if (!expediente || !expediente.ativo) return null;
    
    const [hInicio, mInicio] = expediente.inicio.split(':').map(Number);
    const [hFim, mFim] = expediente.fim.split(':').map(Number);
    
    const inicioMinutos = hInicio * 60 + mInicio;
    const fimMinutos = hFim * 60 + mFim;
    
    for (let min = inicioMinutos; min <= fimMinutos - duracaoMinutos; min += 30) {
      const hStr = String(Math.floor(min / 60)).padStart(2, '0');
      const mStr = String(min % 60).padStart(2, '0');
      
      const inicioAgend = `${data}T${hStr}:${mStr}:00`;
      const dateInicio = new Date(inicioAgend);
      const dateFim = new Date(dateInicio.getTime() + duracaoMinutos * 60 * 1000);
      const anoF = dateFim.getFullYear();
      const mesF = String(dateFim.getMonth() + 1).padStart(2, '0');
      const diaF = String(dateFim.getDate()).padStart(2, '0');
      const horaF = String(dateFim.getHours()).padStart(2, '0');
      const minF = String(dateFim.getMinutes()).padStart(2, '0');
      const segF = String(dateFim.getSeconds()).padStart(2, '0');
      const fimAgend = `${anoF}-${mesF}-${diaF}T${horaF}:${minF}:${segF}`;

      const conflito = checkConflitoHorario(inicioAgend, fimAgend, 'u1'); // Default to Sheila's professional ID 'u1'
      if (!conflito) {
        return `${hStr}:${mStr}`;
      }
    }
    
    return null;
  };

  // --- Google Agenda Sync Action ---
  const [googleConnected, setGoogleConnected] = useState<boolean>(() => localStorage.getItem('nail_google_connected') === 'true');
  const [googleUserEmail, setGoogleUserEmail] = useState<string>(() => localStorage.getItem('nail_google_email') || '');
  const [googleLastSync, setGoogleLastSync] = useState<string>(() => localStorage.getItem('nail_google_last_sync') || '');

  useEffect(() => {
    localStorage.setItem('nail_google_connected', String(googleConnected));
  }, [googleConnected]);

  useEffect(() => {
    localStorage.setItem('nail_google_email', googleUserEmail);
  }, [googleUserEmail]);

  useEffect(() => {
    localStorage.setItem('nail_google_last_sync', googleLastSync);
  }, [googleLastSync]);

  const conectarGoogleAgenda = (email: string) => {
    setGoogleConnected(true);
    setGoogleUserEmail(email);
    setGoogleLastSync(new Date().toLocaleString('pt-BR'));
  };

  const desconectarGoogleAgenda = () => {
    setGoogleConnected(false);
    setGoogleUserEmail('');
    setGoogleLastSync('');
    localStorage.removeItem('nail_google_connected');
    localStorage.removeItem('nail_google_email');
    localStorage.removeItem('nail_google_last_sync');
  };

  const limparAgendamentosSimuladosGoogle = () => {
    setAgendamentos(prev => {
      const validos = prev.filter(a => 
        !a.observacoes?.includes('Sincronizado automaticamente da Google Agenda') &&
        !a.observacoes?.includes('g_gen_')
      );
      const removidos = prev.length - validos.length;
      localStorage.setItem('nail_agendamentos', JSON.stringify(validos));
      mostrarNotificacaoGlobal(`🧹 ${removidos} agendamento(s) de simulação/duplicados foram removidos com sucesso!`);
      return validos;
    });
  };

  const sincronizarGoogleAgenda = (eventos: any[]) => {
    let importados = 0;
    const clientesLocais = [...clientes];
    eventos.forEach(evento => {
      let clientNome = (evento.clienteNome || 'Cliente').trim();
      let clientFone = evento.clienteTelefone ? evento.clienteTelefone.replace(/\D/g, '') : '';
      let servId = evento.servicoId || 's1';

      // 1. Encontrar ou cadastrar cliente usando a lista acumuladora local
      let client = clientesLocais.find(c => {
        if (clientFone && clientFone.length >= 8) {
          return c.telefone.replace(/\D/g, '').endsWith(clientFone.slice(-8));
        }
        return c.nome.trim().toLowerCase() === clientNome.toLowerCase();
      });

      if (!client) {
        client = addCliente({
          nome: clientNome,
          telefone: evento.clienteTelefone || '',
          consentimento_imagem: false
        });
        clientesLocais.push(client);
      }

      // 2. Prevenir duplicações: não insere se já existe agendamento nessa data/hora para o mesmo cliente ou mesmo Google Event ID
      const jaExiste = agendamentos.some(a => 
        (a.inicio === evento.inicio && a.cliente_id === client?.id) ||
        (evento.id && a.observacoes?.includes(evento.id))
      );

      if (!jaExiste) {
        const total = servicos.find(s => s.id === servId)?.preco || 70;
        addAgendamento({
          cliente_id: client.id,
          profissional_id: 'u1', // Sheila
          inicio: evento.inicio,
          status: 'confirmado',
          valor_total: total,
          valor_sinal: 0,
          observacoes: `[Google Agenda Oficial] ${evento.id ? 'ID:' + evento.id + ' - ' : ''}${evento.tituloOriginal || ''}`,
          origem: 'cliente'
        }, [servId]);
        importados++;
      }
    });

    setGoogleLastSync(new Date().toLocaleString('pt-BR'));
    localStorage.setItem('nail_google_last_sync', new Date().toLocaleString('pt-BR'));
    mostrarNotificacaoGlobal(`✅ ${importados} compromisso(s) real(is) importado(s) sem duplicações!`);
  };

  const deduplicarClientes = async (): Promise<{ removidos: number; unificados: number }> => {
    // 1. Agrupar clientes por nome normalizado (ou telefone)
    const grupos = new Map<string, Cliente[]>();
    clientes.forEach(c => {
      const key = c.nome.trim().toLowerCase();
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(c);
    });

    let totalRemovidos = 0;
    let gruposUnificados = 0;
    const idsParaExcluir: string[] = [];
    const mapaReatribuicao = new Map<string, string>(); // dupId -> primaryId
    let clientesAtualizados = [...clientes];

    for (const [_, lista] of grupos.entries()) {
      if (lista.length <= 1) continue;

      gruposUnificados++;

      // Escolhe o cliente principal:
      // 1. Tem assinatura ativa
      // 2. Tem mais agendamentos vinculados
      // 3. Tem telefone preenchido
      // 4. Mais antigo (id ou criado_em)
      const ordenados = [...lista].sort((a, b) => {
        const aTemAssinatura = a.assinatura?.status === 'ativo' ? 2 : (a.assinatura ? 1 : 0);
        const bTemAssinatura = b.assinatura?.status === 'ativo' ? 2 : (b.assinatura ? 1 : 0);
        if (aTemAssinatura !== bTemAssinatura) return bTemAssinatura - aTemAssinatura;

        const aAgs = agendamentos.filter(ag => ag.cliente_id === a.id).length;
        const bAgs = agendamentos.filter(ag => ag.cliente_id === b.id).length;
        if (aAgs !== bAgs) return bAgs - aAgs;

        const aTemTel = a.telefone?.replace(/\D/g, '').length ? 1 : 0;
        const bTemTel = b.telefone?.replace(/\D/g, '').length ? 1 : 0;
        if (aTemTel !== bTemTel) return bTemTel - aTemTel;

        return a.id.localeCompare(b.id);
      });

      const principal = ordenados[0];
      const duplicados = ordenados.slice(1);

      let mudouPrincipal = false;
      let principalMerged = { ...principal };
      duplicados.forEach(dup => {
        if (!principalMerged.telefone && dup.telefone) {
          principalMerged.telefone = dup.telefone;
          mudouPrincipal = true;
        }
        if (!principalMerged.email && dup.email) {
          principalMerged.email = dup.email;
          mudouPrincipal = true;
        }
        if (!principalMerged.aniversario && dup.aniversario) {
          principalMerged.aniversario = dup.aniversario;
          mudouPrincipal = true;
        }
        if (!principalMerged.alergias && dup.alergias) {
          principalMerged.alergias = dup.alergias;
          mudouPrincipal = true;
        }
        if (!principalMerged.observacoes && dup.observacoes) {
          principalMerged.observacoes = dup.observacoes;
          mudouPrincipal = true;
        }
        idsParaExcluir.push(dup.id);
        mapaReatribuicao.set(dup.id, principal.id);
        totalRemovidos++;
      });

      if (mudouPrincipal) {
        clientesAtualizados = clientesAtualizados.map(c => c.id === principal.id ? principalMerged : c);
        salvarClienteSupabase(principalMerged);
      }
    }

    if (totalRemovidos === 0) {
      mostrarNotificacaoGlobal('✨ Nenhum cliente duplicado encontrado. O banco de clientes já está 100% limpo!');
      return { removidos: 0, unificados: 0 };
    }

    // 2. Reatribuir agendamentos dos IDs duplicados para o ID principal
    let agendamentosAtualizados = agendamentos.map(a => {
      if (mapaReatribuicao.has(a.cliente_id)) {
        const novoId = mapaReatribuicao.get(a.cliente_id)!;
        const atualizado = { ...a, cliente_id: novoId };
        salvarAgendamentoSupabase(atualizado, itensAgendamento[a.id] || []);
        return atualizado;
      }
      return a;
    });

    // 3. Excluir duplicados do Supabase
    for (const dupId of idsParaExcluir) {
      await deletarClienteSupabase(dupId);
    }

    // 4. Filtrar clientes locais
    clientesAtualizados = clientesAtualizados.filter(c => !idsParaExcluir.includes(c.id));
    setClientes(clientesAtualizados);
    setAgendamentos(agendamentosAtualizados);

    try { localStorage.setItem('nail_clientes', JSON.stringify(clientesAtualizados)); } catch (e) {}
    try { localStorage.setItem('nail_agendamentos', JSON.stringify(agendamentosAtualizados)); } catch (e) {}
    dbSetAll(STORES.CLIENTES, clientesAtualizados);
    dbSetAll(STORES.AGENDAMENTOS, agendamentosAtualizados);

    mostrarNotificacaoGlobal(`🧹 Sucesso! ${totalRemovidos} cadastro(s) duplicado(s) foram excluídos da nuvem e unificados!`);
    return { removidos: totalRemovidos, unificados: gruposUnificados };
  };

  // --- Ações de Produtos (PDV de Balcão) ---
  const addProduto = (prod: Omit<Produto, 'id'>) => {
    const novoProduto: Produto = {
      ...prod,
      id: 'prod_' + gerarId(),
      criado_em: new Date().toISOString()
    };
    const next = [novoProduto, ...produtos];
    setProdutos(next);
    try { localStorage.setItem('nail_produtos', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.PRODUTOS, next);
    salvarConfiguracoesSupabase({ produtos: next }).catch(() => {});
    mostrarNotificacaoGlobal(`✅ Produto "${novoProduto.nome}" salvo na nuvem!`);
  };

  const updateProduto = (id: string, updated: Partial<Produto>) => {
    const next = produtos.map(p => p.id === id ? { ...p, ...updated } : p);
    setProdutos(next);
    try { localStorage.setItem('nail_produtos', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.PRODUTOS, next);
    salvarConfiguracoesSupabase({ produtos: next }).catch(() => {});
    mostrarNotificacaoGlobal('✅ Produto atualizado na nuvem!');
  };

  const deleteProduto = (id: string) => {
    limparFocoAtivo();
    const next = produtos.filter(p => p.id !== id);
    setProdutos(next);
    try { localStorage.setItem('nail_produtos', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.PRODUTOS, next);
    salvarConfiguracoesSupabase({ produtos: next }).catch(() => {});
    mostrarNotificacaoGlobal('🗑️ Produto excluído da nuvem.');
  };

  const darBaixaEstoqueProduto = (produtoId: string, quantidade: number) => {
    setProdutos(prev => {
      const next = prev.map(p => {
        if (p.id === produtoId) {
          const novoEstoque = Math.max(0, p.estoque_atual - quantidade);
          return { ...p, estoque_atual: novoEstoque };
        }
        return p;
      });
      try { localStorage.setItem('nail_produtos', JSON.stringify(next)); } catch (e) {}
      dbSetAll(STORES.PRODUTOS, next);
      salvarConfiguracoesSupabase({ produtos: next }).catch(() => {});
      return next;
    });
  };

  // --- Ações de Anamnese Digital ---
  const salvarAnamneseCliente = (clienteId: string, anamnese: Anamnese) => {
    dbSetItem(STORES.ANAMNESES, anamnese);
    setClientes(prev => {
      const atualizados = prev.map(c => {
        if (c.id === clienteId) {
          const prefs = {
            ...(c.preferencias || {}),
            anamnese
          };
          return { ...c, anamnese, preferencias: prefs };
        }
        return c;
      });
      const clienteAtualizado = atualizados.find(c => c.id === clienteId);
      if (clienteAtualizado) {
        salvarClienteSupabase(clienteAtualizado);
      }
      try { localStorage.setItem('nail_clientes', JSON.stringify(atualizados)); } catch (e) {}
      dbSetAll(STORES.CLIENTES, atualizados);
      return atualizados;
    });
    mostrarNotificacaoGlobal('✅ Ficha de Anamnese e Assinatura salvas com sucesso!');
  };

  // --- Ações de Planos de Assinatura Recorrente ---
  const addPlanoAssinatura = (plano: Omit<PlanoAssinatura, 'id'>) => {
    const novoPlano: PlanoAssinatura = {
      ...plano,
      id: 'plano_' + gerarId(),
      ativo: plano.ativo !== undefined ? plano.ativo : true
    };
    const next = [novoPlano, ...planosAssinatura];
    setPlanosAssinatura(next);
    try { localStorage.setItem('nail_planos_assinatura', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.PLANOS_ASSINATURA, next);
    salvarConfiguracoesSupabase({ planosAssinatura: next }).catch(() => {});
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nail_agenda_sync');
        bc.postMessage({ type: 'PLANOS_UPDATED', planos: next });
        bc.close();
      }
    } catch (e) {}
    mostrarNotificacaoGlobal(`✅ Plano "${novoPlano.nome}" cadastrado e salvo na nuvem!`);
  };

  const updatePlanoAssinatura = (id: string, updated: Partial<PlanoAssinatura>) => {
    const next = planosAssinatura.map(p => p.id === id ? { ...p, ...updated } : p);
    setPlanosAssinatura(next);
    try { localStorage.setItem('nail_planos_assinatura', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.PLANOS_ASSINATURA, next);
    salvarConfiguracoesSupabase({ planosAssinatura: next }).catch(() => {});
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nail_agenda_sync');
        bc.postMessage({ type: 'PLANOS_UPDATED', planos: next });
        bc.close();
      }
    } catch (e) {}

    // Sincroniza imediatamente todos os clientes que possuem este plano vinculado
    const planoAtualizado = next.find(p => p.id === id);
    if (planoAtualizado) {
      setClientes(prev => {
        let mudou = false;
        const nextClientes = prev.map(c => {
          const pertence = c.assinatura && (c.assinatura.plano_id === id || c.assinatura.nome_plano?.trim().toLowerCase() === planoAtualizado.nome?.trim().toLowerCase());
          if (pertence && c.assinatura) {
            mudou = true;
            const assAtualizada: AssinaturaCliente = {
              ...c.assinatura,
              plano_id: id,
              nome_plano: planoAtualizado.nome,
              frequencia_dias: planoAtualizado.frequencia_dias ? Math.max(7, Math.round(planoAtualizado.frequencia_dias / 7) * 7) : (c.assinatura.frequencia_dias || 7),
              total_mes: planoAtualizado.qtd_procedimentos_mes || c.assinatura.total_mes
            };
            const cliAtualizado = {
              ...c,
              assinatura: assAtualizada,
              preferencias: {
                ...(c.preferencias || {}),
                assinatura: assAtualizada
              }
            };
            salvarClienteSupabase(cliAtualizado).catch(() => {});
            return cliAtualizado;
          }
          return c;
        });
        if (mudou) {
          try { localStorage.setItem('nail_clientes', JSON.stringify(nextClientes)); } catch (e) {}
          dbSetAll(STORES.CLIENTES, nextClientes);
          return nextClientes;
        }
        return prev;
      });

      // Sincroniza agendamentos em aberto vinculados a este plano
      setAgendamentos(prev => {
        let mudouAgs = false;
        const nextAgs = prev.map(a => {
          const pertenceAoPlano = a.plano_id === id || a.observacoes?.includes(`[PLANO_ID:${id}]`);
          if (pertenceAoPlano) {
            const isSessao1 = a.observacoes?.includes('Sessão 1') || a.observacoes?.includes('[👑 Adesão Clube VIP:');
            const novoValor = (isSessao1 && a.status !== 'concluido') ? planoAtualizado.preco_mensal : a.valor_total;
            if (novoValor !== a.valor_total || a.plano_id !== id) {
              mudouAgs = true;
              const agAtualizado = {
                ...a,
                plano_id: id,
                valor_total: novoValor
              };
              salvarAgendamentoSupabase(agAtualizado).catch(() => {});
              return agAtualizado;
            }
          }
          return a;
        });
        if (mudouAgs) {
          try { localStorage.setItem('nail_agendamentos', JSON.stringify(nextAgs)); } catch (e) {}
          return nextAgs;
        }
        return prev;
      });
    }

    mostrarNotificacaoGlobal('✅ Plano atualizado na nuvem.');
  };

  const deletePlanoAssinatura = (id: string) => {
    limparFocoAtivo();
    const next = planosAssinatura.filter(p => p.id !== id);
    setPlanosAssinatura(next);
    try { localStorage.setItem('nail_planos_assinatura', JSON.stringify(next)); } catch (e) {}
    dbSetAll(STORES.PLANOS_ASSINATURA, next);
    salvarConfiguracoesSupabase({ planosAssinatura: next }).catch(() => {});
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nail_agenda_sync');
        bc.postMessage({ type: 'PLANOS_UPDATED', planos: next });
        bc.close();
      }
    } catch (e) {}
    mostrarNotificacaoGlobal('🗑️ Plano excluído da nuvem.');
  };

  const vincularAssinaturaCliente = (clienteId: string, planoId: string) => {
    const plano = planosAssinatura.find(p => p.id === planoId);
    if (!plano) return;

    const agora = new Date();
    // Se a cliente já tiver a 1ª sessão agendada, utiliza a data real do primeiro agendamento
    const agsVipCliente = agendamentos.filter(a => a.cliente_id === clienteId && a.status !== 'cancelado');
    const ag1aSessao = agsVipCliente.find(a => a.recorrencia_posicao?.startsWith('1 de') || a.observacoes?.includes('Sessão 1'));
    const dataInicioEfetiva = ag1aSessao ? ag1aSessao.inicio : agora.toISOString();
    const dIni = new Date(dataInicioEfetiva);
    const renovacao = new Date(dIni.getTime() + (plano.validade_dias || 30) * 86400000);

    const itensSaldo = (plano.itens_servicos && plano.itens_servicos.length > 0)
      ? plano.itens_servicos.map(item => ({
          servico_id: item.servico_id,
          nome_servico: item.nome_servico,
          saldo_restante: item.quantidade,
          total_mes: item.quantidade
        }))
      : undefined;

    const novaAssinatura: AssinaturaCliente = {
      plano_id: plano.id,
      nome_plano: plano.nome,
      data_inicio: agora.toISOString(),
      data_renovacao: renovacao.toISOString(),
      itens_saldo: itensSaldo,
      frequencia_dias: plano.frequencia_dias ? Math.max(7, Math.round(plano.frequencia_dias / 7) * 7) : 7,
      saldo_restante: plano.qtd_procedimentos_mes,
      total_mes: plano.qtd_procedimentos_mes,
      status: 'ativo'
    };

    setClientes(prev => {
      const next = prev.map(c => {
        if (c.id === clienteId) {
          const prefs = {
            ...(c.preferencias || {}),
            assinatura: novaAssinatura
          };
          return { ...c, assinatura: novaAssinatura, preferencias: prefs };
        }
        return c;
      });
      const cli = next.find(c => c.id === clienteId);
      if (cli) salvarClienteSupabase(cli);
      try { localStorage.setItem('nail_clientes', JSON.stringify(next)); } catch (e) {}
      dbSetAll(STORES.CLIENTES, next);
      return next;
    });
    mostrarNotificacaoGlobal(`✅ Plano "${plano.nome}" vinculado à cliente com sucesso!`);
  };

  const cancelarAssinaturaCliente = (clienteId: string) => {
    setClientes(prev => {
      const next = prev.map(c => {
        if (c.id === clienteId) {
          const prefs: any = { ...(c.preferencias || {}) };
          delete prefs.assinatura;
          return { ...c, assinatura: undefined, preferencias: prefs };
        }
        return c;
      });
      const cli = next.find(c => c.id === clienteId);
      if (cli) salvarClienteSupabase(cli);
      try { localStorage.setItem('nail_clientes', JSON.stringify(next)); } catch (e) {}
      dbSetAll(STORES.CLIENTES, next);
      return next;
    });
    mostrarNotificacaoGlobal('✅ Assinatura cancelada.');
  };

  const abaterSaldoAssinatura = (clienteId: string, servicoId?: string): boolean => {
    let abateu = false;
    setClientes(prev => {
      const next = prev.map(c => {
        if (c.id === clienteId && c.assinatura && c.assinatura.saldo_restante > 0) {
          let novosItens = c.assinatura.itens_saldo;
          if (novosItens && novosItens.length > 0) {
            // Tenta abater do serviço específico correspondente
            let index = -1;
            if (servicoId) {
              index = novosItens.findIndex(item => item.servico_id === servicoId && item.saldo_restante > 0);
            }
            // Se não encontrou o específico, busca o primeiro com saldo
            if (index === -1) {
              index = novosItens.findIndex(item => item.saldo_restante > 0);
            }
            if (index !== -1) {
              abateu = true;
              novosItens = novosItens.map((item, i) => i === index ? {
                ...item,
                saldo_restante: Math.max(0, item.saldo_restante - 1)
              } : item);
            }
          } else {
            abateu = true;
          }

          if (abateu) {
            const novaAssinatura: AssinaturaCliente = {
              ...c.assinatura,
              itens_saldo: novosItens,
              saldo_restante: Math.max(0, c.assinatura.saldo_restante - 1)
            };
            const prefs = {
              ...(c.preferencias || {}),
              assinatura: novaAssinatura
            };
            return {
              ...c,
              assinatura: novaAssinatura,
              preferencias: prefs
            };
          }
        }
        return c;
      });
      if (abateu) {
        const cli = next.find(c => c.id === clienteId);
        if (cli) salvarClienteSupabase(cli);
        try { localStorage.setItem('nail_clientes', JSON.stringify(next)); } catch (e) {}
        dbSetAll(STORES.CLIENTES, next);
      }
      return next;
    });
    return abateu;
  };

  const reservarRecorrenciaSemanalVip = (
    agendamentoInicialId: string,
    agendamentoInicialObj?: Agendamento,
    servicosIniciaisIds?: string[],
    planoIdOverride?: string
  ): { success: boolean; criados: number; mensagem: string } => {
    // Evita concorrência e geração duplicada da mesma sessão
    const agoraTs = Date.now();
    const ultimaExec = sessoesVipProcessadas.get(agendamentoInicialId);
    if (ultimaExec && (agoraTs - ultimaExec < 30000)) {
      return { success: true, criados: 0, mensagem: 'Recorrência VIP já gerada recentemente.' };
    }
    sessoesVipProcessadas.set(agendamentoInicialId, agoraTs);

    const agInicial = agendamentoInicialObj || agendamentos.find(a => a.id === agendamentoInicialId);
    if (!agInicial) {
      return { success: false, criados: 0, mensagem: 'Agendamento inicial não encontrado.' };
    }

    // Se já é uma sessão posterior gerada pela recorrência, não gera efeito cascata
    if (agInicial.observacoes?.includes('Sessão 2') || agInicial.observacoes?.includes('Sessão 3') || agInicial.observacoes?.includes('Sessão 4') || agInicial.observacoes?.includes('[Simultâneo]')) {
      return { success: false, criados: 0, mensagem: 'Este agendamento já é uma sessão semanal da recorrência.' };
    }

    const cliente = clientes.find(c => c.id === agInicial.cliente_id);
    const temAssinatura = !!(cliente?.assinatura && cliente.assinatura.status === 'ativo');
    const isVipAgendamento = !!(agInicial.pago_com_clube || agInicial.observacoes?.includes('Clube VIP') || agInicial.observacoes?.includes('👑') || planoIdOverride);

    if (!temAssinatura && !isVipAgendamento) {
      return { success: false, criados: 0, mensagem: 'Cliente não possui plano Clube VIP ativo no momento.' };
    }

    // Localiza o plano de assinatura com flexibilidade e inteligência
    const plano = encontrarPlanoVip(
      planoIdOverride || cliente?.assinatura?.plano_id,
      cliente?.assinatura,
      agInicial.observacoes,
      planosAssinatura
    );

    const totalSessoes = plano?.qtd_procedimentos_mes || cliente?.assinatura?.total_mes || 4;

    if (totalSessoes <= 1 && (!plano?.itens_servicos || plano.itens_servicos.length <= 1)) {
      return { success: false, criados: 0, mensagem: 'O plano VIP possui apenas 1 sessão mensal.' };
    }

    // Identifica os itens de serviço do plano com suas respectivas quantidades e profissionais designadas
    const itensPlano: ItemServicoPlano[] = (plano?.itens_servicos && plano.itens_servicos.length > 0)
      ? plano.itens_servicos
      : (cliente?.assinatura?.itens_saldo && cliente.assinatura.itens_saldo.length > 0)
        ? cliente.assinatura.itens_saldo.map(it => ({
            servico_id: it.servico_id,
            nome_servico: it.nome_servico,
            quantidade: it.total_mes || it.saldo_restante,
            profissional_id: (it as any).profissional_id || agInicial.profissional_id
          }))
        : [{
            servico_id: (servicosIniciaisIds && servicosIniciaisIds[0]) || (itensAgendamento[agInicial.id] || [])[0] || 's1',
            nome_servico: 'Sessão VIP',
            quantidade: totalSessoes,
            profissional_id: agInicial.profissional_id
          }];

    // Monta a lista completa de procedimentos previstos para o ciclo (ex: 1x Pedicure e 3x Manicure => 4 procedimentos)
    const filaProcedimentosCiclo: { servico_id: string; nome_servico: string; profissional_id: string }[] = [];
    itensPlano.forEach(it => {
      const qtd = Math.max(1, it.quantidade || 1);
      for (let i = 0; i < qtd; i++) {
        filaProcedimentosCiclo.push({
          servico_id: it.servico_id,
          nome_servico: it.nome_servico || servicos.find(s => s.id === it.servico_id)?.nome || 'Sessão VIP',
          profissional_id: it.profissional_id || agInicial.profissional_id
        });
      }
    });

    // Se o agendamento inicial possui um serviço específico selecionado, sincroniza ele com a primeira sessão
    const servInicialId = (servicosIniciaisIds && servicosIniciaisIds[0]) || (itensAgendamento[agInicial.id] || [])[0];
    if (servInicialId) {
      const idx = filaProcedimentosCiclo.findIndex(p => p.servico_id === servInicialId);
      if (idx > 0) {
        const [escolhido] = filaProcedimentosCiclo.splice(idx, 1);
        filaProcedimentosCiclo.unshift(escolhido);
      }
    }

    // Se a lista de procedimentos for menor que o total mensal previsto, preenche os slots com o serviço base
    while (filaProcedimentosCiclo.length < totalSessoes) {
      filaProcedimentosCiclo.push({
        servico_id: filaProcedimentosCiclo[0]?.servico_id || servInicialId || 's1',
        nome_servico: filaProcedimentosCiclo[0]?.nome_servico || 'Sessão VIP',
        profissional_id: agInicial.profissional_id
      });
    }

    // O número de semanas/sessões a agendar cobre exatamente as sessões configuradas do ciclo
    let maxSemanas = totalSessoes;
    if (plano?.distribuicao_sessoes && plano.distribuicao_sessoes.length > 0) {
      maxSemanas = Math.max(...plano.distribuicao_sessoes.map(d => d.sessao_numero));
    } else if (plano?.itens_servicos && plano.itens_servicos.some(it => it.sessoes && it.sessoes.length > 0)) {
      const sessoesNosItens = plano.itens_servicos.flatMap(it => it.sessoes || []);
      if (sessoesNosItens.length > 0) {
        maxSemanas = Math.max(...sessoesNosItens);
      }
    } else {
      maxSemanas = Math.max(totalSessoes, filaProcedimentosCiclo.length);
    }

    // Extrai data e horário originais como strings puras para evitar distorção de fuso horário
    const partesInicio = agInicial.inicio.replace(' ', 'T').split('T');
    const dataPart = partesInicio[0]; // "2026-08-20"
    const horaPartCompleta = (partesInicio[1] || '10:00:00').substring(0, 8);
    const [hStr, mStr, sStr] = horaPartCompleta.split(':');
    const [anoStr, mesStr, diaStr] = dataPart.split('-');

    const novosAgendamentos: Agendamento[] = [];
    const novosItensMap: Record<string, string[]> = {};

    const feriadosNacionais = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];

    // Frequência de retorno configurada no plano VIP (prevalecendo sobre a assinatura antiga da cliente)
    const intervaloDias = calcularIntervaloVip(plano, cliente?.assinatura);

    // Sincroniza a assinatura da cliente com a data real de início da 1ª sessão agendada e validade
    if (cliente && plano) {
      const dataInicio1aSessao = agInicial.inicio;
      const dIni = new Date(dataInicio1aSessao);
      const dRenov = new Date(dIni.getTime() + (plano.validade_dias || 30) * 86400000);
      const totalCicloReal = Math.max(totalSessoes, maxSemanas);

      const assAtualizada: AssinaturaCliente = {
        ...(cliente.assinatura || {
          plano_id: plano.id,
          nome_plano: plano.nome,
          saldo_restante: totalCicloReal,
          total_mes: totalCicloReal,
          status: 'ativo'
        }),
        plano_id: plano.id,
        nome_plano: plano.nome,
        frequencia_dias: intervaloDias,
        data_inicio: dataInicio1aSessao,
        data_renovacao: dRenov.toISOString(),
        total_mes: totalCicloReal,
        saldo_restante: (cliente.assinatura?.saldo_restante !== undefined && cliente.assinatura.saldo_restante > 0)
          ? cliente.assinatura.saldo_restante
          : totalCicloReal
      };
      const cliAtualizado = {
        ...cliente,
        assinatura: assAtualizada,
        preferencias: {
          ...(cliente.preferencias || {}),
          assinatura: assAtualizada
        }
      };
      setClientes(prev => prev.map(c => c.id === cliente.id ? cliAtualizado : c));
      salvarClienteSupabase(cliAtualizado).catch(() => {});
    }

    const clienteIdFinal = cliente?.id || agInicial.cliente_id;
    const nomePlanoObs = plano?.nome || cliente?.assinatura?.nome_plano || 'Clube VIP';

    for (let semana = 0; semana < maxSemanas; semana++) {
      const sessaoNum = semana + 1;

      // Calcula a data da sessão (+ semana * intervaloDias a partir da data do agendamento inicial)
      let dataSemanaStr = dataPart;
      if (semana > 0) {
        const d = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr));
        d.setDate(d.getDate() + semana * intervaloDias);

        let tentativas = 0;
        while (tentativas < 14) {
          const diaSemana = d.getDay();
          const expediente = configSalao.horarios_trabalho?.[diaSemana];
          const mStrF = String(d.getMonth() + 1).padStart(2, '0');
          const dStrF = String(d.getDate()).padStart(2, '0');
          const mmdd = `${mStrF}-${dStrF}`;
          const isFeriado = feriadosNacionais.includes(mmdd);
          const isFechado = expediente ? !expediente.ativo : (diaSemana === 0);

          if (!isFeriado && !isFechado) {
            break;
          }
          d.setDate(d.getDate() + 1);
          tentativas++;
        }

        const anoNovo = d.getFullYear();
        const mesNovo = String(d.getMonth() + 1).padStart(2, '0');
        const diaNovo = String(d.getDate()).padStart(2, '0');
        dataSemanaStr = `${anoNovo}-${mesNovo}-${diaNovo}`;
      }

      const inicioStr = semana === 0
        ? agInicial.inicio
        : `${dataSemanaStr}T${(hStr || '10').padStart(2, '0')}:${(mStr || '00').padStart(2, '0')}:${(sStr || '00').padStart(2, '0')}`;

      // Determina os procedimentos designados para esta sessão
      let procsDestaSessao: { servico_id: string; nome_servico: string; profissional_id: string; duracao_minutos: number }[] = [];

      const procs = obterConfiguracaoSessaoVip(plano, sessaoNum, servicos);
      if (procs.length > 0) {
        procsDestaSessao = procs.map(d => ({
          servico_id: d.servico_id,
          nome_servico: d.nome_servico,
          profissional_id: d.profissional_id || agInicial.profissional_id,
          duracao_minutos: d.duracao_minutos || 60
        }));
      }

      // Se não houver configuração explícita para esta sessão, usa o fallback da fila sequencial
      if (procsDestaSessao.length === 0) {
        const procPadrao = filaProcedimentosCiclo[semana] || filaProcedimentosCiclo[0];
        const s = servicos.find(item => item.id === procPadrao.servico_id);
        procsDestaSessao = [{
          servico_id: procPadrao.servico_id,
          nome_servico: procPadrao.nome_servico,
          profissional_id: procPadrao.profissional_id || agInicial.profissional_id,
          duracao_minutos: s?.duracao_minutos || 60
        }];
      }

      // Agrupa procedimentos da sessão por profissional (para suportar procedimentos simultâneos / 4 mãos)
      const mapaPorProfissional = new Map<string, typeof procsDestaSessao>();
      procsDestaSessao.forEach(p => {
        const pId = p.profissional_id || agInicial.profissional_id;
        const list = mapaPorProfissional.get(pId) || [];
        list.push(p);
        mapaPorProfissional.set(pId, list);
      });

      const idTag = plano?.id ? ` [PLANO_ID:${plano.id}]` : '';

      // Processa cada profissional alocado nesta sessão
      for (const [profId, procsDoProf] of mapaPorProfissional.entries()) {
        const servicosIds = procsDoProf.map(p => p.servico_id);
        const nomesServicosCombinados = procsDoProf.map(p => p.nome_servico).join(' + ');
        const durSessao = procsDoProf.reduce((acc, p) => acc + p.duracao_minutos, 0) || 60;

        // Calcula fim somando durSessao
        const [curDataPart, curHoraPart] = inicioStr.replace(' ', 'T').split('T');
        const [curH, curM] = (curHoraPart || '10:00:00').substring(0, 5).split(':').map(Number);
        const [curY, curMo, curD] = curDataPart.split('-').map(Number);
        const dFim = new Date(curY, curMo - 1, curD, curH, curM + durSessao);
        const anoFim = dFim.getFullYear();
        const mesFim = String(dFim.getMonth() + 1).padStart(2, '0');
        const diaFim = String(dFim.getDate()).padStart(2, '0');
        const hFimStr = String(dFim.getHours()).padStart(2, '0');
        const mFimStr = String(dFim.getMinutes()).padStart(2, '0');
        const fimStr = `${anoFim}-${mesFim}-${diaFim}T${hFimStr}:${mFimStr}:00`;

        if (semana === 0) {
          if (profId === agInicial.profissional_id) {
            // Atualiza agendamento inicial do profissional principal com Sessão 1 e PLANO_ID
            const baseObs = agInicial.observacoes?.includes('Sessão 1')
              ? agInicial.observacoes
              : `👑 Clube VIP (${nomePlanoObs}) - Sessão 1 (${nomesServicosCombinados})`;
            const novoObs = baseObs.includes('[PLANO_ID:') ? baseObs : `${baseObs}${idTag}`;
            
            const valorPlano = Number(plano?.preco_mensal) || 0;
            const valorTotalFinal = valorPlano > 0 ? valorPlano : (agInicial.valor_total || 0);

            if (agInicial.observacoes !== novoObs || agInicial.fim !== fimStr || agInicial.valor_total !== valorTotalFinal || !agInicial.pago_com_clube || agInicial.plano_id !== plano?.id || agInicial.recorrencia_posicao !== `1 de ${maxSemanas}`) {
              const atualizado: Agendamento = {
                ...agInicial,
                fim: fimStr,
                observacoes: novoObs,
                valor_total: valorTotalFinal,
                pago_com_clube: true,
                plano_id: plano?.id || agInicial.plano_id,
                recorrencia_grupo_id: agInicial.recorrencia_grupo_id || agInicial.id,
                recorrencia_tipo: 'semanal',
                recorrencia_posicao: `1 de ${maxSemanas}`
              };
              salvarAgendamentoSupabase(atualizado, servicosIds);
              setAgendamentos(prev => prev.map(a => a.id === agInicial.id ? atualizado : a));
              setItensAgendamento(prev => ({ ...prev, [agInicial.id]: servicosIds }));
            }
          } else {
            // Se houver outra profissional na Sessão 1 (ex: Pé com Lurdinha e Mão com Sheila no dia 1)
            const listaAtualAgendamentos = agendamentoInicialObj 
              ? [...agendamentos.filter(a => a.id !== agInicial.id), agInicial]
              : agendamentos;

            const jaExisteSimultaneo = listaAtualAgendamentos.some(a =>
              a.cliente_id === clienteIdFinal &&
              a.profissional_id === profId &&
              a.inicio.substring(0, 10) === dataSemanaStr &&
              a.status !== 'cancelado'
            ) || novosAgendamentos.some(a =>
              a.cliente_id === clienteIdFinal &&
              a.profissional_id === profId &&
              a.inicio.substring(0, 10) === dataSemanaStr
            );

            if (!jaExisteSimultaneo) {
              const novoId = gerarCodigoReserva();
              const novoAgendamento: Agendamento = {
                id: novoId,
                cliente_id: clienteIdFinal,
                profissional_id: profId,
                inicio: inicioStr,
                fim: fimStr,
                status: 'confirmado',
                valor_total: 0,
                valor_sinal: 0,
                pago_com_clube: true,
                plano_id: plano?.id,
                origem: 'admin',
                observacoes: `👑 Clube VIP (${nomePlanoObs})${idTag} - Sessão 1 (${nomesServicosCombinados}) [Simultâneo]`,
                criado_em: new Date().toISOString()
              };
              novosAgendamentos.push(novoAgendamento);
              novosItensMap[novoId] = servicosIds;
              salvarAgendamentoSupabase(novoAgendamento, servicosIds);
            }
          }
        } else {
          // Semana > 0: Cria a sessão para cada profissional designado
          const listaAtualAgendamentos = agendamentoInicialObj 
            ? [...agendamentos.filter(a => a.id !== agInicial.id), agInicial]
            : agendamentos;

          const jaExiste = listaAtualAgendamentos.some(a =>
            a.cliente_id === clienteIdFinal &&
            a.profissional_id === profId &&
            a.inicio.substring(0, 10) === dataSemanaStr &&
            a.status !== 'cancelado'
          ) || novosAgendamentos.some(a =>
            a.cliente_id === clienteIdFinal &&
            a.profissional_id === profId &&
            a.inicio.substring(0, 10) === dataSemanaStr
          );

          if (!jaExiste) {
            const novoId = gerarCodigoReserva();
            const novoAgendamento: Agendamento = {
              id: novoId,
              cliente_id: clienteIdFinal,
              profissional_id: profId,
              inicio: inicioStr,
              fim: fimStr,
              status: 'confirmado',
              valor_total: 0,
              valor_sinal: 0,
              pago_com_clube: true,
              plano_id: plano?.id,
              origem: 'admin',
              recorrencia_grupo_id: agInicial.recorrencia_grupo_id || agInicial.id,
              recorrencia_tipo: 'semanal',
              recorrencia_posicao: `${sessaoNum} de ${maxSemanas}`,
              observacoes: `👑 Clube VIP (${nomePlanoObs})${idTag} - Sessão ${sessaoNum} (${nomesServicosCombinados})`,
              criado_em: new Date().toISOString()
            };
            novosAgendamentos.push(novoAgendamento);
            novosItensMap[novoId] = servicosIds;
            salvarAgendamentoSupabase(novoAgendamento, servicosIds);
          }
        }
      }
    }

    if (novosAgendamentos.length > 0) {
      setAgendamentos(prev => {
        const next = [...prev, ...novosAgendamentos];
        try { localStorage.setItem('nail_agendamentos', JSON.stringify(next)); } catch (e) {}
        dbSetAll(STORES.AGENDAMENTOS, next);
        return next;
      });
      if (Object.keys(novosItensMap).length > 0) {
        setItensAgendamento(prev => {
          const nextItens = { ...prev, ...novosItensMap };
          try { localStorage.setItem('nail_itens_agendamento', JSON.stringify(nextItens)); } catch (e) {}
          return nextItens;
        });
      }
      const tipoSessaoLabel = intervaloDias === 7 ? 'semanal(is)' : (intervaloDias === 14 ? 'quinzenal(is)' : `a cada ${intervaloDias} dias`);
      mostrarNotificacaoGlobal(`👑 ${novosAgendamentos.length} sessão(ões) ${tipoSessaoLabel} do Clube VIP foram reservadas e bloqueadas na agenda!`);
      return { 
        success: true, 
        criados: novosAgendamentos.length, 
        mensagem: `${novosAgendamentos.length} sessões ${tipoSessaoLabel} foram reservadas e bloqueadas na agenda!` 
      };
    } else {
      return { 
        success: false, 
        criados: 0, 
        mensagem: 'As sessões deste ciclo já estavam reservadas.' 
      };
    }
  };

  // --- Ações de Fechamento de Comissões (Salão-Parceiro) ---
  const salvarFechamentoComissao = (fechamento: Omit<FechamentoComissao, 'id'>) => {
    const novoFechamento: FechamentoComissao = {
      ...fechamento,
      id: 'comissao_' + gerarId()
    };
    setFechamentosComissao(prev => [novoFechamento, ...prev]);

    // Se já foi pago, registra despesa no fluxo de caixa vinculada ao ID do fechamento
    if (fechamento.pago && fechamento.valor_liquido_pago > 0) {
      addDespesa({
        descricao: `Comissão: ${fechamento.nome_profissional} (${fechamento.periodo_inicio} a ${fechamento.periodo_fim})`,
        categoria: 'Comissões',
        valor: fechamento.valor_liquido_pago,
        data: fechamento.data_pagamento || new Date().toISOString().split('T')[0],
        fechamento_id: novoFechamento.id
      });
    }

    mostrarNotificacaoGlobal('✅ Fechamento de comissão registrado e lançado nas despesas!');
  };

  const deleteFechamentoComissao = (fechamentoId: string) => {
    setFechamentosComissao(prev => prev.filter(f => f.id !== fechamentoId));
    // Remove despesa vinculada se houver
    setDespesas(prev => {
      const despesaVinculada = prev.find(d => 
        d.fechamento_id === fechamentoId || 
        (d.categoria === 'Comissões' && d.descricao.includes(fechamentoId))
      );
      if (despesaVinculada) {
        deletarDespesaSupabase(despesaVinculada.id);
      }
      return prev.filter(d => d.fechamento_id !== fechamentoId);
    });
    mostrarNotificacaoGlobal('✅ Repasse de comissão cancelado e despesa estornada!');
  };

  const processarFilaSync = () => {
    processarFilaOffline();
  };

  return (
    <AppStateContext.Provider value={{
      clientes,
      servicos,
      agendamentos,
      pagamentos,
      listaEspera,
      configSalao,
      equipe,
      currentUser,
      login,
      loginWithCredentials,
      logout,
      addEquipe,
      updateEquipe,
      deleteEquipe,
      toggleEquipeAtivo,
      addCliente,
      updateCliente,
      deleteCliente,
      addServico,
      updateServico,
      deleteServico,
      addAgendamento,
      updateAgendamentoStatus,
      atualizarValorSinalAgendamento,
      atualizarServicosEProfissionalAgendamento,
      cancelAgendamento,
      deleteAgendamento,
      confirmarSinal,
      concluirAtendimento,
      addListaEspera,
      updateListaEsperaStatus,
      atenderListaEspera,
      updateConfigSalao,
      ajustarHorarioAlmoco,
      excluirOuLiberarAlmoco,
      checkConflitoHorario,
      obterServicosDeAgendamento,
      obterRecomendacoesManutencao,
      obterProximoHorarioLivre,
      googleConnected,
      googleUserEmail,
      googleLastSync,
      conectarGoogleAgenda,
      desconectarGoogleAgenda,
      sincronizarGoogleAgenda,
      limparAgendamentosSimuladosGoogle,
      deduplicarClientes,
      isSyncingCloud,
      lastCloudSyncTime,
      sincronizarComNuvem,
      enviarDadosParaNuvem,
      despesas,
      addDespesa,
      updateDespesa,
      deleteDespesa,
      categoriasDespesa,
      addCategoriaDespesa,
      deleteCategoriaDespesa,
      tecnicas,
      addTecnica,
      deleteTecnica,
      formatos,
      addFormato,
      deleteFormato,
      categoriasServico,
      addCategoriaServico,
      deleteCategoriaServico,
      categoriasProduto,
      addCategoriaProduto,
      deleteCategoriaProduto,
      materiais,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      notificacaoGlobal,
      mostrarNotificacaoGlobal,
      modalAlerta,
      mostrarAlerta,
      fecharAlerta,
      confirmarAcao,
      notificacaoClienteAcao,
      fecharNotificacaoClienteAcao,
      dispararNotificacaoCliente,
      tocarAlertaSonoro,
      avisosNaoLidos,
      marcarAvisoComoLido,
      marcarTodosAvisosComoLidos,
      produtos,
      addProduto,
      updateProduto,
      deleteProduto,
      darBaixaEstoqueProduto,
      salvarAnamneseCliente,
      planosAssinatura,
      addPlanoAssinatura,
      updatePlanoAssinatura,
      deletePlanoAssinatura,
      vincularAssinaturaCliente,
      cancelarAssinaturaCliente,
      abaterSaldoAssinatura,
      reservarRecorrenciaSemanalVip,
      fechamentosComissao,
      salvarFechamentoComissao,
      deleteFechamentoComissao,
      syncStatus,
      processarFilaSync
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
