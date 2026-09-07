import { createClient } from '@supabase/supabase-js';
import { Cliente, Agendamento, ListaEspera, Servico } from '../types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://skdvaxezhskfsfhmvajt.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sdzeLBdQeUgfY-7sHwPW5g_2UqZ3Rap';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tenant padrão para isolamento multi-tenant (SaaS)
export const CURRENT_SALAO_ID = 'salao_principal';

// --- SALVAR / ATUALIZAR CLIENTES ---
export const salvarClienteSupabase = async (cliente: Cliente) => {
  try {
    const prefs = {
      ...(cliente.preferencias || {}),
      anamnese: cliente.anamnese || (cliente.preferencias as any)?.anamnese || null,
      assinatura: cliente.assinatura || (cliente.preferencias as any)?.assinatura || null
    };

    const { error } = await supabase.from('clientes').upsert({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || null,
      aniversario: cliente.aniversario || null,
      observacoes: cliente.observacoes || null,
      alergias: cliente.alergias || null,
      preferencias: prefs,
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

// --- METADADOS EMBUTIDOS EM SERVIÇO (Sinal, Insumos, Subserviços) ---
export const encodeServicoDescricao = (
  descricaoOriginal: string | null | undefined, 
  extra: { 
    sinal_tipo?: string; 
    sinal_valor?: number; 
    materiais_utilizados?: any[]; 
    servicos_pacote_detalhes?: any[];
    foto?: string;
    fotos?: string[];
    destaque_catalogo?: boolean;
    itens_inclusos?: string[];
    orientacoes_agendamento?: string;
  }
) => {
  const cleanDesc = (descricaoOriginal || '').replace(/<!--NAIL_META:[\s\S]*?-->/g, '').trim();
  const hasExtra = (extra.sinal_tipo && extra.sinal_tipo !== 'nenhum') || 
                   (extra.sinal_valor !== undefined && extra.sinal_valor > 0) || 
                   (extra.materiais_utilizados && extra.materiais_utilizados.length > 0) ||
                   (extra.servicos_pacote_detalhes && extra.servicos_pacote_detalhes.length > 0) ||
                   !!extra.foto ||
                   (extra.fotos && extra.fotos.length > 0) ||
                   extra.destaque_catalogo !== undefined ||
                   (extra.itens_inclusos && extra.itens_inclusos.length > 0) ||
                   !!extra.orientacoes_agendamento;
  if (!hasExtra) return cleanDesc;
  const metaTag = `<!--NAIL_META:${JSON.stringify(extra)}-->`;
  return cleanDesc ? `${cleanDesc}\n\n${metaTag}` : metaTag;
};

export const decodeServicoDescricao = (rawDescricao: string | null | undefined) => {
  if (!rawDescricao) return { descricao: '', extra: {} as any };
  const match = rawDescricao.match(/<!--NAIL_META:([\s\S]*?)-->/);
  let extra: any = {};
  if (match && match[1]) {
    try {
      extra = JSON.parse(match[1]);
    } catch (e) {}
  }
  const descricao = rawDescricao.replace(/<!--NAIL_META:[\s\S]*?-->/g, '').trim();
  return { descricao, extra };
};

// --- SALVAR / ATUALIZAR SERVIÇO ---
export const salvarServicoSupabase = async (servico: any) => {
  try {
    const diasManutencao = Number(servico.intervalo_manutencao_dias !== undefined ? servico.intervalo_manutencao_dias : (servico.retorno_dias ?? 20));
    
    // Codifica metadados adicionais (sinal, insumos, fotos, catálogo, itens inclusos) na descrição sem quebrar colunas
    const descricaoComMetadados = encodeServicoDescricao(servico.descricao, {
      sinal_tipo: servico.sinal_tipo,
      sinal_valor: servico.sinal_valor,
      materiais_utilizados: servico.materiais_utilizados,
      servicos_pacote_detalhes: servico.servicos_pacote_detalhes,
      foto: servico.foto,
      fotos: servico.fotos,
      destaque_catalogo: servico.destaque_catalogo,
      itens_inclusos: servico.itens_inclusos,
      orientacoes_agendamento: servico.orientacoes_agendamento
    });

    // Envia exatamente as colunas existentes na tabela servicos do Supabase
    const payload = {
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria || 'Geral',
      descricao: descricaoComMetadados || null,
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

// --- DELETAR SERVIÇO ---
export const deletarServicoSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('servicos').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar serviço no Supabase:', error);
      return { sucesso: false, erro: error.message };
    }
    return { sucesso: true };
  } catch (e: any) {
    console.error('Falha na requisição deletarServicoSupabase:', e);
    return { sucesso: false, erro: e.message };
  }
};

// --- SALVAR / ATUALIZAR AGENDAMENTOS ---
export const salvarAgendamentoSupabase = async (
  agendamento: Agendamento, 
  servicosIds: string[] = [],
  clienteInfo?: Partial<Cliente>
) => {
  try {
    // 1. Garante que o cliente existe no banco antes de inserir o agendamento (evita violar agendamentos_cliente_id_fkey)
    if (agendamento.cliente_id && agendamento.cliente_id !== 'bloqueado') {
      const { data: cliExistente } = await supabase.from('clientes').select('id').eq('id', agendamento.cliente_id).maybeSingle();
      if (!cliExistente) {
        let cliParaSalvar: any = clienteInfo;
        if (!cliParaSalvar) {
          try {
            const raw = localStorage.getItem('nail_clientes');
            if (raw) {
              const parsed = JSON.parse(raw);
              cliParaSalvar = parsed.find((c: any) => c.id === agendamento.cliente_id);
            }
          } catch (e) {}
        }
        if (cliParaSalvar) {
          await salvarClienteSupabase(cliParaSalvar);
        }
      }
    }

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
    if (error) {
      console.error('Erro ao salvar agendamento no Supabase:', error);
      if (error.code === '23503' && clienteInfo) {
        await salvarClienteSupabase(clienteInfo as Cliente);
        await supabase.from('agendamentos').upsert({
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
          itens_servicos: servicosIds,
          criado_em: agendamento.criado_em || new Date().toISOString()
        });
      }
    }
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
export const salvarListaEsperaSupabase = async (item: ListaEspera, clienteInfo?: Partial<Cliente>) => {
  try {
    // Garante que o cliente existe no banco antes de inserir na lista de espera (evita violar lista_espera_cliente_id_fkey)
    if (item.cliente_id) {
      const { data: cliExistente } = await supabase.from('clientes').select('id').eq('id', item.cliente_id).maybeSingle();
      if (!cliExistente) {
        let cliParaSalvar: any = clienteInfo;
        if (!cliParaSalvar) {
          try {
            const raw = localStorage.getItem('nail_clientes');
            if (raw) {
              const parsed = JSON.parse(raw);
              cliParaSalvar = parsed.find((c: any) => c.id === item.cliente_id);
            }
          } catch (e) {}
        }
        if (cliParaSalvar) {
          await salvarClienteSupabase(cliParaSalvar);
        }
      }
    }

    const { error } = await supabase.from('lista_espera').upsert({
      id: item.id,
      cliente_id: item.cliente_id,
      servico_id: item.servico_id,
      data_preferida: item.data_preferida,
      periodo_preferido: item.periodo_preferido,
      status: item.status,
      criado_em: item.criado_em || new Date().toISOString()
    });
    if (error) {
      console.error('Erro ao salvar lista de espera no Supabase:', error);
      if (error.code === '23503' && clienteInfo) {
        await salvarClienteSupabase(clienteInfo as Cliente);
        await supabase.from('lista_espera').upsert({
          id: item.id,
          cliente_id: item.cliente_id,
          servico_id: item.servico_id,
          data_preferida: item.data_preferida,
          periodo_preferido: item.periodo_preferido,
          status: item.status,
          criado_em: item.criado_em || new Date().toISOString()
        });
      }
    }
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
    if (usuario.especialidade !== undefined) {
      payload.especialidade = usuario.especialidade;
    }

    let { error } = await supabase.from('usuarios').upsert(payload);

    // Se a tabela usuarios não tiver colunas extras ainda, faz fallback seguro
    if (error && error.code === 'PGRST204') {
      delete payload.servicos_habilitados;
      delete payload.chave_pix;
      delete payload.usar_pix_proprio;
      delete payload.especialidade;
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

// --- SALVAR / ATUALIZAR CONFIGURAÇÕES GERAIS (Técnicas, Formatos, Equipe, Planos VIP, Produtos em JSONB) ---
export const salvarConfiguracoesSupabase = async (dados: {
  configSalao?: any;
  tecnicas?: string[];
  formatos?: string[];
  categoriasServico?: string[];
  categoriasDespesa?: string[];
  categoriasProduto?: string[];
  equipe?: any[];
  planosAssinatura?: any[];
  produtos?: any[];
}) => {
  try {
    // Busca dados atuais na nuvem para mesclar e NUNCA sobrescrever listas não passadas com array vazio
    let atual: any = null;
    try {
      const { data } = await supabase.from('configuracoes').select('*').eq('id', 'salao_principal').maybeSingle();
      atual = data;
    } catch (e) {}

    const configSalaoObj = { 
      ...(atual?.config_salao || {}),
      ...(dados.configSalao || {})
    };

    if (dados.equipe) {
      configSalaoObj.equipe = dados.equipe;
    } else if (atual?.config_salao?.equipe && !configSalaoObj.equipe) {
      configSalaoObj.equipe = atual.config_salao.equipe;
    }

    if (dados.categoriasProduto) {
      configSalaoObj.categorias_produto = dados.categoriasProduto;
    } else if (atual?.config_salao?.categorias_produto && !configSalaoObj.categorias_produto) {
      configSalaoObj.categorias_produto = atual.config_salao.categorias_produto;
    }

    if (dados.planosAssinatura) {
      configSalaoObj.planos_assinatura = dados.planosAssinatura;
    } else if (atual?.config_salao?.planos_assinatura && !configSalaoObj.planos_assinatura) {
      configSalaoObj.planos_assinatura = atual.config_salao.planos_assinatura;
    }

    if (dados.produtos) {
      configSalaoObj.produtos = dados.produtos;
    } else if (atual?.config_salao?.produtos && !configSalaoObj.produtos) {
      configSalaoObj.produtos = atual.config_salao.produtos;
    }

    // Preserva avisos_nao_lidos já salvos no banco para nunca apagar nem reverter exclusões de avisos
    if (atual?.config_salao?.avisos_nao_lidos !== undefined && configSalaoObj.avisos_nao_lidos === undefined) {
      configSalaoObj.avisos_nao_lidos = atual.config_salao.avisos_nao_lidos;
    }

    // Obtém listas com prioridade: novos dados > dados atuais do banco > fallback
    const tecnicasFinal = dados.tecnicas !== undefined 
      ? dados.tecnicas 
      : (atual?.tecnicas && atual.tecnicas.length > 0 ? atual.tecnicas : (atual?.config_salao?.tecnicas || []));

    const formatosFinal = dados.formatos !== undefined 
      ? dados.formatos 
      : (atual?.formatos && atual.formatos.length > 0 ? atual.formatos : (atual?.config_salao?.formatos || []));

    const categoriasServicoFinal = dados.categoriasServico !== undefined 
      ? dados.categoriasServico 
      : (atual?.categorias_servico && atual.categorias_servico.length > 0 ? atual.categorias_servico : (atual?.config_salao?.categorias_servico || []));

    const categoriasDespesaFinal = dados.categoriasDespesa !== undefined 
      ? dados.categoriasDespesa 
      : (atual?.categorias_despesa && atual.categorias_despesa.length > 0 ? atual.categorias_despesa : (atual?.config_salao?.categorias_despesa || []));

    // Salva também dentro de configSalaoObj para redundância total e durabilidade
    configSalaoObj.tecnicas = tecnicasFinal;
    configSalaoObj.formatos = formatosFinal;
    configSalaoObj.categorias_servico = categoriasServicoFinal;
    configSalaoObj.categorias_despesa = categoriasDespesaFinal;

    const payload: any = {
      id: 'salao_principal',
      config_salao: configSalaoObj,
      tecnicas: tecnicasFinal,
      formatos: formatosFinal,
      categorias_servico: categoriasServicoFinal,
      categorias_despesa: categoriasDespesaFinal,
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

// --- CANAL DE BROADCAST REALTIME PERSISTENTE ---
let sharedBroadcastChannel: any = null;
let broadcastSubscribedPromise: Promise<void> | null = null;

export const getRealtimeBroadcastChannel = (): any => {
  if (!sharedBroadcastChannel) {
    sharedBroadcastChannel = supabase.channel('nail_app_realtime_broadcast');
    broadcastSubscribedPromise = new Promise((resolve) => {
      sharedBroadcastChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
    });
  }
  return sharedBroadcastChannel;
};

export const enviarBroadcastRealtime = async (event: string, payload: any) => {
  try {
    const canal = getRealtimeBroadcastChannel();
    if (broadcastSubscribedPromise) {
      await Promise.race([
        broadcastSubscribedPromise,
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
    }
    await canal.send({
      type: 'broadcast',
      event,
      payload
    });
  } catch (err) {
    console.warn('Erro ao enviar broadcast realtime:', err);
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
  await enviarBroadcastRealtime('CLIENTE_ACAO', notificacao);

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

    // Avisa todos os dispositivos conectados para atualizarem a lista em tempo real com broadcast garantido
    await enviarBroadcastRealtime('AVISOS_SYNC', { avisos });
  } catch (e) {
    console.error('Erro ao atualizar avisos no Supabase:', e);
  }
};
