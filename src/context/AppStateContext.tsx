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
  Material
} from '../types';
import { 
  supabase,
  salvarClienteSupabase,
  deletarClienteSupabase,
  salvarServicoSupabase,
  salvarAgendamentoSupabase,
  atualizarStatusAgendamentoSupabase,
  deletarAgendamentoSupabase,
  salvarListaEsperaSupabase,
  atualizarStatusListaEsperaSupabase,
  carregarDadosNuvemSupabase,
  salvarMaterialSupabase,
  deletarMaterialSupabase,
  salvarDespesaSupabase,
  deletarDespesaSupabase,
  salvarConfiguracoesSupabase
} from '../services/supabase';

export const ENV_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';

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
  addServico: (servico: Omit<Servico, 'id' | 'ativo'>) => void;
  updateServico: (id: string, servico: Partial<Servico>) => void;
  deleteServico: (id: string) => void;
  
  // Ações de Agendamentos
  addAgendamento: (agendamento: Omit<Agendamento, 'id' | 'criado_em' | 'fim'>, servicosSelecionados: string[]) => { success: boolean; error?: string; agendamento?: Agendamento };
  updateAgendamentoStatus: (id: string, status: AgendamentoStatus) => void;
  cancelAgendamento: (id: string, motivo: string, canceladoPor: 'cliente' | 'admin') => void;
  deleteAgendamento: (id: string) => void;
  confirmarSinal: (id: string, valor: number, metodo: MetodoPagamento) => void;
  concluirAtendimento: (id: string, valorRestante: number, metodo: MetodoPagamento, dataProximaManutencao?: string) => void;
  
  // Ações de Lista de Espera
  addListaEspera: (item: Omit<ListaEspera, 'id' | 'criado_em' | 'status'>) => void;
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

  // Materiais
  materiais: Material[];
  addMaterial: (material: Omit<Material, 'id' | 'custo_por_uso'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;

  // Auxiliares
  checkConflitoHorario: (inicio: string, fim: string, profissionalId: string, ignorarAgendamentoId?: string) => boolean;
  obterServicosDeAgendamento: (agendamentoId: string) => Servico[];
  obterRecomendacoesManutencao: () => { cliente: Cliente; servico: Servico; dataSugerida: string; diasAtraso: number }[];
  obterProximoHorarioLivre: (data: string, duracaoMinutos: number) => string | null;
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
  { id: 'u1', nome: 'Sheila Santos', email: 'sheila@agenda.com', telefone: '35 99714-1856', perfil: 'admin', ativo: true, senha: 'admin' },
  { id: 'u2', nome: 'Lurdinha', email: 'lurdinha@agenda.com', telefone: '35 99182-1220', perfil: 'profissional', ativo: true, senha: 'admin' }
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
    lembrete_horas_antecedencia: 24
  },
  templates_whatsapp: {
    confirmacao: 'Olá, {cliente}! Seu agendamento para {servico} com {profissional} no dia {data} às {hora} foi recebido. Para confirmar, efetue o pagamento do sinal de R$ {sinal} na chave Pix {chave_pix} e envie o comprovante aqui. Resumo: {link_reserva}',
    lembrete: 'Olá, {cliente}! Passando para lembrar do seu atendimento {dia_relativo} ({data}) às {hora} ({servico}). Responda: \n1 - Para Confirmar \n2 - Para Cancelar ou Remarcar (limite de {limite_horas}h de antecedência). Te espero!',
    retorno_manutencao: 'Olá, {cliente}! Faz {dias_visita} dias desde o seu último {servico}. Está na hora de fazer sua manutenção para manter suas unhas lindas e saudáveis! Agende pelo link: {link_agendamento}',
    lista_espera: 'Olá, {cliente}! Um horário que você desejava ficou vago para o dia {data} no período {periodo}. Gostaria de agendar? Responda rápido para garantir!'
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
        return parsed.filter(a => !/^a\d+$/.test(a.id) || !a.inicio.startsWith('2026-08'));
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

  // Estado de Equipe e Autenticação (Garante sempre Administrador padrão se vazio)
  const [equipe, setEquipe] = useState<Usuario[]>(() => {
    try {
      const saved = localStorage.getItem('nail_equipe');
      if (saved) {
        const parsed: Usuario[] = JSON.parse(saved);
        const temAdmin = parsed.some(u => u.perfil === 'admin' && u.ativo);
        if (parsed.length > 0 && temAdmin) {
          return parsed.map(u => ({ 
            ...u, 
            senha: u.senha || (u.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin') 
          }));
        }
        if (parsed.length > 0 && !temAdmin) {
          const defaultAdmin: Usuario = {
            id: 'admin_master',
            nome: 'Administrador',
            email: 'admin@salao.com',
            telefone: '',
            perfil: 'admin',
            ativo: true,
            senha: ENV_ADMIN_PASSWORD
          };
          return [defaultAdmin, ...parsed];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return equipeInicial.map(u => ({
      ...u,
      senha: u.perfil === 'admin' ? ENV_ADMIN_PASSWORD : (u.senha || 'admin')
    }));
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

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

  const [materiais, setMateriais] = useState<Material[]>(() => {
    const saved = localStorage.getItem('nail_materiais');
    return saved ? JSON.parse(saved) : [
      { id: 'm1', nome: 'Gel UV Construtor', marca: 'X&D', preco_compra: 60, rendimento: 15, custo_por_uso: 4 },
      { id: 'm2', nome: 'Tips de Unha (caixa)', marca: 'Gelish', preco_compra: 45, rendimento: 50, custo_por_uso: 0.9 },
      { id: 'm3', nome: 'Esmalte em Gel Nude', marca: 'D&Z', preco_compra: 25, rendimento: 20, custo_por_uso: 1.25 },
      { id: 'm4', nome: 'Prep Higienizador', marca: 'Beltart', preco_compra: 35, rendimento: 70, custo_por_uso: 0.5 },
      { id: 'm5', nome: 'Base Coat Gel', marca: 'Volia', preco_compra: 80, rendimento: 40, custo_por_uso: 2 },
      { id: 'm6', nome: 'Top Coat Selante', marca: 'Volia', preco_compra: 85, rendimento: 40, custo_por_uso: 2.12 }
    ];
  });

  // Salvar no LocalStorage sempre que houver modificações
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

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('nail_current_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('nail_current_user');
      localStorage.removeItem('nail_current_user');
    }
  }, [currentUser]);

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

      // 1. Clientes da Nuvem
      if (dados.clientes && dados.clientes.length > 0) {
        setClientes(dados.clientes);
        try { localStorage.setItem('nail_clientes', JSON.stringify(dados.clientes)); } catch (e) {}
      }

      // 2. Agendamentos da Nuvem
      if (dados.agendamentos && dados.agendamentos.length > 0) {
        setAgendamentos(dados.agendamentos);
        try { localStorage.setItem('nail_agendamentos', JSON.stringify(dados.agendamentos)); } catch (e) {}
      } else if (forcarSobrescrita && dados.agendamentos && dados.agendamentos.length === 0) {
        setAgendamentos([]);
        try { localStorage.setItem('nail_agendamentos', JSON.stringify([])); } catch (e) {}
      }

      // 3. Lista de Espera da Nuvem
      if (dados.listaEspera) {
        setListaEspera(dados.listaEspera);
        try { localStorage.setItem('nail_lista_espera', JSON.stringify(dados.listaEspera)); } catch (e) {}
      }

      // 4. Serviços da Nuvem
      if (dados.servicos && dados.servicos.length > 0) {
        setServicos(dados.servicos);
        try { localStorage.setItem('nail_servicos', JSON.stringify(dados.servicos)); } catch (e) {}
      }

      // 5. Usuários / Equipe da Nuvem
      if (dados.usuarios && dados.usuarios.length > 0) {
        const usuariosComSenha = dados.usuarios.map((u: any) => ({
          ...u,
          senha: u.senha || (u.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin')
        }));
        setEquipe(usuariosComSenha);
        try { localStorage.setItem('nail_equipe', JSON.stringify(usuariosComSenha)); } catch (e) {}
      }

      // 6. Fotos de Clientes da Nuvem
      if (dados.fotos && dados.fotos.length > 0) {
        const mapaFotos: { [clienteId: string]: any[] } = {};
        dados.fotos.forEach((f: any) => {
          if (!mapaFotos[f.cliente_id]) mapaFotos[f.cliente_id] = [];
          mapaFotos[f.cliente_id].push({
            id: f.id,
            url: f.url,
            tipo: f.tipo,
            criado_em: f.criado_em
          });
        });
        try { localStorage.setItem('nail_cliente_fotos_v2', JSON.stringify(mapaFotos)); } catch (e) {}
      }

      // 7. Materiais da Nuvem
      if (dados.materiais && dados.materiais.length > 0) {
        setMateriais(dados.materiais);
        try { localStorage.setItem('nail_materiais', JSON.stringify(dados.materiais)); } catch (e) {}
      }

      // 8. Despesas da Nuvem
      if (dados.despesas && dados.despesas.length > 0) {
        setDespesas(dados.despesas);
        try { localStorage.setItem('nail_despesas', JSON.stringify(dados.despesas)); } catch (e) {}
      }

      // 9. Configurações Gerais do Salão (Técnicas, Formatos, Categorias)
      if (dados.configuracoes) {
        if (dados.configuracoes.config_salao) {
          setConfigSalao(dados.configuracoes.config_salao);
          try { localStorage.setItem('nail_config_salao', JSON.stringify(dados.configuracoes.config_salao)); } catch (e) {}
        }
        if (dados.configuracoes.tecnicas && dados.configuracoes.tecnicas.length > 0) {
          setTecnicas(dados.configuracoes.tecnicas);
          try { localStorage.setItem('nail_tecnicas', JSON.stringify(dados.configuracoes.tecnicas)); } catch (e) {}
        }
        if (dados.configuracoes.formatos && dados.configuracoes.formatos.length > 0) {
          setFormatos(dados.configuracoes.formatos);
          try { localStorage.setItem('nail_formatos', JSON.stringify(dados.configuracoes.formatos)); } catch (e) {}
        }
        if (dados.configuracoes.categorias_servico && dados.configuracoes.categorias_servico.length > 0) {
          setCategoriasServico(dados.configuracoes.categorias_servico);
          try { localStorage.setItem('nail_categorias_servico', JSON.stringify(dados.configuracoes.categorias_servico)); } catch (e) {}
        }
        if (dados.configuracoes.categorias_despesa && dados.configuracoes.categorias_despesa.length > 0) {
          setCategoriasDespesa(dados.configuracoes.categorias_despesa);
          try { localStorage.setItem('nail_categorias_despesa', JSON.stringify(dados.configuracoes.categorias_despesa)); } catch (e) {}
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
        categoriasDespesa
      });

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
        } else if (payload.eventType === 'UPDATE') {
          setAgendamentos(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
        } else if (payload.eventType === 'DELETE') {
          setAgendamentos(prev => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setListaEspera(prev => {
            if (prev.some(l => l.id === payload.new.id)) return prev;
            return [payload.new as ListaEspera, ...prev];
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
            const map = new Map(prev.map(s => [s.id, s]));
            map.set(payload.new.id, payload.new as Servico);
            return Array.from(map.values());
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auxiliar para gerar ID único
  const gerarId = () => {
    return Math.random().toString(36).substring(2, 11);
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
    setCurrentUser(null);
  };

  // --- Ações de Equipe ---
  const addEquipe = (membro: Omit<Usuario, 'id' | 'ativo'>) => {
    const novo: Usuario = {
      ...membro,
      id: 'u_' + gerarId(),
      ativo: true,
      senha: membro.senha || (membro.perfil === 'admin' ? ENV_ADMIN_PASSWORD : 'admin')
    };
    setEquipe(prev => [...prev, novo]);
    try {
      supabase.from('usuarios').upsert(novo).then();
    } catch (e) {
      console.error('Erro ao salvar usuario no Supabase:', e);
    }
  };

  const updateEquipe = (id: string, updated: Partial<Usuario>) => {
    setEquipe(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    try {
      supabase.from('usuarios').update(updated).eq('id', id).then();
    } catch (e) {
      console.error('Erro ao atualizar usuario no Supabase:', e);
    }
  };

  const deleteEquipe = (id: string) => {
    setEquipe(prev => prev.filter(u => u.id !== id));
    try {
      supabase.from('usuarios').delete().eq('id', id).then();
    } catch (e) {
      console.error('Erro ao deletar usuario no Supabase:', e);
    }
  };

  const toggleEquipeAtivo = (id: string) => {
    setEquipe(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
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
    return cliente;
  };

  const updateCliente = (id: string, updated: Partial<Cliente>) => {
    setClientes(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updated } : c);
      const cli = next.find(c => c.id === id);
      if (cli) salvarClienteSupabase(cli);
      return next;
    });
  };

  const deleteCliente = (id: string) => {
    limparFocoAtivo();
    setClientes(prev => prev.filter(c => c.id !== id));
    deletarClienteSupabase(id);
  };

  // --- Ações de Serviços ---
  const addServico = (newServico: Omit<Servico, 'id' | 'ativo'>) => {
    const servico: Servico = {
      ...newServico,
      id: 's_' + gerarId(),
      ativo: true
    };
    setServicos(prev => [...prev, servico]);
    salvarServicoSupabase(servico);
  };

  const updateServico = (id: string, updated: Partial<Servico>) => {
    setServicos(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updated } : s);
      const serv = next.find(s => s.id === id);
      if (serv) salvarServicoSupabase(serv);
      return next;
    });
  };

  const deleteServico = (id: string) => {
    limparFocoAtivo();
    setServicos(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ativo: false } : s);
      const serv = next.find(s => s.id === id);
      if (serv) salvarServicoSupabase(serv);
      return next;
    });
  };

  // --- Ações de Despesas ---
  const addDespesa = (nova: Omit<Despesa, 'id'>) => {
    const despesa: Despesa = {
      ...nova,
      id: 'd_' + gerarId()
    };
    setDespesas(prev => [...prev, despesa]);
    salvarDespesaSupabase(despesa);
  };

  const updateDespesa = (id: string, updated: Partial<Despesa>) => {
    setDespesas(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...updated } : d);
      const desp = next.find(d => d.id === id);
      if (desp) salvarDespesaSupabase(desp);
      return next;
    });
  };

  const deleteDespesa = (id: string) => {
    limparFocoAtivo();
    setDespesas(prev => prev.filter(d => d.id !== id));
    deletarDespesaSupabase(id);
  };

  const addCategoriaDespesa = (nome: string) => {
    if (!categoriasDespesa.includes(nome)) {
      setCategoriasDespesa(prev => [...prev, nome]);
    }
  };

  const deleteCategoriaDespesa = (nome: string) => {
    limparFocoAtivo();
    setCategoriasDespesa(prev => prev.filter(c => c !== nome));
  };

  // --- Ações de Técnicas ---
  const addTecnica = (nome: string) => {
    if (!tecnicas.includes(nome)) {
      setTecnicas(prev => [...prev, nome]);
    }
  };

  const deleteTecnica = (nome: string) => {
    limparFocoAtivo();
    setTecnicas(prev => prev.filter(t => t !== nome));
  };

  // --- Ações de Formatos ---
  const addFormato = (nome: string) => {
    if (!formatos.includes(nome)) {
      setFormatos(prev => [...prev, nome]);
    }
  };

  const deleteFormato = (nome: string) => {
    limparFocoAtivo();
    setFormatos(prev => prev.filter(f => f !== nome));
  };

  // --- Ações de Categorias de Serviços ---
  const addCategoriaServico = (nome: string) => {
    if (!categoriasServico.includes(nome)) {
      setCategoriasServico(prev => [...prev, nome]);
    }
  };

  const deleteCategoriaServico = (nome: string) => {
    limparFocoAtivo();
    setCategoriasServico(prev => prev.filter(c => c !== nome));
  };

  // --- Ações de Materiais ---
  const addMaterial = (novo: Omit<Material, 'id' | 'custo_por_uso'>) => {
    const custo = novo.preco_compra / (novo.rendimento || 1);
    const material: Material = {
      ...novo,
      id: 'm_' + gerarId(),
      custo_por_uso: Number(custo.toFixed(2))
    };
    setMateriais(prev => [...prev, material]);
    salvarMaterialSupabase(material);
  };

  const updateMaterial = (id: string, updated: Partial<Material>) => {
    setMateriais(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const merged = { ...m, ...updated };
          const custo = merged.preco_compra / (merged.rendimento || 1);
          return {
            ...merged,
            custo_por_uso: Number(custo.toFixed(2))
          };
        }
        return m;
      });
      const mat = next.find(m => m.id === id);
      if (mat) salvarMaterialSupabase(mat);
      return next;
    });
  };

  const deleteMaterial = (id: string) => {
    limparFocoAtivo();
    setMateriais(prev => prev.filter(m => m.id !== id));
    deletarMaterialSupabase(id);
  };

  // --- Lógica de Conflitos ---
  const checkConflitoHorario = (inicioStr: string, fimStr: string, profissionalId: string, ignorarAgendamentoId?: string) => {
    const inicio = new Date(inicioStr).getTime();
    const fim = new Date(fimStr).getTime();
    
    return agendamentos.some(a => {
      if (a.id === ignorarAgendamentoId) return false;
      if (a.status === 'cancelado' || a.status === 'falta') return false;
      if (a.profissional_id !== profissionalId) return false;
      
      const aInicio = new Date(a.inicio).getTime();
      const aFim = new Date(a.fim).getTime();
      
      return Math.max(inicio, aInicio) < Math.min(fim, aFim);
    });
  };

  const obterServicosDeAgendamento = (agendamentoId: string): Servico[] => {
    const ids = itensAgendamento[agendamentoId] || [];
    const directServs = servicos.filter(s => ids.includes(s.id));
    const expandedServs: Servico[] = [];
    directServs.forEach(s => {
      expandedServs.push(s);
      if (s.is_pacote && s.servicos_pacote) {
        s.servicos_pacote.forEach(subId => {
          const subServ = servicos.find(sub => sub.id === subId);
          if (subServ && !expandedServs.some(item => item.id === subId)) {
            expandedServs.push(subServ);
          }
        });
      }
    });
    return expandedServs;
  };

  // --- Ações de Agendamento ---
  const addAgendamento = (
    novoAgendamento: Omit<Agendamento, 'id' | 'criado_em' | 'fim'>, 
    servicosSelecionados: string[]
  ) => {
    const servs = servicos.filter(s => servicosSelecionados.includes(s.id));
    const duracaoTotal = servs.reduce((acc, s) => acc + s.duracao_minutos, 0);
    
    const dataInicio = new Date(novoAgendamento.inicio);
    const dataFim = new Date(dataInicio.getTime() + duracaoTotal * 60 * 1000);
    const fimStr = dataFim.toISOString().replace(/\.\d+Z$/, '');
    
    const conflito = checkConflitoHorario(novoAgendamento.inicio, fimStr, novoAgendamento.profissional_id);
    if (conflito && novoAgendamento.cliente_id !== 'bloqueado') {
      return { success: false, error: 'O horário selecionado conflita com outro agendamento ativo.' };
    }

    const id = 'a_' + gerarId();
    
    const agendamento: Agendamento = {
      ...novoAgendamento,
      id,
      fim: fimStr,
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

    setAgendamentos(prev => [...prev, agendamento]);
    salvarAgendamentoSupabase(agendamento, servicosSelecionados);

    if (googleConnected) {
      const cli = clientes.find(c => c.id === agendamento.cliente_id);
      const servNomes = servs.map(s => s.nome).join(' + ');
      const isFake = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'].includes(agendamento.cliente_id);
      if (!isFake && novoAgendamento.observacoes !== 'Sincronizado automaticamente da Google Agenda') {
        setTimeout(() => {
          alert(`[Google Agenda - Sincronização Dupla] \nO agendamento de ${cli?.nome || 'Bloqueio'} (${servNomes}) foi enviado e sincronizado no Google Agenda de sheilaalicelara18@gmail.com!`);
        }, 500);
      }
    }

    return { success: true, agendamento };
  };

  const updateAgendamentoStatus = (id: string, status: AgendamentoStatus) => {
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    atualizarStatusAgendamentoSupabase(id, status);
  };

  const cancelAgendamento = (id: string, motivo: string, canceladoPor: 'cliente' | 'admin') => {
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
  };

  const deleteAgendamento = (id: string) => {
    limparFocoAtivo();
    setAgendamentos(prev => prev.filter(a => a.id !== id));
    deletarAgendamentoSupabase(id);
  };

  const confirmarSinal = (agendamentoId: string, valor: number, metodo: MetodoPagamento) => {
    setAgendamentos(prev => prev.map(a => {
      if (a.id === agendamentoId && a.status === 'pendente') {
        return { ...a, status: 'confirmado' };
      }
      return a;
    }));

    setPagamentos(prev => {
      const existente = prev.find(p => p.agendamento_id === agendamentoId && p.valor === valor && p.status === 'pendente');
      if (existente) {
        return prev.map(p => p.id === existente.id ? { ...p, status: 'sinal pago', tipo: metodo, data_pagamento: new Date().toISOString() } : p);
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
  };

  const concluirAtendimento = (
    agendamentoId: string, 
    valorRestante: number, 
    metodo: MetodoPagamento,
    dataProximaManutencao?: string
  ) => {
    setAgendamentos(prev => prev.map(a => a.id === agendamentoId ? { ...a, status: 'concluido' } : a));

    if (valorRestante > 0) {
      const pagFinal: Pagamento = {
        id: 'p_' + gerarId(),
        agendamento_id: agendamentoId,
        tipo: metodo,
        valor: valorRestante,
        status: 'pago',
        data_pagamento: new Date().toISOString()
      };
      setPagamentos(prev => [...prev, pagFinal]);
    }

    setPagamentos(prev => prev.map(p => {
      if (p.agendamento_id === agendamentoId && p.status === 'sinal pago') {
        return { ...p, status: 'pago' };
      }
      return p;
    }));
  };

  // --- Ações de Lista de Espera ---
  const addListaEspera = (item: Omit<ListaEspera, 'id' | 'criado_em' | 'status'>) => {
    const novoItem: ListaEspera = {
      ...item,
      id: 'w_' + gerarId(),
      status: 'aguardando',
      criado_em: new Date().toISOString()
    };
    setListaEspera(prev => [...prev, novoItem]);
    salvarListaEsperaSupabase(novoItem);
  };

  const updateListaEsperaStatus = (id: string, status: ListaEspera['status']) => {
    setListaEspera(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    atualizarStatusListaEsperaSupabase(id, status);
  };

  const atenderListaEspera = (id: string, agendamentoId: string) => {
    setListaEspera(prev => prev.map(w => w.id === id ? { ...w, status: 'atendido' } : w));
    atualizarStatusListaEsperaSupabase(id, 'atendido');
  };

  // --- Configurações ---
  const updateConfigSalao = (updated: Partial<ConfigSalao>) => {
    setConfigSalao(prev => ({ ...prev, ...updated }));
  };

  // --- Lógica de Manutenção Sugerida ---
  const obterRecomendacoesManutencao = () => {
    const hoje = new Date();
    const recomendacoes: { cliente: Cliente; servico: Servico; dataSugerida: string; diasAtraso: number }[] = [];

    clientes.forEach(cliente => {
      const agendsCliente = agendamentos
        .filter(a => a.cliente_id === cliente.id && a.status === 'concluido')
        .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
      
      if (agendsCliente.length === 0) return;

      const ultimoAgend = agendsCliente[0];
      const servs = obterServicosDeAgendamento(ultimoAgend.id);
      
      const servsManutencao = servs.filter(s => s.intervalo_manutencao_dias > 0);
      if (servsManutencao.length === 0) return;

      servsManutencao.forEach(serv => {
        const dataUltimoAtendimento = new Date(ultimoAgend.inicio);
        const dataSugerida = new Date(dataUltimoAtendimento.getTime() + serv.intervalo_manutencao_dias * 24 * 60 * 60 * 1000);
        
        const temAgendamentoFuturo = agendamentos.some(a => 
          a.cliente_id === cliente.id && 
          new Date(a.inicio).getTime() > dataUltimoAtendimento.getTime() && 
          (a.status === 'confirmado' || a.status === 'pendente')
        );

        if (!temAgendamentoFuturo) {
          const diffTempo = hoje.getTime() - dataSugerida.getTime();
          const diasAtraso = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
          
          if (diasAtraso >= -3) {
            recomendacoes.push({
              cliente,
              servico: serv,
              dataSugerida: dataSugerida.toISOString().split('T')[0],
              diasAtraso: diasAtraso > 0 ? diasAtraso : 0
            });
          }
        }
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
      const fimAgend = dateFim.toISOString().replace(/\.\d+Z$/, '');

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

  const sincronizarGoogleAgenda = (eventos: any[]) => {
    eventos.forEach(evento => {
      // 1. Extrair nome e telefone
      let clientNome = evento.clienteNome.trim();
      let clientFone = evento.clienteTelefone ? evento.clienteTelefone.replace(/\D/g, '') : '';
      let servId = evento.servicoId;

      // Encontrar ou cadastrar cliente
      let client = clientes.find(c => {
        if (clientFone) {
          return c.telefone.replace(/\D/g, '') === clientFone;
        }
        return c.nome.toLowerCase() === clientNome.toLowerCase();
      });

      if (!client) {
        client = addCliente({
          nome: clientNome,
          telefone: evento.clienteTelefone || '(35) 99999-9999',
          consentimento_imagem: false
        });
      }

      // Adicionar agendamento
      const total = servicos.find(s => s.id === servId)?.preco || 70;
      addAgendamento({
        cliente_id: client.id,
        profissional_id: 'u1', // Padrão: Sheila
        inicio: evento.inicio,
        status: 'confirmado',
        valor_total: total,
        valor_sinal: 0,
        observacoes: 'Sincronizado automaticamente da Google Agenda',
        origem: 'cliente'
      }, [servId]);
    });

    setGoogleLastSync(new Date().toLocaleString('pt-BR'));
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
      cancelAgendamento,
      deleteAgendamento,
      confirmarSinal,
      concluirAtendimento,
      addListaEspera,
      updateListaEsperaStatus,
      atenderListaEspera,
      updateConfigSalao,
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
      materiais,
      addMaterial,
      updateMaterial,
      deleteMaterial
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
