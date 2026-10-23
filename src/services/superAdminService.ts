import { supabase } from './supabase';
import { SalaoLicenca } from '../types';

/**
 * Serviço de Gestão Super Admin (Ademar)
 * Permite cadastrar salões clientes, gerenciar licenças, renovar e bloquear inadimplentes.
 */

// Normaliza slug seguro para URL (ex: "Studio Bella & Nails" -> "studio-bella")
export const gerarSlugSeguro = (nome: string): string => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Gera chave de licença única (ex: "BELLA-MENSAL-8921")
export const gerarChaveLicencaUnica = (nomeSalao: string, tipo: string = 'MENSAL'): string => {
  const prefixo = nomeSalao
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8) || 'SALÃO';

  const random4 = Math.floor(1000 + Math.random() * 9000);
  const ano = new Date().getFullYear();
  return `${prefixo}-${tipo.toUpperCase()}-${random4}`;
};

// Listar todos os salões cadastrados no Supabase
export const listarSaloesLicencas = async (): Promise<SalaoLicenca[]> => {
  try {
    const { data, error } = await supabase
      .from('licencas')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao listar licenças:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      chave: row.chave,
      titular: row.titular,
      tipo: row.tipo || 'mensal',
      status: row.status || 'ativo',
      data_expiracao: row.data_expiracao,
      telefone: row.telefone || '',
      valor_mensalidade: row.valor_mensalidade ? Number(row.valor_mensalidade) : null,
      criado_em: row.criado_em,
      salao_id: row.salao_id || (row.chave?.includes('SHEILA') ? 'salao_sheila' : `salao_${row.id.substring(0, 8)}`),
      slug: row.slug || (row.chave?.includes('SHEILA') ? 'sheila' : gerarSlugSeguro(row.titular || 'salao')),
      email_proprietaria: row.email_proprietaria || '',
      observacoes: row.observacoes || ''
    }));
  } catch (e) {
    console.error('Falha em listarSaloesLicencas:', e);
    return [];
  }
};

// Cadastrar um novo Salão Cliente e gerar licença imediata
export const cadastrarNovoSalao = async (dados: {
  nomeSalao: string;
  proprietaria: string;
  telefone: string;
  email?: string;
  tipo: 'mensal' | 'vitalicio' | 'teste';
  valorMensalidade?: number;
  diasValidade?: number;
}): Promise<{ sucesso: boolean; licenca?: SalaoLicenca; mensagem: string; textoWhatsApp?: string }> => {
  const nomeLimpo = dados.nomeSalao.trim();
  const propLimpa = dados.proprietaria.trim();
  const telLimpo = dados.telefone.replace(/\D/g, '');

  if (!nomeLimpo || !propLimpa) {
    return { sucesso: false, mensagem: 'Nome do Salão e da Proprietária são obrigatórios.' };
  }

  const slug = gerarSlugSeguro(nomeLimpo);
  const salaoId = `salao_${slug.replace(/-/g, '_')}`;
  const chave = gerarChaveLicencaUnica(nomeLimpo, dados.tipo);

  // Calcula data de expiração
  let dataExpiracao: string | null = null;
  const dias = dados.diasValidade || (dados.tipo === 'teste' ? 7 : (dados.tipo === 'mensal' ? 30 : 0));
  if (dados.tipo !== 'vitalicio' && dias > 0) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    dataExpiracao = d.toISOString();
  }

  const titularFormatado = `${nomeLimpo} (${propLimpa})`;

  try {
    // 1. Cria a licença na tabela licencas
    const payloadLicenca = {
      chave,
      titular: titularFormatado,
      tipo: dados.tipo,
      status: 'ativo',
      data_expiracao: dataExpiracao,
      telefone: telLimpo,
      valor_mensalidade: dados.valorMensalidade || 97.00,
      salao_id: salaoId,
      slug,
      email_proprietaria: dados.email || '',
      observacoes: `Cadastrado em ${new Date().toLocaleDateString('pt-BR')}`
    };

    const { data: licCriada, error: errLic } = await supabase
      .from('licencas')
      .insert(payloadLicenca)
      .select()
      .single();

    let licCriadaFinal: any = licCriada;
    if (errLic) {
      if (errLic.code === '42703' || errLic.message?.includes('column')) {
        const payloadLegado = {
          chave,
          titular: titularFormatado,
          tipo: dados.tipo,
          status: 'ativo',
          data_expiracao: dataExpiracao,
          telefone: telLimpo,
          valor_mensalidade: dados.valorMensalidade || 97.00
        };
        const { data: licFallback, error: errFallback } = await supabase
          .from('licencas')
          .insert(payloadLegado)
          .select()
          .single();
        if (errFallback) {
          console.error('Erro ao cadastrar licença no Supabase (fallback):', errFallback);
          return { sucesso: false, mensagem: `Erro no banco: ${errFallback.message}` };
        }
        licCriadaFinal = {
          ...licFallback,
          salao_id: salaoId,
          slug,
          email_proprietaria: dados.email || ''
        };
      } else {
        console.error('Erro ao cadastrar licença no Supabase:', errLic);
        return { sucesso: false, mensagem: `Erro no banco: ${errLic.message}` };
      }
    }

    // 2. Cria a configuração inicial do salão
    const configInicialObj = {
      nome: nomeLimpo,
      proprietaria: propLimpa,
      telefone: dados.telefone,
      email: dados.email || '',
      endereco: '',
      instagram: '',
      chave_pix: '',
      instrucoes_pix: 'Envie o comprovante para garantir seu horário.',
      horarios_trabalho: {
        1: { ativo: true, inicio: '08:00', fim: '19:00' },
        2: { ativo: true, inicio: '08:00', fim: '19:00' },
        3: { ativo: true, inicio: '08:00', fim: '19:00' },
        4: { ativo: true, inicio: '08:00', fim: '19:00' },
        5: { ativo: true, inicio: '08:00', fim: '19:00' },
        6: { ativo: true, inicio: '08:00', fim: '17:00' },
        0: { ativo: false, inicio: '08:00', fim: '12:00' }
      },
      regras: {
        cancelamento_limite_horas: 24,
        sinal_obrigatorio_geral: false,
        lembrete_horas_antecedencia: 24
      }
    };

    const payloadConfig: any = {
      id: salaoId,
      salao_id: salaoId,
      config_salao: configInicialObj,
      tecnicas: ['Fibra de Vidro', 'Gel Moldado', 'Tips', 'Esmaltação em Gel', 'Banho de Gel'],
      formatos: ['Quadrada', 'Almond', 'Stiletto', 'Bailarina', 'Redonda'],
      categorias_servico: ['Alongamento', 'Manutenção', 'Mão', 'Pé', 'Decoração'],
      categorias_despesa: ['Produtos e Insumos', 'Aluguel e Luz', 'Marketing', 'Geral'],
      atualizado_em: new Date().toISOString()
    };

    const { error: errCfg } = await supabase.from('configuracoes').upsert(payloadConfig);
    if (errCfg && (errCfg.code === '42703' || errCfg.message?.includes('column'))) {
      delete payloadConfig.salao_id;
      await supabase.from('configuracoes').upsert(payloadConfig);
    }

    // 3. Cadastra serviços iniciais padrão para o novo salão
    const servicosPadrao = [
      { id: `${salaoId}_s1`, nome: 'Alongamento em Fibra', categoria: 'Alongamento', duracao_minutos: 120, preco: 160, sinal_tipo: 'fixo', sinal_valor: 30, retorno_dias: 20, ativo: true, cor: '#E0A96D', salao_id: salaoId },
      { id: `${salaoId}_s2`, nome: 'Esmaltação em Gel', categoria: 'Alongamento', duracao_minutos: 60, preco: 70, sinal_tipo: 'fixo', sinal_valor: 15, retorno_dias: 15, ativo: true, cor: '#EC4899', salao_id: salaoId },
      { id: `${salaoId}_s3`, nome: 'Manutenção de Alongamento', categoria: 'Manutenção', duracao_minutos: 90, preco: 110, sinal_tipo: 'fixo', sinal_valor: 20, retorno_dias: 20, ativo: true, cor: '#A855F7', salao_id: salaoId },
      { id: `${salaoId}_s4`, nome: 'Manicure Tradicional', categoria: 'Mão', duracao_minutos: 45, preco: 45, sinal_tipo: 'nenhum', sinal_valor: 0, retorno_dias: 15, ativo: true, cor: '#D9777F', salao_id: salaoId },
      { id: `${salaoId}_s5`, nome: 'Pedicure Spa', categoria: 'Pé', duracao_minutos: 60, preco: 55, sinal_tipo: 'nenhum', sinal_valor: 0, retorno_dias: 15, ativo: true, cor: '#10B981', salao_id: salaoId },
      { id: `${salaoId}_s6`, nome: 'Combo Pé e Mão', categoria: 'Mão', duracao_minutos: 90, preco: 90, sinal_tipo: 'nenhum', sinal_valor: 0, retorno_dias: 15, ativo: true, cor: '#3B82F6', salao_id: salaoId }
    ];

    for (const s of servicosPadrao) {
      await supabase.from('servicos').upsert(s).catch(() => {});
    }

    // 4. Cadastra o usuário administrador da proprietária
    const usuarioProprietaria = {
      id: `u_${salaoId}`,
      nome: propLimpa,
      email: dados.email || `${slug}@agenda.com`,
      telefone: telLimpo,
      perfil: 'admin',
      especialidade: 'Proprietária & Master',
      ativo: true,
      senha: 'admin',
      salao_id: salaoId
    };
    await supabase.from('usuarios').upsert(usuarioProprietaria).catch(() => {});

    // 3. Monta o texto pronto para WhatsApp
    const baseUrl = window.location.origin;
    const linkApp = `${baseUrl}/#admin?salao=${slug}`;
    const linkAgendamento = `${baseUrl}/#agendar?salao=${slug}`;
    const validadeFormatada = dataExpiracao ? new Date(dataExpiracao).toLocaleDateString('pt-BR') : 'Vitalícia';

    const textoWhatsApp = `✨ *Bem-vinda ao seu novo Sistema de Gestão & Agendamento!* ✨\n\n` +
      `Olá, *${propLimpa}*! O aplicativo do *${nomeLimpo}* já está liberado e pronto para uso.\n\n` +
      `🔑 *Sua Chave de Acesso Oficial:*\n` +
      `*${chave}*\n\n` +
      `📲 *Link de Acesso Administrativo (Seu Painel):*\n` +
      `${linkApp}\n\n` +
      `🔗 *Link de Agendamento das suas Clientes:*\n` +
      `${linkAgendamento}\n\n` +
      `📅 *Validade da Assinatura:* ${validadeFormatada}\n\n` +
      `Qualquer dúvida ou suporte, estou à disposição! Bons atendimentos e muito sucesso! 💅✨`;

    return {
      sucesso: true,
      licenca: licCriadaFinal,
      mensagem: `Salão "${nomeLimpo}" cadastrado com sucesso!`,
      textoWhatsApp
    };
  } catch (e: any) {
    return { sucesso: false, mensagem: e.message || 'Erro inesperado ao cadastrar salão.' };
  }
};

// Alternar status da licença (Ativar / Bloquear inadimplente)
export const alternarStatusLicenca = async (id: string, novoStatus: 'ativo' | 'bloqueado'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('licencas')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) {
      console.error('Erro ao alterar status da licença:', error);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

// Renovar licença adicionando dias (+30 dias padrão)
export const renovarLicencaDias = async (id: string, diasAdicionais: number = 30): Promise<{ sucesso: boolean; novaExpiracao?: string }> => {
  try {
    const { data, error } = await supabase
      .from('licencas')
      .select('data_expiracao')
      .eq('id', id)
      .single();

    if (error || !data) return { sucesso: false };

    // Se já estava vencido, conta a partir de hoje; se ainda estava válido, soma ao vencimento atual
    const baseDate = (data.data_expiracao && new Date(data.data_expiracao) > new Date())
      ? new Date(data.data_expiracao)
      : new Date();

    baseDate.setDate(baseDate.getDate() + diasAdicionais);
    const novaDataStr = baseDate.toISOString();

    const { error: errUp } = await supabase
      .from('licencas')
      .update({
        data_expiracao: novaDataStr,
        status: 'ativo'
      })
      .eq('id', id);

    if (errUp) return { sucesso: false };
    return { sucesso: true, novaExpiracao: novaDataStr };
  } catch (e) {
    return { sucesso: false };
  }
};

// Excluir licença / salão
export const excluirLicenca = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('licencas')
      .delete()
      .eq('id', id);

    return !error;
  } catch (e) {
    return false;
  }
};
