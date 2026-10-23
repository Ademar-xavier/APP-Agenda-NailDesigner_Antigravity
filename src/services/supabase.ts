import { createClient } from '@supabase/supabase-js';
import { Cliente, Agendamento, ListaEspera, Servico } from '../types';
import { gerarIdSeguro } from '../utils/cryptoHelper';

const FALLBACK_URL = typeof atob !== 'undefined'
  ? atob('aHR0cHM6Ly9za2R2YXhlemhza2ZzZmhtdmFqdC5zdXBhYmFzZS5jbw==')
  : '';
const FALLBACK_KEY = typeof atob !== 'undefined'
  ? atob('c2JfcHVibGlzaGFibGVfc2R6ZUxCZFFlVWdmWS03c0h3UFc1Z18yVXFaM1JhcA==')
  : '';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL).trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tenant padrão e resolvedor multi-tenant (SaaS)
/**
 * Normaliza qualquer formato de identificador ou slug para o salao_id canônico do banco
 * Ex: 'sheila' -> 'salao_sheila'
 * Ex: 'studio-bella' -> 'salao_studio_bella'
 * Ex: 'salao_studio_bella' -> 'salao_studio_bella'
 */
export const normalizarSalaoId = (paramOrSlug?: string | null): string => {
  if (!paramOrSlug) return 'salao_sheila';
  const clean = paramOrSlug.trim().toLowerCase();
  if (clean === 'sheila' || clean === 'salao_sheila' || clean === 'sheilasantos' || clean === 'default' || clean === '') {
    return 'salao_sheila';
  }
  if (clean.startsWith('salao_')) {
    return clean;
  }
  return `salao_${clean.replace(/[^a-z0-9]/g, '_')}`;
};

export const getActiveSalaoId = (): string => {
  try {
    if (typeof window !== 'undefined') {
      // 1. Checa query param na URL (ex: ?salao=slug ou ?s=slug)
      const searchParams = new URLSearchParams(window.location.search);
      const salaoParam = searchParams.get('salao') || searchParams.get('s');
      if (salaoParam && salaoParam.trim()) {
        const canonical = normalizarSalaoId(salaoParam);
        localStorage.setItem('nail_salao_id', canonical);
        return canonical;
      }

      // 2. Checa hash param (ex: #agendar?salao=slug ou #admin?salao=slug)
      if (window.location.hash.includes('salao=')) {
        const hashMatch = window.location.hash.match(/salao=([a-zA-Z0-9_-]+)/i);
        if (hashMatch && hashMatch[1]) {
          const canonical = normalizarSalaoId(hashMatch[1]);
          localStorage.setItem('nail_salao_id', canonical);
          return canonical;
        }
      }

      // 3. Checa licença ativa gravada localmente
      const licRaw = localStorage.getItem('nail_app_licenca_ativa_v1');
      if (licRaw) {
        try {
          const lic = JSON.parse(licRaw);
          if (lic?.salao_id && typeof lic.salao_id === 'string' && lic.salao_id.trim()) {
            return normalizarSalaoId(lic.salao_id);
          }
        } catch (e) {}
      }

      // 4. Checa tenant salvo explicitamente no localStorage
      const savedSalao = localStorage.getItem('nail_salao_id');
      if (savedSalao && savedSalao.trim()) {
        return normalizarSalaoId(savedSalao);
      }
    }
  } catch (e) {}

  // Fallback padrão seguro para manter todos os dados da Sheila 100% preservados
  return 'salao_sheila';
};

export const setActiveSalaoId = (salaoId: string) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nail_salao_id', salaoId.trim().toLowerCase());
    }
  } catch (e) {}
};

export const CURRENT_SALAO_ID = getActiveSalaoId();

// Cache em memória para detecção dinâmica da existência da coluna salao_id no Supabase
let _hasSalaoIdColumn: boolean | null = null;

export const verificarColunaMultiTenantExiste = async (forceCheck = false): Promise<boolean> => {
  if (_hasSalaoIdColumn !== null && !forceCheck) return _hasSalaoIdColumn;
  try {
    const { error } = await supabase.from('agendamentos').select('salao_id').limit(1);
    if (error && (error.code === '42703' || error.message?.includes('column agendamentos.salao_id does not exist') || error.message?.includes('schema cache'))) {
      _hasSalaoIdColumn = false;
      return false;
    }
    _hasSalaoIdColumn = true;
    return true;
  } catch (e) {
    return false;
  }
};

// --- SALVAR / ATUALIZAR CLIENTES ---
export const salvarClienteSupabase = async (cliente: Cliente) => {
  try {
    const salaoId = cliente.salao_id || getActiveSalaoId();
    const sexoFinal = cliente.sexo || (cliente.preferencias as any)?.sexo || 'feminino';
    const prefs = {
      ...(cliente.preferencias || {}),
      sexo: sexoFinal,
      anamnese: cliente.anamnese || (cliente.preferencias as any)?.anamnese || null,
      assinatura: cliente.assinatura || (cliente.preferencias as any)?.assinatura || null
    };

    const payload: any = {
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || null,
      aniversario: cliente.aniversario || null,
      observacoes: cliente.observacoes || null,
      alergias: cliente.alergias || null,
      preferencias: prefs,
      consentimento_imagem: !!cliente.consentimento_imagem,
      criado_em: cliente.criado_em || new Date().toISOString(),
      salao_id: salaoId
    };

    let { error } = await supabase.from('clientes').upsert({ ...payload, sexo: sexoFinal });
    if (error) {
      if (error.code === '42703' || error.message?.includes('column')) {
        delete payload.salao_id;
      }
      // Se houver erro de coluna sexo ausente no banco relacional, tenta sem a coluna (já salvo em preferências)
      await supabase.from('clientes').upsert(payload);
    }
  } catch (e) {
    console.error('Falha na requisição salvarClienteSupabase:', e);
  }
};

// --- DELETAR CLIENTE ---
export const deletarClienteSupabase = async (id: string) => {
  try {
    // 1. Tenta exclusão física caso a política de RLS permita
    const { count, error } = await supabase.from('clientes').delete({ count: 'exact' }).eq('id', id);
    // 2. Se a deleção física não removeu linhas (ex: restrição RLS na role anon ou FK),
    // executa a exclusão lógica definitiva no Supabase para que o cadastro nunca mais retorne
    if (error || !count || count === 0) {
      await supabase.from('clientes').update({
        nome: `[EXCLUIDO] ${id}`,
        telefone: `excluido_${id}`,
        email: null,
        observacoes: '[EXCLUIDO_ADMIN]',
        preferencias: { excluido: true, excluido_em: new Date().toISOString() }
      }).eq('id', id);
    }
  } catch (e) {
    console.error('Falha na requisição deletarClienteSupabase:', e);
  }
};

// --- METADADOS EMBUTIDOS EM SERVIÇO (Sinal, Insumos, Subserviços) ---
export const encodeServicoDescricao = (
  descricaoOriginal: string | null | undefined, 
  extra: { 
    categoria?: string;
    cor?: string;
    is_pacote?: boolean;
    servicos_pacote?: string[];
    sinal_tipo?: string; 
    sinal_valor?: number; 
    materiais_utilizados?: any[]; 
    servicos_pacote_detalhes?: any[];
    foto?: string;
    foto_thumb?: string;
    fotos?: string[];
    destaque_catalogo?: boolean;
    itens_inclusos?: string[];
    orientacoes_agendamento?: string;
  }
) => {
  const cleanDesc = (descricaoOriginal || '').replace(/<!--NAIL_META:[\s\S]*?-->/g, '').trim();
  const hasExtra = !!extra.cor ||
                   (extra.sinal_tipo && extra.sinal_tipo !== 'nenhum') || 
                   (extra.sinal_valor !== undefined && extra.sinal_valor > 0) || 
                   (extra.materiais_utilizados && extra.materiais_utilizados.length > 0) ||
                   (extra.servicos_pacote_detalhes && extra.servicos_pacote_detalhes.length > 0) ||
                   !!extra.foto ||
                   !!extra.foto_thumb ||
                   (extra.fotos && extra.fotos.length > 0) ||
                   extra.destaque_catalogo !== undefined ||
                   (extra.itens_inclusos && extra.itens_inclusos.length > 0) ||
                   !!extra.orientacoes_agendamento ||
                   !!extra.categoria ||
                   extra.is_pacote !== undefined ||
                   (extra.servicos_pacote && extra.servicos_pacote.length > 0);
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
    
    // Codifica metadados adicionais (cor, sinal, insumos, fotos, catálogo, itens inclusos, combo) na descrição sem quebrar colunas
    const descricaoComMetadados = encodeServicoDescricao(servico.descricao, {
      categoria: servico.categoria || 'Geral',
      cor: servico.cor,
      is_pacote: Boolean(servico.is_pacote),
      servicos_pacote: servico.servicos_pacote || servico.itens_combo || [],
      servicos_pacote_detalhes: servico.servicos_pacote_detalhes || [],
      sinal_tipo: servico.sinal_tipo,
      sinal_valor: servico.sinal_valor,
      materiais_utilizados: servico.materiais_utilizados,
      foto: servico.foto,
      foto_thumb: servico.foto_thumb,
      fotos: servico.fotos,
      destaque_catalogo: servico.destaque_catalogo,
      itens_inclusos: servico.itens_inclusos,
      orientacoes_agendamento: servico.orientacoes_agendamento
    });

    const salaoId = servico.salao_id || getActiveSalaoId();

    // Envia exatamente as colunas existentes na tabela servicos do Supabase
    const payloadCompleto: any = {
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria || 'Geral',
      descricao: descricaoComMetadados || null,
      duracao_minutos: Number(servico.duracao_minutos) || 60,
      preco: Number(servico.preco) || 0,
      ativo: servico.ativo !== false,
      retorno_dias: diasManutencao,
      is_pacote: !!servico.is_pacote,
      itens_combo: servico.servicos_pacote || servico.itens_combo || [],
      salao_id: salaoId
    };

    let { error } = await supabase.from('servicos').upsert(payloadCompleto);

    // Fallback 1: se der erro de coluna não encontrada (PGRST204 / 42703), tenta com payload universal
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
      const payloadBasico = {
        id: servico.id,
        nome: servico.nome,
        categoria: servico.categoria || 'Geral',
        descricao: descricaoComMetadados || null,
        duracao_minutos: Number(servico.duracao_minutos) || 60,
        preco: Number(servico.preco) || 0,
        ativo: servico.ativo !== false
      };
      const resBasico = await supabase.from('servicos').upsert(payloadBasico);
      error = resBasico.error;

      // Se upsert ainda falhar, tenta update direto pelo ID
      if (error) {
        const resUpdate = await supabase.from('servicos').update(payloadBasico).eq('id', servico.id);
        error = resUpdate.error;
      }
    }

    // Fallback 2: se der erro de chave/duplicação no upsert, tenta update direto por ID
    if (error && (error.code === '23505' || error.code === 'PGRST100')) {
      const payloadUpdate = {
        nome: servico.nome,
        categoria: servico.categoria || 'Geral',
        descricao: descricaoComMetadados || null,
        duracao_minutos: Number(servico.duracao_minutos) || 60,
        preco: Number(servico.preco) || 0,
        ativo: servico.ativo !== false
      };
      const resUp = await supabase.from('servicos').update(payloadUpdate).eq('id', servico.id);
      error = resUp.error;
    }

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
    const { count, error } = await supabase.from('servicos').delete({ count: 'exact' }).eq('id', id);
    if (error || !count || count === 0) {
      await supabase.from('servicos').update({
        nome: `[EXCLUIDO] ${id}`,
        ativo: false
      }).eq('id', id);
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
    if (agendamento.cliente_id === 'bloqueado') {
      const { data: bExistente } = await supabase.from('clientes').select('id').eq('id', 'bloqueado').maybeSingle();
      if (!bExistente) {
        await supabase.from('clientes').upsert({
          id: 'bloqueado',
          nome: 'Horário Bloqueado',
          telefone: '00000000000',
          consentimento_imagem: false
        });
      }
    } else if (agendamento.cliente_id) {
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

    // Preservar itens_servicos existentes caso não sejam passados explicitamente novos
    let servicosSalvar = servicosIds;
    if ((!servicosSalvar || servicosSalvar.length === 0) && (agendamento as any).itens_servicos && (agendamento as any).itens_servicos.length > 0) {
      servicosSalvar = (agendamento as any).itens_servicos;
    }

    // Serializar metadados de histórico em observações para integridade na nuvem
    let obsFinal = agendamento.observacoes || '';
    if (agendamento.desconto_valor && Number(agendamento.desconto_valor) > 0) {
      const motivo = agendamento.desconto_motivo || 'Desconto Concedido';
      obsFinal = obsFinal.replace(/\[DESCONTO:\s*[\d.]+\s*\|\s*[^\]]+\]/gi, '').trim();
      obsFinal = `${obsFinal} [DESCONTO:${Number(agendamento.desconto_valor).toFixed(2)}|${motivo}]`.trim();
    }
    if (agendamento.valor_adicional && Number(agendamento.valor_adicional) > 0) {
      const motivoAdic = agendamento.motivo_adicional || 'Adicional';
      obsFinal = obsFinal.replace(/\[ADICIONAL:\s*[\d.]+\s*\|\s*[^\]]+\]/gi, '').trim();
      obsFinal = `${obsFinal} [ADICIONAL:${Number(agendamento.valor_adicional).toFixed(2)}|${motivoAdic}]`.trim();
    }
    if (agendamento.produtos && agendamento.produtos.length > 0) {
      try {
        const prodJson = JSON.stringify(agendamento.produtos);
        obsFinal = obsFinal.replace(/\[PRODUTOS:\s*\[.*?\]\s*\]/gi, '').trim();
        obsFinal = `${obsFinal} [PRODUTOS:${prodJson}]`.trim();
      } catch (e) {}
    }
    if (agendamento.recorrencia_grupo_id || agendamento.recorrencia_posicao) {
      const gId = agendamento.recorrencia_grupo_id || '';
      const rTipo = agendamento.recorrencia_tipo || '';
      const rPos = agendamento.recorrencia_posicao || '';
      obsFinal = obsFinal.replace(/\[RECORRENCIA:[^\]]*\]/gi, '').trim();
      obsFinal = `${obsFinal} [RECORRENCIA:${gId}|${rTipo}|${rPos}]`.trim();
    }

    const salaoId = agendamento.salao_id || getActiveSalaoId();

    const payloadAg: any = {
      id: agendamento.id,
      cliente_id: agendamento.cliente_id,
      profissional_id: agendamento.profissional_id || 'u1',
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      status: agendamento.status,
      valor_total: Number(agendamento.valor_total) || 0,
      valor_sinal: Number(agendamento.valor_sinal) || 0,
      observacoes: obsFinal || null,
      origem: agendamento.origem || 'cliente',
      motivo_cancelamento: agendamento.motivo_cancelamento || null,
      cancelado_por: agendamento.cancelado_por || null,
      itens_servicos: servicosSalvar || [],
      criado_em: agendamento.criado_em || new Date().toISOString(),
      salao_id: salaoId
    };

    let { error } = await supabase.from('agendamentos').upsert(payloadAg);
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      delete payloadAg.salao_id;
      const res = await supabase.from('agendamentos').upsert(payloadAg);
      error = res.error;
    }

    if (error) {
      console.error('Erro ao salvar agendamento no Supabase:', error);
      if (error.code === '23503' && clienteInfo) {
        await salvarClienteSupabase(clienteInfo as Cliente);
        await supabase.from('agendamentos').upsert(payloadAg);
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
    // 1. Monta payload seguro compatível estritamente com as colunas reais do Supabase
    // Observação: 'cancelado_por' e 'motivo_cancelamento' existem na tabela 'agendamentos'.
    // 'confirmado_por' NÃO existe na tabela relacional e é mantido no localStorage/BroadcastChannel da UI.
    const updates: any = { status };
    if (canceladoPor) updates.cancelado_por = canceladoPor;
    if (motivo) updates.motivo_cancelamento = motivo;

    // 2. Atualizar localStorage imediatamente para sincronia no mesmo navegador
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

    // 3. Disparar broadcast instantâneo (0ms) para todas as abas abertas no navegador
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nail_agenda_sync');
        bc.postMessage({ type: 'STATUS_UPDATED', id, status, canceladoPor, motivo, confirmadoPor });
        bc.close();
      }
    } catch (err) {}

    // 4. Atualizar no Supabase (com eq e fallback para case-insensitive se necessário)
    let { error } = await supabase.from('agendamentos').update(updates).eq('id', id);
    if (error) {
      // Se houver qualquer incompatibilidade de coluna opcional, recua para atualizar somente status
      if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column')) {
        const safeUpdates = { status };
        const res = await supabase.from('agendamentos').update(safeUpdates).eq('id', id);
        error = res.error;
      }
    }
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
    const { count, error } = await supabase.from('agendamentos').delete({ count: 'exact' }).eq('id', id);
    if (error || !count || count === 0) {
      // Caso a política de RLS do Supabase restrinja o DELETE físico para a role anon,
      // atualizamos o status para 'cancelado' com motivo 'EXCLUIDO_ADMIN' para remoção lógica definitiva
      await supabase.from('agendamentos').update({
        status: 'cancelado',
        motivo_cancelamento: 'EXCLUIDO_ADMIN',
        observacoes: '[EXCLUIDO]'
      }).eq('id', id);
    }
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

    const salaoId = item.salao_id || getActiveSalaoId();

    const payloadLista: any = {
      id: item.id,
      cliente_id: item.cliente_id,
      servico_id: item.servico_id,
      data_preferida: item.data_preferida,
      periodo_preferido: item.periodo_preferido,
      status: item.status,
      criado_em: item.criado_em || new Date().toISOString(),
      salao_id: salaoId
    };

    let { error } = await supabase.from('lista_espera').upsert(payloadLista);
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      delete payloadLista.salao_id;
      const res = await supabase.from('lista_espera').upsert(payloadLista);
      error = res.error;
    }

    if (error) {
      console.error('Erro ao salvar lista de espera no Supabase:', error);
      if (error.code === '23503' && clienteInfo) {
        await salvarClienteSupabase(clienteInfo as Cliente);
        await supabase.from('lista_espera').upsert(payloadLista);
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
export const salvarFotoClienteSupabase = async (foto: { id: string; cliente_id: string; url: string; tipo: string; criado_em?: string; salao_id?: string }) => {
  try {
    const salaoId = foto.salao_id || getActiveSalaoId();
    const payloadFoto: any = {
      id: foto.id,
      cliente_id: foto.cliente_id,
      url: foto.url,
      tipo: foto.tipo,
      criado_em: foto.criado_em || new Date().toISOString(),
      salao_id: salaoId
    };

    let { error } = await supabase.from('fotos_clientes').upsert(payloadFoto);
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      delete payloadFoto.salao_id;
      await supabase.from('fotos_clientes').upsert(payloadFoto);
    }
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

// --- BUSCAR FOTOS DO CLIENTE SOB DEMANDA (Poupe banda: baixa apenas da cliente selecionada) ---
export const carregarFotosClienteSupabase = async (clienteId: string): Promise<any[]> => {
  if (!clienteId) return [];
  try {
    const { data, error } = await supabase
      .from('fotos_clientes')
      .select('id, cliente_id, url, tipo, criado_em')
      .eq('cliente_id', clienteId);
    if (error) {
      console.error(`Erro ao carregar fotos do cliente ${clienteId} no Supabase:`, error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error(`Falha na requisição carregarFotosClienteSupabase (${clienteId}):`, e);
    return [];
  }
};

// --- SALVAR / ATUALIZAR MATERIAL ---
export const salvarMaterialSupabase = async (material: any) => {
  try {
    const salaoId = material.salao_id || getActiveSalaoId();
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
      ativo: material.ativo !== false,
      salao_id: salaoId
    };

    let { error } = await supabase.from('materiais').upsert(payload);
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column'))) {
      delete payload.custo_por_uso;
      delete payload.salao_id;
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
    const { count, error } = await supabase.from('materiais').delete({ count: 'exact' }).eq('id', id);
    if (error || !count || count === 0) {
      await supabase.from('materiais').update({
        nome: `[EXCLUIDO] ${id}`,
        ativo: false
      }).eq('id', id);
    }
  } catch (e) {}
};

// --- SALVAR / ATUALIZAR USUÁRIO DA EQUIPE ---
export const salvarUsuarioSupabase = async (usuario: any) => {
  try {
    const salaoId = usuario.salao_id || getActiveSalaoId();
    const payload: any = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email || null,
      telefone: usuario.telefone || '',
      perfil: usuario.perfil || 'profissional',
      ativo: usuario.ativo !== false,
      senha: usuario.senha || 'admin',
      salao_id: salaoId
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
    if (usuario.horario_almoco_ativo !== undefined) {
      payload.horario_almoco_ativo = usuario.horario_almoco_ativo;
    }
    if (usuario.horario_almoco_inicio !== undefined) {
      payload.horario_almoco_inicio = usuario.horario_almoco_inicio;
    }
    if (usuario.horario_almoco_fim !== undefined) {
      payload.horario_almoco_fim = usuario.horario_almoco_fim;
    }

    let { error } = await supabase.from('usuarios').upsert(payload);

    // Se a tabela usuarios não tiver colunas extras ainda, faz fallback seguro
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column'))) {
      delete payload.servicos_habilitados;
      delete payload.chave_pix;
      delete payload.usar_pix_proprio;
      delete payload.especialidade;
      delete payload.horario_almoco_ativo;
      delete payload.horario_almoco_inicio;
      delete payload.horario_almoco_fim;
      delete payload.salao_id;
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
    const salaoId = despesa.salao_id || getActiveSalaoId();
    let descFinal = despesa.descricao || '';
    const meta: any = {};
    if (despesa.tipo_destino) meta.td = despesa.tipo_destino;
    if (despesa.profissional_id) meta.pid = despesa.profissional_id;
    if (despesa.forma_pagamento) meta.fp = despesa.forma_pagamento;
    if (despesa.parcelas_total) meta.pt = despesa.parcelas_total;
    if (despesa.parcela_atual) meta.pa = despesa.parcela_atual;
    if (despesa.parcelamento_grupo_id) meta.gid = despesa.parcelamento_grupo_id;
    if (despesa.mes_inicio) meta.mi = despesa.mes_inicio;
    if (despesa.material_id) meta.mid = despesa.material_id;
    if (despesa.criado_por) meta.cp = despesa.criado_por;
    if (despesa.criado_por_nome) meta.cpn = despesa.criado_por_nome;
    if (despesa.atualizado_por_nome) meta.apn = despesa.atualizado_por_nome;
    if (despesa.observacoes) meta.obs = despesa.observacoes;

    if (Object.keys(meta).length > 0) {
      descFinal = descFinal.replace(/\[DESP_META:.*?\]/gi, '').trim();
      descFinal = `${descFinal} [DESP_META:${JSON.stringify(meta)}]`.trim();
    }

    const payloadDesp: any = {
      id: despesa.id,
      descricao: descFinal,
      categoria: despesa.categoria,
      valor: Number(despesa.valor) || 0,
      data: despesa.data,
      pago: despesa.pago !== false,
      salao_id: salaoId
    };

    let { error } = await supabase.from('despesas').upsert(payloadDesp);
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      delete payloadDesp.salao_id;
      const res = await supabase.from('despesas').upsert(payloadDesp);
      error = res.error;
    }
    if (error && error.code !== 'PGRST205') console.error('Erro ao salvar despesa no Supabase:', error);
  } catch (e) {}
};

// --- DELETAR DESPESA ---
export const deletarDespesaSupabase = async (id: string) => {
  try {
    const { count, error } = await supabase.from('despesas').delete({ count: 'exact' }).eq('id', id);
    if (error || !count || count === 0) {
      await supabase.from('despesas').update({
        descricao: `[EXCLUIDO_ADMIN] ${id}`,
        valor: 0,
        pago: false
      }).eq('id', id);
    }
  } catch (e) {
    console.error('Erro ao deletar despesa no Supabase:', e);
  }
};

// --- SALVAR TOKEN DE PUSH NOTIFICATIONS FCM (ANDROID) ---
export const salvarTokenFcmSupabase = async (token: string) => {
  if (!token) return;
  try {
    const activeSalao = getActiveSalaoId();
    const configRowId = (activeSalao === 'salao_sheila' || !activeSalao) ? 'salao_principal' : activeSalao;
    const { data } = await supabase.from('configuracoes').select('config_salao').eq('id', configRowId).maybeSingle();
    const configSalao = data?.config_salao || {};
    const tokensExistentes: string[] = Array.isArray(configSalao.fcm_tokens) ? configSalao.fcm_tokens : [];
    if (!tokensExistentes.includes(token)) {
      const novosTokens = [...tokensExistentes, token];
      await salvarConfiguracoesSupabase({
        configSalao: {
          ...configSalao,
          fcm_tokens: novosTokens
        }
      });
      console.log('[FCM] Token de push salvo na nuvem com sucesso!');
    }
  } catch (e) {
    console.warn('[FCM] Falha ao salvar token na nuvem:', e);
  }
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
  salaoIdOverride?: string;
}) => {
  try {
    const activeSalao = dados.salaoIdOverride || getActiveSalaoId();
    const configRowId = (activeSalao === 'salao_sheila' || !activeSalao) ? 'salao_principal' : activeSalao;

    // Busca dados atuais na nuvem para mesclar e NUNCA sobrescrever listas não passadas com array vazio
    let atual: any = null;
    try {
      const { data } = await supabase.from('configuracoes').select('*').eq('id', configRowId).maybeSingle();
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
      id: configRowId,
      config_salao: configSalaoObj,
      tecnicas: tecnicasFinal,
      formatos: formatosFinal,
      categorias_servico: categoriasServicoFinal,
      categorias_despesa: categoriasDespesaFinal,
      salao_id: activeSalao,
      atualizado_em: new Date().toISOString()
    };

    let { error } = await supabase.from('configuracoes').upsert(payload);
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      delete payload.salao_id;
      const res = await supabase.from('configuracoes').upsert(payload);
      error = res.error;
    }

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
// OTIMIZAÇÃO: Fotos de clientes são pesadas (Base64) e NÃO são baixadas em massa aqui.
// Elas são carregadas sob demanda apenas na abertura da ficha da cliente em Clientes.tsx.
export const carregarDadosNuvemSupabase = async (salaoIdOverride?: string) => {
  try {
    const activeSalao = salaoIdOverride || getActiveSalaoId();
    const hasCol = await verificarColunaMultiTenantExiste();

    let clientesQuery = supabase.from('clientes').select('*');
    let agendamentosQuery = supabase.from('agendamentos').select('*');
    let listaQuery = supabase.from('lista_espera').select('*');
    let servicosQuery = supabase.from('servicos').select('*');
    // Segurança: Não seleciona a coluna 'senha' em lote para proteger credenciais de equipe na rede e no localStorage
    let usuariosQuery = supabase.from('usuarios').select('id, nome, email, telefone, perfil, ativo, especialidade, servicos_habilitados, horario_almoco_ativo, horario_almoco_inicio, horario_almoco_fim, chave_pix, usar_pix_proprio, salao_id');
    let matQuery = supabase.from('materiais').select('*');
    let despQuery = supabase.from('despesas').select('*');
    let configQuery = supabase.from('configuracoes').select('*');

    if (hasCol) {
      if (activeSalao === 'salao_sheila') {
        clientesQuery = clientesQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        agendamentosQuery = agendamentosQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        listaQuery = listaQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        servicosQuery = servicosQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        usuariosQuery = usuariosQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        matQuery = matQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        despQuery = despQuery.or('salao_id.eq.salao_sheila,salao_id.is.null');
        configQuery = configQuery.or('salao_id.eq.salao_sheila,salao_id.is.null,id.eq.salao_principal');
      } else {
        clientesQuery = clientesQuery.eq('salao_id', activeSalao);
        agendamentosQuery = agendamentosQuery.eq('salao_id', activeSalao);
        listaQuery = listaQuery.eq('salao_id', activeSalao);
        servicosQuery = servicosQuery.eq('salao_id', activeSalao);
        usuariosQuery = usuariosQuery.eq('salao_id', activeSalao);
        matQuery = matQuery.eq('salao_id', activeSalao);
        despQuery = despQuery.eq('salao_id', activeSalao);
        configQuery = configQuery.or(`id.eq.${activeSalao},salao_id.eq.${activeSalao}`);
      }
    } else {
      configQuery = configQuery.eq('id', 'salao_principal');
    }

    const [clientesRes, agendamentosRes, listaRes, servicosRes, usuariosRes, matRes, despRes, configRes] = await Promise.all([
      clientesQuery,
      agendamentosQuery,
      listaQuery,
      servicosQuery,
      usuariosQuery,
      matQuery,
      despQuery,
      configQuery
    ]);

    const clientesValidos = (clientesRes.data || []).filter((c: any) => 
      !c.observacoes?.includes('[EXCLUIDO_ADMIN]') &&
      c.preferencias?.excluido !== true &&
      !c.nome?.startsWith('[EXCLUIDO]')
    );

    const servicosValidos = (servicosRes.data || []).filter((s: any) =>
      !s.nome?.startsWith('[EXCLUIDO]') &&
      s.ativo !== false
    );

    const materiaisValidos = (matRes.data || []).filter((m: any) =>
      !m.nome?.startsWith('[EXCLUIDO]') &&
      m.ativo !== false
    );

    const despesasValidas = (despRes.data || []).filter((d: any) =>
      !d.descricao?.includes('[EXCLUIDO_ADMIN]') &&
      !d.descricao?.startsWith('[EXCLUIDO]')
    );

    // Seleciona a configuração do salão ativo
    let configAchada = configRes.data?.[0] || null;
    if (Array.isArray(configRes.data) && configRes.data.length > 1) {
      if (activeSalao !== 'salao_sheila') {
        configAchada = configRes.data.find((c: any) => c.id === activeSalao || c.salao_id === activeSalao) || configRes.data[0];
      } else {
        configAchada = configRes.data.find((c: any) => c.id === 'salao_principal' || c.salao_id === 'salao_sheila') || configRes.data[0];
      }
    }

    return {
      clientes: clientesValidos,
      agendamentos: agendamentosRes.data || [],
      listaEspera: listaRes.data || [],
      servicos: servicosValidos,
      usuarios: usuariosRes.data || [],
      fotos: [],
      materiais: materiaisValidos,
      despesas: despesasValidas,
      configuracoes: configAchada
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
  servicosNomes?: string;
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
      id: gerarIdSeguro('aviso_'),
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

    const activeSalao = getActiveSalaoId();
    const configRowId = (activeSalao === 'salao_sheila' || !activeSalao) ? 'salao_principal' : activeSalao;

    await supabase.from('configuracoes').upsert({
      id: configRowId,
      config_salao: {
        ...configSalao,
        avisos_nao_lidos: atualizados
      },
      salao_id: activeSalao,
      atualizado_em: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao persistir aviso no Supabase:', err);
  }

  // 4. Disparo de Push Notification FCM (Google) para celulares com app minimizado ou fechado
  try {
    const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const endpoint = isVercelHost 
      ? '/api/enviar-push-fcm' 
      : 'https://sheilasantos-agenda.vercel.app/api/enviar-push-fcm';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: notificacao.titulo,
        mensagem: notificacao.mensagem,
        detalhes: notificacao.detalhes,
        agendamentoId: notificacao.agendamentoId,
        tipo: notificacao.tipo
      })
    }).catch((err) => {
      console.warn('[Push FCM] Falha silenciosa no envio:', err);
    });
  } catch (e) {}
};

// --- PERSISTIR LISTA DE AVISOS ATUALIZADA (QUANDO DER BAIXA / MARCAR COMO LIDO) ---
export const persistirAvisosNaoLidosSupabase = async (avisos: any[]) => {
  try {
    const activeSalao = getActiveSalaoId();
    const configRowId = (activeSalao === 'salao_sheila' || !activeSalao) ? 'salao_principal' : activeSalao;
    const { data } = await supabase.from('configuracoes').select('config_salao').eq('id', configRowId).maybeSingle();
    const configSalao = data?.config_salao || {};
    await supabase.from('configuracoes').upsert({
      id: configRowId,
      config_salao: {
        ...configSalao,
        avisos_nao_lidos: avisos
      },
      salao_id: activeSalao,
      atualizado_em: new Date().toISOString()
    });

    // Avisa todos os dispositivos conectados para atualizarem a lista em tempo real com broadcast garantido
    await enviarBroadcastRealtime('AVISOS_SYNC', { avisos });
  } catch (e) {
    console.error('Erro ao atualizar avisos no Supabase:', e);
  }
};
