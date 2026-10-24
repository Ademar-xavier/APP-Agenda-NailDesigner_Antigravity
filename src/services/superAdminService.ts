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

    return (data || [])
      .filter((row: any) => !row.observacoes?.includes('[EXCLUIDO_SUPERADMIN]'))
      .map((row: any) => ({
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
      config_salao: {
        ...configInicialObj,
        planos_assinatura: [
          {
            id: `plano_${salaoId}_vip`,
            nome: 'Clube Nails VIP (Exemplo)',
            preco: 180,
            beneficios: '2 Manutenções em Gel no mês + 1 Spa dos Pés com desconto exclusivo',
            frequencia: 'mensal',
            servicos_inclusos: ['Manutenção de Alongamento', 'Pedicure Spa'],
            ativo: true
          }
        ]
      },
      planos_assinatura: [
        {
          id: `plano_${salaoId}_vip`,
          nome: 'Clube Nails VIP (Exemplo)',
          preco: 180,
          beneficios: '2 Manutenções em Gel no mês + 1 Spa dos Pés com desconto exclusivo',
          frequencia: 'mensal',
          servicos_inclusos: ['Manutenção de Alongamento', 'Pedicure Spa'],
          ativo: true
        }
      ],
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
      try {
        await supabase.from('servicos').upsert(s);
      } catch (e) {}
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
    try {
      await supabase.from('usuarios').upsert(usuarioProprietaria);
    } catch (e) {}

    // 5. Cadastra clientes exemplo para o salão ver a tela populada
    const clientesPadrao = [
      {
        id: `cli_${salaoId}_1`,
        nome: 'Mariana Silva (Exemplo)',
        telefone: '11998765432',
        instagram: '@mari.unhas',
        observacoes: 'Cliente exemplo VIP. Prefere formato Almond e unhas em gel decoradas.',
        consentimento_imagem: true,
        salao_id: salaoId,
        criado_em: new Date().toISOString()
      },
      {
        id: `cli_${salaoId}_2`,
        nome: 'Camila Santos (Exemplo)',
        telefone: '11987654321',
        instagram: '@camilas.beleza',
        observacoes: 'Cliente exemplo. Gosta de esmaltação em gel nude e atendimento pontual.',
        consentimento_imagem: true,
        salao_id: salaoId,
        criado_em: new Date().toISOString()
      }
    ];
    for (const c of clientesPadrao) {
      try {
        await supabase.from('clientes').upsert(c);
      } catch (e) {}
    }

    // 6. Cadastra agendamentos exemplo (Hoje e Amanhã) para a agenda ficar dinâmica e visual
    const hojeIso = new Date().toISOString().split('T')[0];
    const amanhaDate = new Date();
    amanhaDate.setDate(amanhaDate.getDate() + 1);
    const amanhaIso = amanhaDate.toISOString().split('T')[0];

    const agendamentosPadrao = [
      {
        id: `ag_${salaoId}_1`,
        cliente_id: `cli_${salaoId}_1`,
        profissional_id: `u_${salaoId}`,
        inicio: `${hojeIso}T14:00:00`,
        fim: `${hojeIso}T16:00:00`,
        status: 'confirmado',
        valor_total: 160,
        valor_sinal: 30,
        observacoes: 'Atendimento exemplo. Sinal Pix de R$ 30 recebido com sucesso!',
        origem: 'cliente',
        itens_servicos: [`${salaoId}_s1`],
        salao_id: salaoId,
        criado_em: new Date().toISOString()
      },
      {
        id: `ag_${salaoId}_2`,
        cliente_id: `cli_${salaoId}_2`,
        profissional_id: `u_${salaoId}`,
        inicio: `${amanhaIso}T10:00:00`,
        fim: `${amanhaIso}T11:00:00`,
        status: 'pendente',
        valor_total: 70,
        valor_sinal: 15,
        observacoes: 'Agendamento online exemplo aguardando confirmação.',
        origem: 'cliente',
        itens_servicos: [`${salaoId}_s2`],
        salao_id: salaoId,
        criado_em: new Date().toISOString()
      }
    ];
    for (const ag of agendamentosPadrao) {
      try {
        await supabase.from('agendamentos').upsert(ag);
      } catch (e) {}
    }

    // 7. Cadastra materiais exemplo no estoque (com custo por uso)
    const materiaisPadrao = [
      { id: `mat_${salaoId}_1`, nome: 'Gel Construtor Nude 30g', marca: 'Vòlia', preco_compra: 89.90, rendimento: 15, custo_por_uso: 5.99, ativo: true, salao_id: salaoId },
      { id: `mat_${salaoId}_2`, nome: 'Prep Higienizador 500ml', marca: 'Cuccio', preco_compra: 38.00, rendimento: 40, custo_por_uso: 0.95, ativo: true, salao_id: salaoId },
      { id: `mat_${salaoId}_3`, nome: 'Lixa Boomerang 100/180', marca: 'Honey Girl', preco_compra: 8.50, rendimento: 3, custo_por_uso: 2.83, ativo: true, salao_id: salaoId },
      { id: `mat_${salaoId}_4`, nome: 'Top Coat Alto Brilho 15ml', marca: 'D&Z', preco_compra: 45.00, rendimento: 25, custo_por_uso: 1.80, ativo: true, salao_id: salaoId }
    ];
    for (const m of materiaisPadrao) {
      try {
        await supabase.from('materiais').upsert(m);
      } catch (e) {}
    }

    // 8. Cadastra despesas exemplo para o painel financeiro mostrar gráficos e métricas
    const despesasPadrao = [
      { id: `desp_${salaoId}_1`, descricao: 'Reposição de Géis e Insumos do Salão [DESP_META:{"fp":"pix","td":"salao"}]', categoria: 'Produtos e Insumos', valor: 181.40, data: hojeIso, fixo: false, salao_id: salaoId, criado_em: new Date().toISOString() },
      { id: `desp_${salaoId}_2`, descricao: 'Energia Elétrica e Internet do Estúdio [DESP_META:{"fp":"pix","td":"salao"}]', categoria: 'Aluguel e Luz', valor: 135.00, data: hojeIso, fixo: true, salao_id: salaoId, criado_em: new Date().toISOString() }
    ];
    for (const d of despesasPadrao) {
      try {
        await supabase.from('despesas').upsert(d);
      } catch (e) {}
    }

    // 3. Monta o texto pronto para WhatsApp com rota de instalação multiplataforma
    const baseUrl = window.location.origin;
    const linkApp = `${baseUrl}/#instalar?salao=${slug}`;
    const linkAgendamento = `${baseUrl}/#agendar?salao=${slug}`;
    const validadeFormatada = dataExpiracao ? new Date(dataExpiracao).toLocaleDateString('pt-BR') : 'Vitalícia';

    const textoWhatsApp = `✨ *Bem-vinda ao seu novo Sistema de Gestão & Agendamento!* ✨\n\n` +
      `Olá, *${propLimpa}*! O aplicativo do *${nomeLimpo}* já está liberado e pronto para uso.\n\n` +
      `🔑 *Sua Chave de Acesso Oficial (Código VIP):*\n` +
      `*${chave}*\n\n` +
      `📲 *Link de Instalação e Acesso ao Aplicativo:*\n` +
      `${linkApp}\n\n` +
      `💡 *Passo a passo no seu primeiro acesso:*\n` +
      `1️⃣ *Instalação:* Abra o link acima no seu celular ou computador e selecione a versão para o seu sistema (Android, iPhone iOS ou Windows Desktop);\n` +
      `2️⃣ *Ativação:* Digite sua Chave de Acesso Oficial (*${chave}*) para desbloquear sua licença no aparelho;\n` +
      `3️⃣ *Acesso:* Entre com seu e-mail e senha cadastrados para acessar o seu painel completo.\n\n` +
      `🔗 *Link de Agendamento das suas Clientes (Coloque na Bio do Instagram):*\n` +
      `${linkAgendamento}\n\n` +
      `📖 *Manual de Uso Oficial do Salão (com fotos reais e passo a passo):*\n` +
      `${baseUrl}/manual.html\n\n` +
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

// Atualizar dados completos da licença (chave, status, tipo, expiração, mensalidade)
export const atualizarLicencaCompleta = async (id: string, updates: Partial<SalaoLicenca>): Promise<boolean> => {
  try {
    const payload: any = {};
    if (updates.chave !== undefined) payload.chave = updates.chave.trim().toUpperCase();
    if (updates.titular !== undefined) payload.titular = updates.titular.trim();
    if (updates.tipo !== undefined) payload.tipo = updates.tipo;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.data_expiracao !== undefined) payload.data_expiracao = updates.data_expiracao;
    if (updates.valor_mensalidade !== undefined) payload.valor_mensalidade = Number(updates.valor_mensalidade);
    if (updates.telefone !== undefined) payload.telefone = updates.telefone;
    if (updates.observacoes !== undefined) payload.observacoes = updates.observacoes;

    const { error } = await supabase
      .from('licencas')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar licença:', error);
      return false;
    }
    return true;
  } catch (e) {
    return false;
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

// Excluir licença / salão (com suporte a exclusão física e fallback para lógica definitiva)
export const excluirLicenca = async (id: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('licencas')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error || !count || count === 0) {
      const { error: errUp } = await supabase
        .from('licencas')
        .update({ status: 'expirado', observacoes: '[EXCLUIDO_SUPERADMIN]' })
        .eq('id', id);
      return !errUp;
    }

    return true;
  } catch (e) {
    return false;
  }
};
