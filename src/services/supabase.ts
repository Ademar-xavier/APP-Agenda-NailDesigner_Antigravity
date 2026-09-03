import { createClient } from '@supabase/supabase-js';
import { Cliente, Agendamento, ListaEspera, Servico } from '../types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://skdvaxezhskfsfhmvajt.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sdzeLBdQeUgfY-7sHwPW5g_2UqZ3Rap';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SALVAR / ATUALIZAR CLIENTES ---
export const salvarClienteSupabase = async (cliente: Cliente) => {
  try {
    const { error } = await supabase.from('clientes').upsert({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || null,
      aniversario: cliente.aniversario || null,
      observacoes: cliente.observacoes || null,
      alergias: cliente.alergias || null,
      preferencias: cliente.preferencias || {},
      consentimento_imagem: !!cliente.consentimento_imagem,
      criado_em: cliente.criado_em || new Date().toISOString()
    });
    if (error) console.error('Erro ao salvar cliente no Supabase:', error);
  } catch (e) {
    console.error('Falha na requisição salvarClienteSupabase:', e);
  }
};

// --- DELETAR CLIENTE ---
export const deletarClienteSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) console.error('Erro ao deletar cliente no Supabase:', error);
  } catch (e) {
    console.error('Falha na requisição deletarClienteSupabase:', e);
  }
};

// --- SALVAR / ATUALIZAR SERVIÇO ---
export const salvarServicoSupabase = async (servico: any) => {
  try {
    const { error } = await supabase.from('servicos').upsert({
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria,
      descricao: servico.descricao || '',
      duracao_minutos: servico.duracao_minutos,
      preco: servico.preco,
      exige_sinal: !!servico.exige_sinal,
      valor_sinal: servico.valor_sinal || 0,
      ativo: servico.ativo !== false
    });
    if (error) console.error('Erro ao salvar serviço no Supabase:', error);
  } catch (e) {
    console.error('Falha na requisição salvarServicoSupabase:', e);
  }
};

// --- SALVAR / ATUALIZAR AGENDAMENTOS ---
export const salvarAgendamentoSupabase = async (agendamento: Agendamento, servicosIds: string[] = []) => {
  try {
    const { error } = await supabase.from('agendamentos').upsert({
      id: agendamento.id,
      cliente_id: agendamento.cliente_id,
      profissional_id: agendamento.profissional_id,
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      status: agendamento.status,
      valor_total: agendamento.valor_total,
      valor_sinal: agendamento.valor_sinal || 0,
      observacoes: agendamento.observacoes || null,
      origem: agendamento.origem || 'cliente',
      motivo_cancelamento: agendamento.motivo_cancelamento || null,
      cancelado_por: agendamento.cancelado_por || null,
      itens_servicos: servicosIds,
      criado_em: agendamento.criado_em || new Date().toISOString()
    });
    if (error) console.error('Erro ao salvar agendamento no Supabase:', error);
  } catch (e) {
    console.error('Falha na requisição salvarAgendamentoSupabase:', e);
  }
};

// --- ATUALIZAR STATUS DE AGENDAMENTO ---
export const atualizarStatusAgendamentoSupabase = async (
  id: string, 
  status: string, 
  canceladoPor?: string, 
  motivo?: string
) => {
  try {
    const updates: any = { status };
    if (canceladoPor) updates.cancelado_por = canceladoPor;
    if (motivo) updates.motivo_cancelamento = motivo;

    const { error } = await supabase.from('agendamentos').update(updates).eq('id', id);
    if (error) console.error('Erro ao atualizar agendamento no Supabase:', error);
  } catch (e) {
    console.error('Falha em atualizarStatusAgendamentoSupabase:', e);
  }
};

// --- DELETAR AGENDAMENTO ---
export const deletarAgendamentoSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('agendamentos').delete().eq('id', id);
    if (error) console.error('Erro ao deletar agendamento no Supabase:', error);
  } catch (e) {
    console.error('Falha em deletarAgendamentoSupabase:', e);
  }
};

// --- SALVAR / ATUALIZAR LISTA DE ESPERA ---
export const salvarListaEsperaSupabase = async (item: ListaEspera) => {
  try {
    const { error } = await supabase.from('lista_espera').upsert({
      id: item.id,
      cliente_id: item.cliente_id,
      servico_id: item.servico_id,
      data_preferida: item.data_preferida,
      periodo_preferido: item.periodo_preferido,
      status: item.status,
      criado_em: item.criado_em || new Date().toISOString()
    });
    if (error) console.error('Erro ao salvar lista de espera no Supabase:', error);
  } catch (e) {
    console.error('Falha em salvarListaEsperaSupabase:', e);
  }
};

// --- ATUALIZAR STATUS DE LISTA DE ESPERA ---
export const atualizarStatusListaEsperaSupabase = async (id: string, status: string) => {
  try {
    const { error } = await supabase.from('lista_espera').update({ status }).eq('id', id);
    if (error) console.error('Erro ao atualizar lista de espera no Supabase:', error);
  } catch (e) {
    console.error('Falha em atualizarStatusListaEsperaSupabase:', e);
  }
};

// --- SALVAR / ATUALIZAR FOTO CLIENTE ---
export const salvarFotoClienteSupabase = async (foto: { id: string; cliente_id: string; url: string; tipo: string; criado_em?: string }) => {
  try {
    const { error } = await supabase.from('fotos_clientes').upsert({
      id: foto.id,
      cliente_id: foto.cliente_id,
      url: foto.url,
      tipo: foto.tipo,
      criado_em: foto.criado_em || new Date().toISOString()
    });
    if (error) console.error('Erro ao salvar foto no Supabase:', error);
  } catch (e) {
    console.error('Falha em salvarFotoClienteSupabase:', e);
  }
};

// --- DELETAR FOTO CLIENTE ---
export const deletarFotoClienteSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('fotos_clientes').delete().eq('id', id);
    if (error) console.error('Erro ao deletar foto no Supabase:', error);
  } catch (e) {
    console.error('Falha em deletarFotoClienteSupabase:', e);
  }
};

// --- BUSCAR DADOS DA NUVEM (SINCRONIZAÇÃO INICIAL) ---
export const carregarDadosNuvemSupabase = async () => {
  try {
    const [clientesRes, agendamentosRes, listaRes, servicosRes] = await Promise.all([
      supabase.from('clientes').select('*'),
      supabase.from('agendamentos').select('*'),
      supabase.from('lista_espera').select('*'),
      supabase.from('servicos').select('*')
    ]);

    return {
      clientes: clientesRes.data || [],
      agendamentos: agendamentosRes.data || [],
      listaEspera: listaRes.data || [],
      servicos: servicosRes.data || []
    };
  } catch (e) {
    console.error('Erro ao carregar dados do Supabase:', e);
    return null;
  }
};
