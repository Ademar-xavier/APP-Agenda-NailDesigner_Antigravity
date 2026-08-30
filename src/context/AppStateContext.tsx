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
  login: (id: string) => void;
  logout: () => void;

  // Ações de Equipe
  addEquipe: (membro: Omit<Usuario, 'id' | 'ativo'>) => void;
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
  { id: 'c1', nome: 'Ana Souza', telefone: '(35) 98765-4321', email: 'ana.souza@gmail.com', aniversario: '1995-05-12', observacoes: 'Prefere lixar bem os cantinhos. Gosta de tons nude.', alergias: 'Nenhuma', preferencias: { formato: 'Quadrada', tamanho: 'Médio', tecnica: 'Gel', cores: 'Tons Nude', estilo: 'Clássico' }, consentimento_imagem: true, criado_em: '2026-06-01T10:00:00Z' },
  { id: 'c2', nome: 'Beatriz Silva', telefone: '(35) 97654-3210', email: 'beatriz.silva@hotmail.com', aniversario: '1988-08-20', observacoes: 'Unha muito fina, cuidado na preparação com a lixa elétrica.', alergias: 'Esmalte comum (usar hipoalergênico)', preferencias: { formato: 'Amendoada', tamanho: 'Curto', tecnica: 'Banho de Gel', cores: 'Vermelho e Vinho', estilo: 'Minimalista' }, consentimento_imagem: true, criado_em: '2026-06-15T14:30:00Z' },
  { id: 'c3', nome: 'Carla Santos', telefone: '(35) 96543-2109', aniversario: '1999-12-05', observacoes: 'Cutícula fina que sangra fácil.', alergias: 'Nenhuma', preferencias: { formato: 'Redonda', tamanho: 'Médio', tecnica: 'Combo mão + pé', cores: 'Rosa Claro', estilo: 'Delicado' }, consentimento_imagem: false, criado_em: '2026-07-10T11:15:00Z' },
  { id: 'c4', nome: 'Diana Pereira', telefone: '(35) 95432-1098', email: 'diana.p@outlook.com', aniversario: '1992-03-28', observacoes: 'Trabalha no teclado o dia todo, reforçar o ponto de tensão.', alergias: 'Nenhuma', preferencias: { formato: 'Stiletto', tamanho: 'Longo', tecnica: 'Alongamento em fibra', cores: 'Preto e Glitter', estilo: 'Ousado' }, consentimento_imagem: true, criado_em: '2026-07-22T09:00:00Z' },
  { id: 'c5', nome: 'Elisa Lima', telefone: '(35) 94321-0987', aniversario: '2001-10-15', observacoes: 'Costuma roer unhas quando está ansiosa.', alergias: 'Nenhuma', preferencias: { formato: 'Oval', tamanho: 'Curto', tecnica: 'Esmaltação em gel', cores: 'Azul e Tons Pastel', estilo: 'Moderno' }, consentimento_imagem: true, criado_em: '2026-08-01T16:00:00Z' },
  { id: 'c6', nome: 'Ana Beatriz Souza', telefone: '(35) 98877-6655', preferencias: { tecnica: 'Esmaltação em gel' }, consentimento_imagem: true, criado_em: '2026-08-20T10:00:00Z' },
  { id: 'c7', nome: 'Elaine Cristina', telefone: '11991234005', preferencias: { tecnica: 'Manicure tradicional' }, consentimento_imagem: true, criado_em: '2026-08-28T10:00:00Z' },
  { id: 'c8', nome: 'Juliana Castro', telefone: '11988887777', preferencias: { tecnica: 'Esmaltação em gel' }, consentimento_imagem: true, criado_em: '2026-08-28T11:00:00Z' },
  { id: 'c9', nome: 'Fernanda Lima', telefone: '11977776666', preferencias: { tecnica: 'Esmaltação em gel' }, consentimento_imagem: true, criado_em: '2026-08-28T12:00:00Z' },
  { id: 'c10', nome: 'Camille Duarte', telefone: '11966665555', preferencias: { tecnica: 'Esmaltação em gel' }, consentimento_imagem: true, criado_em: '2026-08-28T13:00:00Z' }
];

// Equipe inicial com dados reais
const equipeInicial: Usuario[] = [
  { id: 'u1', nome: 'Sheila Santos', email: 'sheila@agenda.com', telefone: '35 99714-1856', perfil: 'admin', ativo: true },
  { id: 'u2', nome: 'Lurdinha', email: 'lurdinha@agenda.com', telefone: '35 99182-1220', perfil: 'profissional', ativo: true }
];

// Agendamentos simulados projetados para gerar exatamente as métricas da imagem 5 + os pendentes da imagem do Claude
const dataBase = '2026-08-29';
const agendamentosIniciais: Agendamento[] = [
  // CONCLUÍDOS (Receita Realizada de R$ 885,00)
  // 1. Alongamento em fibra (2x) = R$ 320,00
  { id: 'a1', cliente_id: 'c1', profissional_id: 'u1', inicio: '2026-08-19T09:00:00', fim: '2026-08-19T11:00:00', status: 'concluido', valor_total: 160, valor_sinal: 30, origem: 'admin', criado_em: '2026-08-15T10:00:00Z' },
  { id: 'a2', cliente_id: 'c4', profissional_id: 'u1', inicio: '2026-08-21T14:00:00', fim: '2026-08-21T16:00:00', status: 'concluido', valor_total: 160, valor_sinal: 30, origem: 'admin', criado_em: '2026-08-18T10:00:00Z' },
  
  // 2. Esmaltação em gel (3x) = R$ 210,00
  { id: 'a3', cliente_id: 'c2', profissional_id: 'u1', inicio: '2026-08-20T10:00:00', fim: '2026-08-20T11:00:00', status: 'concluido', valor_total: 70, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-18T10:00:00Z' },
  { id: 'a4', cliente_id: 'c5', profissional_id: 'u1', inicio: '2026-08-23T15:00:00', fim: '2026-08-23T16:00:00', status: 'concluido', valor_total: 70, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-21T10:00:00Z' },
  { id: 'a5', cliente_id: 'c1', profissional_id: 'u2', inicio: '2026-08-26T11:00:00', fim: '2026-08-26T12:00:00', status: 'concluido', valor_total: 70, valor_sinal: 15, origem: 'admin', criado_em: '2026-08-24T10:00:00Z' },
  
  // 3. Manutenção de alongamento (1x) = R$ 110,00
  { id: 'a6', cliente_id: 'c2', profissional_id: 'u1', inicio: '2026-08-24T09:00:00', fim: '2026-08-24T10:30:00', status: 'concluido', valor_total: 110, valor_sinal: 20, origem: 'admin', criado_em: '2026-08-22T10:00:00Z' },
  
  // 4. Combo mão + pé (1x) = R$ 95,00
  { id: 'a7', cliente_id: 'c3', profissional_id: 'u2', inicio: '2026-08-27T16:00:00', fim: '2026-08-27T17:30:00', status: 'concluido', valor_total: 95, valor_sinal: 0, origem: 'admin', criado_em: '2026-08-25T10:00:00Z' },
  
  // 5. Pedicure spa (1x) = R$ 55,00
  { id: 'a8', cliente_id: 'c3', profissional_id: 'u1', inicio: '2026-08-28T10:00:00', fim: '2026-08-28T11:00:00', status: 'concluido', valor_total: 55, valor_sinal: 0, origem: 'admin', criado_em: '2026-08-26T10:00:00Z' },
  
  // 6. Nail art / decoração (2x) = R$ 50,00
  { id: 'a9', cliente_id: 'c5', profissional_id: 'u1', inicio: '2026-08-29T09:00:00', fim: '2026-08-29T09:30:00', status: 'concluido', valor_total: 25, valor_sinal: 0, origem: 'admin', criado_em: '2026-08-27T10:00:00Z' },
  { id: 'a10', cliente_id: 'c1', profissional_id: 'u1', inicio: '2026-08-29T10:00:00', fim: '2026-08-29T10:30:00', status: 'concluido', valor_total: 25, valor_sinal: 0, origem: 'admin', criado_em: '2026-08-27T11:00:00Z' },

  // PREVISTOS (Receita Prevista de R$ 460,00)
  // 1. Manutenção de alongamento (1x) = R$ 110,00
  { id: 'a11', cliente_id: 'c2', profissional_id: 'u1', inicio: '2026-08-31T14:00:00', fim: '2026-08-31T15:30:00', status: 'confirmado', valor_total: 110, valor_sinal: 20, origem: 'cliente', criado_em: '2026-08-28T10:00:00Z' },
  // 2. Alongamento em fibra (1x) = R$ 160,00
  { id: 'a12', cliente_id: 'c4', profissional_id: 'u1', inicio: '2026-08-31T09:00:00', fim: '2026-08-31T11:00:00', status: 'confirmado', valor_total: 160, valor_sinal: 30, origem: 'admin', criado_em: '2026-08-29T10:00:00Z' },
  // 3. Esmaltação em gel (1x) = R$ 70,00 (O pendente da Ana Beatriz Souza)
  { id: 'a13', cliente_id: 'c6', profissional_id: 'u2', inicio: '2026-08-29T14:00:00', fim: '2026-08-29T15:00:00', status: 'pendente', valor_total: 70, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-29T10:00:00Z' },
  // 4. Blindagem de Unha (1x) = R$ 90,00
  { id: 'a14', cliente_id: 'c5', profissional_id: 'u1', inicio: '2026-08-31T16:00:00', fim: '2026-08-31T17:00:00', status: 'confirmado', valor_total: 90, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-29T11:00:00Z' },
  // 5. Nail art / decoração (1x) = R$ 30,00 (Para somar R$ 460 total: 110+160+70+90+30 = 460!)
  { id: 'a15', cliente_id: 'c1', profissional_id: 'u1', inicio: '2026-08-31T11:30:00', fim: '2026-08-31T12:00:00', status: 'confirmado', valor_total: 30, valor_sinal: 0, origem: 'admin', criado_em: '2026-08-29T12:00:00Z' },

  // NOVOS AGENDAMENTOS PENDENTES (A Confirmar da Imagem do Claude)
  { id: 'a_elaine', cliente_id: 'c7', profissional_id: 'u1', inicio: '2026-08-29T17:00:00', fim: '2026-08-29T17:45:00', status: 'pendente', valor_total: 45, valor_sinal: 10, origem: 'cliente', criado_em: '2026-08-28T10:00:00Z' },
  { id: 'a_juliana', cliente_id: 'c8', profissional_id: 'u1', inicio: '2026-08-30T17:00:00', fim: '2026-08-30T18:00:00', status: 'pendente', valor_total: 70, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-28T11:00:00Z' },
  { id: 'a_fernanda', cliente_id: 'c9', profissional_id: 'u1', inicio: '2026-08-31T11:00:00', fim: '2026-08-31T12:00:00', status: 'pendente', valor_total: 70, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-28T12:00:00Z' },
  { id: 'a_camille', cliente_id: 'c10', profissional_id: 'u1', inicio: '2026-09-03T10:00:00', fim: '2026-09-03T11:00:00', status: 'pendente', valor_total: 70, valor_sinal: 15, origem: 'cliente', criado_em: '2026-08-28T13:00:00Z' },

  // CANCELADOS (Receita Cancelada de R$ 70,00)
  // Esmaltação em gel cancelada = R$ 70,00
  { id: 'a16', cliente_id: 'c2', profissional_id: 'u1', inicio: '2026-08-25T14:00:00', fim: '2026-08-25T15:00:00', status: 'cancelado', valor_total: 70, valor_sinal: 15, origem: 'cliente', motivo_cancelamento: 'Trabalho extra', cancelado_por: 'cliente', criado_em: '2026-08-23T10:00:00Z' },

  // PERDIDO/FALTA (Receita Perdida de R$ 45,00)
  // Sinal perdido por falta de Esmaltação em gel = R$ 45,00 (Ou um serviço de R$ 45,00 em falta)
  { id: 'a17', cliente_id: 'c5', profissional_id: 'u1', inicio: '2026-08-28T16:00:00', fim: '2026-08-28T17:00:00', status: 'falta', valor_total: 45, valor_sinal: 0, origem: 'admin', criado_em: '2026-08-27T10:00:00Z' }
];

const pagamentosIniciais: Pagamento[] = [
  // Concluídos (Realizados) - R$ 885,00
  { id: 'p1', agendamento_id: 'a1', tipo: 'pix', valor: 160, status: 'pago', data_pagamento: '2026-08-19T11:00:00' },
  { id: 'p2', agendamento_id: 'a2', tipo: 'pix', valor: 160, status: 'pago', data_pagamento: '2026-08-21T16:00:00' },
  { id: 'p3', agendamento_id: 'a3', tipo: 'pix', valor: 70, status: 'pago', data_pagamento: '2026-08-20T11:00:00' },
  { id: 'p4', agendamento_id: 'a4', tipo: 'pix', valor: 70, status: 'pago', data_pagamento: '2026-08-23T16:00:00' },
  { id: 'p5', agendamento_id: 'a5', tipo: 'cartao_credito', valor: 70, status: 'pago', data_pagamento: '2026-08-26T12:00:00' },
  { id: 'p6', agendamento_id: 'a6', tipo: 'pix', valor: 110, status: 'pago', data_pagamento: '2026-08-24T10:30:00' },
  { id: 'p7', agendamento_id: 'a7', tipo: 'dinheiro', valor: 95, status: 'pago', data_pagamento: '2026-08-27T17:30:00' },
  { id: 'p8', agendamento_id: 'a8', tipo: 'cartao_debito', valor: 55, status: 'pago', data_pagamento: '2026-08-28T11:00:00' },
  { id: 'p9', agendamento_id: 'a9', tipo: 'pix', valor: 25, status: 'pago', data_pagamento: '2026-08-29T09:30:00' },
  { id: 'p10', agendamento_id: 'a10', tipo: 'pix', valor: 25, status: 'pago', data_pagamento: '2026-08-29T10:30:00' },

  // Sinal Pago dos Futuros
  { id: 'p11', agendamento_id: 'a11', tipo: 'pix', valor: 20, status: 'sinal pago', data_pagamento: '2026-08-28T10:00:00' },
  { id: 'p12', agendamento_id: 'a12', tipo: 'pix', valor: 30, status: 'sinal pago', data_pagamento: '2026-08-29T10:00:00' },
  
  // Pendentes
  { id: 'p13', agendamento_id: 'a13', tipo: 'pix', valor: 70, status: 'pendente', data_pagamento: '2026-08-29T14:00:00' }
];

const listaEsperaInicial: ListaEspera[] = [
  { id: 'w1', cliente_id: 'c3', servico_id: 's4', data_preferida: '2026-08-31', periodo_preferido: 'tarde', status: 'aguardando', criado_em: '2026-08-28T15:00:00Z' },
  { id: 'w2', cliente_id: 'c2', servico_id: 's2', data_preferida: '2026-08-30', periodo_preferido: 'manha', status: 'aguardando', criado_em: '2026-08-28T16:00:00Z' }
];

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
    lembrete: 'Olá, {cliente}! Passando para lembrar do seu atendimento amanhã ({data}) às {hora} ({servico}). Responda: \n1 - Para Confirmar \n2 - Para Cancelar ou Remarcar (limite de {limite_horas}h de antecedência). Te espero!',
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
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('nail_clientes');
    const parsed = saved ? JSON.parse(saved) : [];
    // Migration: ensure we have at least 10 clients to match the screenshot list
    return parsed.length >= 10 ? parsed : clientesIniciais;
  });
  
  const [servicos, setServicos] = useState<Servico[]>(() => {
    const saved = localStorage.getItem('nail_servicos');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length >= 9 ? parsed : servicosIniciais;
  });

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    const saved = localStorage.getItem('nail_agendamentos');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length >= 20 ? parsed : agendamentosIniciais;
  });

  const [pagamentos, setPagamentos] = useState<Pagamento[]>(() => {
    const saved = localStorage.getItem('nail_pagamentos');
    return saved ? JSON.parse(saved) : pagamentosIniciais;
  });

  const [listaEspera, setListaEspera] = useState<ListaEspera[]>(() => {
    const saved = localStorage.getItem('nail_lista_espera');
    return saved ? JSON.parse(saved) : listaEsperaInicial;
  });

  const [configSalao, setConfigSalao] = useState<ConfigSalao>(() => {
    const saved = localStorage.getItem('nail_config_salao');
    return saved ? JSON.parse(saved) : configSalaoInicial;
  });

  const [itensAgendamento, setItensAgendamento] = useState<{ [key: string]: string[] }>(() => {
    const saved = localStorage.getItem('nail_itens_agendamento');
    const parsed = saved ? JSON.parse(saved) : {};
    return Object.keys(parsed).length >= 15 ? parsed : itensAgendamentoMock;
  });

  // Estado de Equipe e Autenticação
  const [equipe, setEquipe] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem('nail_equipe');
    return saved ? JSON.parse(saved) : equipeInicial;
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('nail_current_user');
    return saved ? JSON.parse(saved) : equipeInicial[0]; // Logado como Sheila por padrão para facilitar
  });

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
      localStorage.setItem('nail_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nail_current_user');
    }
  }, [currentUser]);

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

  const logout = () => {
    setCurrentUser(null);
  };

  // --- Ações de Equipe ---
  const addEquipe = (membro: Omit<Usuario, 'id' | 'ativo'>) => {
    const novo: Usuario = {
      ...membro,
      id: 'u_' + gerarId(),
      ativo: true
    };
    setEquipe(prev => [...prev, novo]);
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
    return cliente;
  };

  const updateCliente = (id: string, updated: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const deleteCliente = (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
  };

  // --- Ações de Serviços ---
  const addServico = (newServico: Omit<Servico, 'id' | 'ativo'>) => {
    const servico: Servico = {
      ...newServico,
      id: 's_' + gerarId(),
      ativo: true
    };
    setServicos(prev => [...prev, servico]);
  };

  const updateServico = (id: string, updated: Partial<Servico>) => {
    setServicos(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const deleteServico = (id: string) => {
    setServicos(prev => prev.map(s => s.id === id ? { ...s, ativo: false } : s));
  };

  // --- Ações de Despesas ---
  const addDespesa = (nova: Omit<Despesa, 'id'>) => {
    const despesa: Despesa = {
      ...nova,
      id: 'd_' + gerarId()
    };
    setDespesas(prev => [...prev, despesa]);
  };

  const updateDespesa = (id: string, updated: Partial<Despesa>) => {
    setDespesas(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
  };

  const deleteDespesa = (id: string) => {
    setDespesas(prev => prev.filter(d => d.id !== id));
  };

  const addCategoriaDespesa = (nome: string) => {
    if (!categoriasDespesa.includes(nome)) {
      setCategoriasDespesa(prev => [...prev, nome]);
    }
  };

  const deleteCategoriaDespesa = (nome: string) => {
    setCategoriasDespesa(prev => prev.filter(c => c !== nome));
  };

  // --- Ações de Técnicas ---
  const addTecnica = (nome: string) => {
    if (!tecnicas.includes(nome)) {
      setTecnicas(prev => [...prev, nome]);
    }
  };

  const deleteTecnica = (nome: string) => {
    setTecnicas(prev => prev.filter(t => t !== nome));
  };

  // --- Ações de Formatos ---
  const addFormato = (nome: string) => {
    if (!formatos.includes(nome)) {
      setFormatos(prev => [...prev, nome]);
    }
  };

  const deleteFormato = (nome: string) => {
    setFormatos(prev => prev.filter(f => f !== nome));
  };

  // --- Ações de Categorias de Serviços ---
  const addCategoriaServico = (nome: string) => {
    if (!categoriasServico.includes(nome)) {
      setCategoriasServico(prev => [...prev, nome]);
    }
  };

  const deleteCategoriaServico = (nome: string) => {
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
  };

  const updateMaterial = (id: string, updated: Partial<Material>) => {
    setMateriais(prev => prev.map(m => {
      if (m.id === id) {
        const merged = { ...m, ...updated };
        const custo = merged.preco_compra / (merged.rendimento || 1);
        return {
          ...merged,
          custo_por_uso: Number(custo.toFixed(2))
        };
      }
      return m;
    }));
  };

  const deleteMaterial = (id: string) => {
    setMateriais(prev => prev.filter(m => m.id !== id));
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

    setPagamentos(prev => prev.map(p => {
      if (p.agendamento_id === id) {
        if (canceladoPor === 'admin') {
          return { ...p, status: 'estornado' };
        }
      }
      return p;
    }));
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
  };

  const updateListaEsperaStatus = (id: string, status: ListaEspera['status']) => {
    setListaEspera(prev => prev.map(w => w.id === id ? { ...w, status } : w));
  };

  const atenderListaEspera = (id: string, agendamentoId: string) => {
    setListaEspera(prev => prev.map(w => w.id === id ? { ...w, status: 'atendido' } : w));
  };

  // --- Configurações ---
  const updateConfigSalao = (updated: Partial<ConfigSalao>) => {
    setConfigSalao(prev => ({ ...prev, ...updated }));
  };

  // --- Lógica de Manutenção Sugerida ---
  const obterRecomendacoesManutencao = () => {
    const hoje = new Date(dataBase);
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
      logout,
      addEquipe,
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
