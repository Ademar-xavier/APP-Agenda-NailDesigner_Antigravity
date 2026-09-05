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
    const diasManutencao = Number(servico.intervalo_manutencao_dias !== undefined ? servico.intervalo_manutencao_dias : (servico.retorno_dias ?? 20));
    
    // Envia exatamente as colunas existentes na tabela servicos do Supabase
    const payload = {
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria || 'Geral',
      descricao: servico.descricao || null,
      duracao_minutos: Number(servico.duracao_minutos) || 60,
      preco: Number(servico.preco) || 0,
      ativo: servico.ativo !== false,
      retorno_dias: diasManutencao,
      is_pacote: !!servico.is_pacote,
      itens_combo: servico.servicos_pacote || servico.itens_combo || []
    };

    const { error } = await supabase.from('servicos').upsert(payload);
    if (error) {
      console.error('Erro ao salvar serviço no Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
    return { sucesso: true };
  } catch (e: any) {
    console.error('Falha na requisição salvarServicoSupabase:', e);
    return { sucesso: false, erro: e.message };
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
  motivo?: string,
  confirmadoPor?: 'cliente' | 'admin'
) => {
  try {
    const updates: any = { status };
    if (canceladoPor) updates.cancelado_por = canceladoPor;
    if (motivo) updates.motivo_cancelamento = motivo;
    if (confirmadoPor) updates.confirmado_por = confirmadoPor;

    // 1. Atualizar localStorage imediatamente para sincronia no mesmo navegador
    try {
      const saved = localStorage.getItem('nail_agendamentos');
      if (saved) {
        const ags = JSON.parse(saved);
        const atualizados = ags.map((a: any) => {
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
        });
        localStorage.setItem('nail_agendamentos', JSON.stringify(atualizados));
      }
    } catch (err) {}

    // 2. Disparar broadcast instantâneo (0ms) para todas as abas abertas no navegador
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nail_agenda_sync');
        bc.postMessage({ type: 'STATUS_UPDATED', id, status, canceladoPor, motivo, confirmadoPor });
        bc.close();
      }
    } catch (err) {}

    // 3. Atualizar no Supabase (com eq e fallback para case-insensitive)
    const { error } = await supabase.from('agendamentos').update(updates).eq('id', id);
    if (error) {
      console.warn('Erro ao atualizar agendamento por eq, tentando case-insensitive:', error);
      await supabase.from('agendamentos').update(updates).ilike('id', id);
    }
  } catch (e) {
    console.error('Falha em atualizarStatusAgendamentoSupabase:', e);
  }
};

// --- ATUALIZAR VALOR DO SINAL DE AGENDAMENTO ---
export const atualizarValorSinalAgendamentoSupabase = async (
  id: string,
  valorSinal: number
) => {
  try {
    const valor = Number(valorSinal) || 0;
    const updates: any = { valor_sinal: valor };

    // 1. Atualizar localStorage imediatamente para sincronia no mesmo navegador
    try {
      const saved = localStorage.getItem('nail_agendamentos');
      if (saved) {
        const ags = JSON.parse(saved);
        const atualizados = ags.map((a: any) => {
          if (a.id && a.id.toLowerCase() === id.toLowerCase()) {
            return { ...a, valor_sinal: valor };
          }
          return a;
        });
        localStorage.setItem('nail_agendamentos', JSON.stringify(atualizados));
      }
    } catch (err) {}

    // 2. Disparar broadcast instantâneo (0ms) para todas as abas abertas no navegador
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nail_agenda_sync');
        bc.postMessage({ type: 'VALOR_SINAL_UPDATED', id, valorSinal: valor });
        bc.close();
      }
    } catch (err) {}

    // 3. Atualizar no Supabase (com eq e fallback para case-insensitive)
    const { error } = await supabase.from('agendamentos').update(updates).eq('id', id);
    if (error) {
      console.warn('Erro ao atualizar valor_sinal por eq, tentando case-insensitive:', error);
      await supabase.from('agendamentos').update(updates).ilike('id', id);
    }
  } catch (e) {
    console.error('Falha em atualizarValorSinalAgendamentoSupabase:', e);
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
    const preco = Number(material.preco_compra) || 0;
    const rend = Number(material.rendimento) || 1;
    const custo = (typeof material.custo_por_uso === 'number' && !isNaN(material.custo_por_uso) && material.custo_por_uso > 0)
      ? material.custo_por_uso
      : (rend > 0 ? Number((preco / rend).toFixed(2)) : 0);

    const payload: any = {
      id: material.id,
      nome: material.nome,
      marca: material.marca || null,
      preco_compra: preco,
      rendimento: rend,
      custo_por_uso: custo,
      ativo: material.ativo !== false
    };

    let { error } = await supabase.from('materiais').upsert(payload);
    if (error && error.code === 'PGRST204') {
      delete payload.custo_por_uso;
      const res = await supabase.from('materiais').upsert(payload);
      error = res.error;
    }
    if (error && error.code !== 'PGRST205') {
      console.error('Erro ao salvar material no Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
    return { sucesso: true };
  } catch (e: any) {
    return { sucesso: false, erro: e.message };
  }
};

// --- DELETAR MATERIAL ---
export const deletarMaterialSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    if (error && error.code !== 'PGRST205') console.error('Erro ao deletar material no Supabase:', error);
  } catch (e) {}
};

// --- SALVAR / ATUALIZAR USUÁRIO DA EQUIPE ---
export const salvarUsuarioSupabase = async (usuario: any) => {
  try {
    const payload: any = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email || null,
      telefone: usuario.telefone || '',
      perfil: usuario.perfil || 'profissional',
      ativo: usuario.ativo !== false,
      senha: usuario.senha || 'admin'
    };

    if (usuario.servicos_habilitados && Array.isArray(usuario.servicos_habilitados)) {
      payload.servicos_habilitados = usuario.servicos_habilitados;
    }
    if (usuario.chave_pix !== undefined) {
      payload.chave_pix = usuario.chave_pix;
    }
    if (usuario.usar_pix_proprio !== undefined) {
      payload.usar_pix_proprio = usuario.usar_pix_proprio;
    }

    let { error } = await supabase.from('usuarios').upsert(payload);

    // Se a tabela usuarios não tiver colunas extras ainda, faz fallback seguro
    if (error && error.code === 'PGRST204') {
      delete payload.servicos_habilitados;
      delete payload.chave_pix;
      delete payload.usar_pix_proprio;
      const res = await supabase.from('usuarios').upsert(payload);
      error = res.error;
    }

    if (error) {
      console.error('Erro ao salvar usuario no Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
    return { sucesso: true };
  } catch (e: any) {
    return { sucesso: false, erro: e.message };
  }
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

// --- SALVAR / ATUALIZAR CONFIGURAÇÕES GERAIS (Técnicas, Formatos, Equipe em JSONB) ---
export const salvarConfiguracoesSupabase = async (dados: {
  configSalao?: any;
  tecnicas?: string[];
  formatos?: string[];
  categoriasServico?: string[];
  categoriasDespesa?: string[];
  equipe?: any[];
}) => {
  try {
    const configSalaoObj = { ...(dados.configSalao || {}) };
    if (dados.equipe) {
      configSalaoObj.equipe = dados.equipe;
    }

    const payload: any = {
      id: 'salao_principal',
      config_salao: configSalaoObj,
      tecnicas: dados.tecnicas || [],
      formatos: dados.formatos || [],
      categorias_servico: dados.categoriasServico || [],
      categorias_despesa: dados.categoriasDespesa || [],
      atualizado_em: new Date().toISOString()
    };

    const { error } = await supabase.from('configuracoes').upsert(payload);
    if (error && error.code !== 'PGRST205') {
      console.error('Erro ao salvar configuracoes no Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
    return { sucesso: true };
  } catch (e: any) {
    return { sucesso: false, erro: e.message };
  }
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

// --- SINCRONIZAÇÃO E NOTIFICAÇÃO REALTIME MULTI-DISPOSITIVOS ---
export const enviarNotificacaoRealtimeMultiDispositivos = async (notificacao: {
  tipo: 'agendamento' | 'confirmacao' | 'cancelamento' | 'pagamento_sinal' | 'espera';
  titulo: string;
  mensagem: string;
  detalhes?: string;
  agendamentoId?: string;
  listaEsperaId?: string;
  clienteNome?: string;
  clienteId?: string;
}) => {
  // 1. BroadcastChannel local (para abas no mesmo aparelho)
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('nail_agenda_sync');
      bc.postMessage({
        type: 'CLIENTE_ACAO',
        notificacao
      });
      bc.close();
    }
  } catch (err) {}

  // 2. Supabase Realtime Broadcast (entre todos os aparelhos/celulares conectados via internet)
  try {
    const canal = supabase.channel('nail_app_realtime_broadcast');
    canal.send({
      type: 'broadcast',
      event: 'CLIENTE_ACAO',
      payload: notificacao
    }).catch(() => {});
  } catch (err) {
    console.error('Erro no broadcast realtime:', err);
  }

  // 3. Persistência na nuvem (Supabase configuracoes -> config_salao.avisos_nao_lidos)
  try {
    const { data } = await supabase.from('configuracoes').select('config_salao').eq('id', 'salao_principal').maybeSingle();
    const configSalao = data?.config_salao || {};
    const avisosExistentes: any[] = Array.isArray(configSalao.avisos_nao_lidos) ? configSalao.avisos_nao_lidos : [];

    const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const novoAviso = {
      id: 'aviso_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      criadoEm: new Date().toISOString(),
      lido: false,
      hora: horaAgora,
      ...notificacao
    };

    const filtrados = avisosExistentes.filter(a => {
      if (notificacao.agendamentoId && a.agendamentoId === notificacao.agendamentoId && a.tipo === notificacao.tipo) return false;
      if (notificacao.listaEsperaId && a.listaEsperaId === notificacao.listaEsperaId) return false;
      return true;
    });
    const atualizados = [novoAviso, ...filtrados].slice(0, 50);

    await supabase.from('configuracoes').upsert({
      id: 'salao_principal',
      config_salao: {
        ...configSalao,
        avisos_nao_lidos: atualizados
      },
      atualizado_em: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao persistir aviso no Supabase:', err);
  }
};

// --- PERSISTIR LISTA DE AVISOS ATUALIZADA (QUANDO DER BAIXA / MARCAR COMO LIDO) ---
export const persistirAvisosNaoLidosSupabase = async (avisos: any[]) => {
  try {
    const { data } = await supabase.from('configuracoes').select('config_salao').eq('id', 'salao_principal').maybeSingle();
    const configSalao = data?.config_salao || {};
    await supabase.from('configuracoes').upsert({
      id: 'salao_principal',
      config_salao: {
        ...configSalao,
        avisos_nao_lidos: avisos
      },
      atualizado_em: new Date().toISOString()
    });

    // Avisa todos os dispositivos conectados para atualizarem a lista em tempo real
    try {
      const canal = supabase.channel('nail_app_realtime_broadcast');
      canal.send({
        type: 'broadcast',
        event: 'AVISOS_SYNC',
        payload: { avisos }
      }).catch(() => {});
    } catch (e) {}
  } catch (e) {
    console.error('Erro ao atualizar avisos no Supabase:', e);
  }
};
