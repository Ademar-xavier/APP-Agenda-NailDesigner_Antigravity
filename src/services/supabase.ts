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
    const payload = {
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria || 'Geral',
      descricao: servico.descricao || null,
      duracao_minutos: Number(servico.duracao_minutos) || 60,
      preco: Number(servico.preco) || 0,
      ativo: servico.ativo !== false,
      is_pacote: !!servico.is_pacote,
      retorno_dias: Number(servico.retorno_dias) || 20
    };
    const { error } = await supabase.from('servicos').upsert(payload);
    if (error) {
      console.error('Erro ao salvar serviço no Supabase:', error);
    } else {
      console.log('Serviço sincronizado com a nuvem com sucesso:', servico.nome);
    }
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
      profissional_id: agendamento.profissional_id || 'u1',
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      status: agendamento.status,
      valor_total: Number(agendamento.valor_total) || 0,
      valor_sinal: Number(agendamento.valor_sinal) || 0,
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

// --- SALVAR / ATUALIZAR MATERIAL ---
export const salvarMaterialSupabase = async (material: any) => {
  try {
    const { error } = await supabase.from('materiais').upsert({
      id: material.id,
      nome: material.nome,
      marca: material.marca || null,
      preco_compra: Number(material.preco_compra) || 0,
      rendimento: Number(material.rendimento) || 1,
      ativo: material.ativo !== false
    });
    if (error && error.code !== 'PGRST205') console.error('Erro ao salvar material no Supabase:', error);
  } catch (e) {}
};

// --- DELETAR MATERIAL ---
export const deletarMaterialSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    if (error && error.code !== 'PGRST205') console.error('Erro ao deletar material no Supabase:', error);
  } catch (e) {}
};

// --- SALVAR / ATUALIZAR DESPESA ---
export const salvarDespesaSupabase = async (despesa: any) => {
  try {
    const { error } = await supabase.from('despesas').upsert({
      id: despesa.id,
      descricao: despesa.descricao,
      categoria: despesa.categoria,
      valor: Number(despesa.valor) || 0,
      data: despesa.data,
      pago: despesa.pago !== false
    });
    if (error && error.code !== 'PGRST205') console.error('Erro ao salvar despesa no Supabase:', error);
  } catch (e) {}
};

// --- DELETAR DESPESA ---
export const deletarDespesaSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('despesas').delete().eq('id', id);
    if (error && error.code !== 'PGRST205') console.error('Erro ao deletar despesa no Supabase:', error);
  } catch (e) {}
};

// --- SALVAR / ATUALIZAR CONFIGURAÇÕES GERAIS (Técnicas, Formatos, Dados do Salão) ---
export const salvarConfiguracoesSupabase = async (dados: {
  configSalao?: any;
  tecnicas?: string[];
  formatos?: string[];
  categoriasServico?: string[];
  categoriasDespesa?: string[];
}) => {
  try {
    const { error } = await supabase.from('configuracoes').upsert({
      id: 'salao_principal',
      config_salao: dados.configSalao,
      tecnicas: dados.tecnicas,
      formatos: dados.formatos,
      categorias_servico: dados.categoriasServico,
      categorias_despesa: dados.categoriasDespesa,
      atualizado_em: new Date().toISOString()
    });
    if (error && error.code !== 'PGRST205') console.error('Erro ao salvar configuracoes no Supabase:', error);
  } catch (e) {}
};

// --- BUSCAR DADOS DA NUVEM (SINCRONIZAÇÃO INICIAL) ---
export const carregarDadosNuvemSupabase = async () => {
  try {
    const [clientesRes, agendamentosRes, listaRes, servicosRes, usuariosRes, fotosRes, matRes, despRes, configRes] = await Promise.all([
      supabase.from('clientes').select('*'),
      supabase.from('agendamentos').select('*'),
      supabase.from('lista_espera').select('*'),
      supabase.from('servicos').select('*'),
      supabase.from('usuarios').select('*'),
      supabase.from('fotos_clientes').select('*'),
      supabase.from('materiais').select('*'),
      supabase.from('despesas').select('*'),
      supabase.from('configuracoes').select('*')
    ]);

    return {
      clientes: clientesRes.data || [],
      agendamentos: agendamentosRes.data || [],
      listaEspera: listaRes.data || [],
      servicos: servicosRes.data || [],
      usuarios: usuariosRes.data || [],
      fotos: fotosRes.data || [],
      materiais: matRes.data || [],
      despesas: despRes.data || [],
      configuracoes: configRes.data?.[0] || null
    };
  } catch (e) {
    console.error('Erro ao carregar dados do Supabase:', e);
    return null;
  }
};
