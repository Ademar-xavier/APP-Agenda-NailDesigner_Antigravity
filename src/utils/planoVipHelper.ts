import { PlanoAssinatura, AssinaturaCliente, Servico } from '../types';

/**
 * Normaliza strings para comparação flexível (remove acentos, pontuação e múltiplos espaços)
 */
export const normalizarTextoVip = (str?: string | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Encontra o plano de assinatura correspondente com tolerância a variações de nomenclatura,
 * sinônimos (ex: pés vs pedicure) e fallbacks inteligentes para clientes VIP.
 */
export const encontrarPlanoVip = (
  planoIdOrNome?: string | null,
  assinatura?: AssinaturaCliente | null,
  observacoes?: string | null,
  planos: PlanoAssinatura[] = []
): PlanoAssinatura | null => {
  if (!planos || planos.length === 0) return null;

  // 1. Busca por ID direto
  const targetId = planoIdOrNome || assinatura?.plano_id;
  if (targetId) {
    const pById = planos.find(p => p.id === targetId);
    if (pById) return pById;
  }

  // 2. Extrai candidatos de texto para correspondência
  const candidatos: string[] = [];
  if (planoIdOrNome) candidatos.push(planoIdOrNome);
  if (assinatura?.nome_plano) candidatos.push(assinatura.nome_plano);
  if (observacoes) candidatos.push(observacoes);

  for (const cand of candidatos) {
    const normCand = normalizarTextoVip(cand);
    if (!normCand) continue;

    // 2.1 Match exato normalizado
    const pExato = planos.find(p => normalizarTextoVip(p.nome) === normCand);
    if (pExato) return pExato;

    // 2.2 Match por substring direta
    const pInclusao = planos.find(p => {
      const normP = normalizarTextoVip(p.nome);
      return normP && (normCand.includes(normP) || normP.includes(normCand));
    });
    if (pInclusao) return pInclusao;

    // 2.3 Match por pontuação de palavras-chave e sinônimos
    const stopWords = ['clube', 'club', 'plano', 'vip', 'com', 'para', 'das', 'dos', 'de', 'do', 'da', 'e', 'em', 'sessoes', 'sessao'];
    const tokensCand = normCand.split(' ').filter(t => t.length >= 2 && !stopWords.includes(t));

    let melhorPlano: PlanoAssinatura | null = null;
    let maiorScore = 0;

    for (const p of planos) {
      const normP = normalizarTextoVip(p.nome);
      const tokensP = normP.split(' ').filter(t => t.length >= 2 && !stopWords.includes(t));

      let score = 0;
      for (const tc of tokensCand) {
        if (tokensP.includes(tc)) {
          score += 2;
        } else if ((tc === 'pes' || tc === 'pe') && (tokensP.includes('pedicure') || normP.includes('pedicure'))) {
          score += 2;
        } else if (tc === 'pedicure' && (tokensP.includes('pes') || tokensP.includes('pe') || normP.includes('pes'))) {
          score += 2;
        } else if ((tc === 'maos' || tc === 'mao') && (tokensP.includes('manicure') || normP.includes('manicure'))) {
          score += 2;
        } else if (tc === 'manicure' && (tokensP.includes('maos') || tokensP.includes('mao') || normP.includes('mao'))) {
          score += 2;
        } else if (tokensP.some(tp => tp.includes(tc) || tc.includes(tp))) {
          score += 1;
        }
      }

      if (score > maiorScore) {
        maiorScore = score;
        melhorPlano = p;
      }
    }

    if (melhorPlano && maiorScore >= 2) {
      return melhorPlano;
    }
  }

  // 3. Fallback inteligente: se houver apenas 1 plano ativo no salão e estamos lidando com cliente VIP
  const planosAtivos = planos.filter(p => p.ativo !== false);
  if (planosAtivos.length === 1 && (assinatura?.status === 'ativo' || observacoes?.includes('VIP') || observacoes?.includes('Clube'))) {
    return planosAtivos[0];
  }

  // 4. Se a cliente tem assinatura ativa mas o nome mudou, associa ao primeiro plano ativo
  if (assinatura?.status === 'ativo' && planosAtivos.length > 0) {
    return planosAtivos[0];
  }

  return null;
};

/**
 * Calcula o intervalo de retorno em dias para o Clube VIP (sempre múltiplo de 7 dias: 7, 14, 21, 28)
 */
export const calcularIntervaloVip = (
  plano?: PlanoAssinatura | null,
  assinatura?: AssinaturaCliente | null
): number => {
  const freq = plano?.frequencia_dias || assinatura?.frequencia_dias || 7;
  // O Clube VIP SEMPRE respeita o mesmo dia da semana e horário da primeira sessão
  return Math.max(7, Math.round(freq / 7) * 7);
};

/**
 * Retorna o texto formatado descritivo da periodicidade VIP
 */
export const obterTextoFrequenciaVip = (intervaloDias: number): {
  titulo: string;
  descricaoCurta: string;
  descricaoCompleta: string;
} => {
  if (intervaloDias === 14) {
    return {
      titulo: 'Retorno Quinzenal VIP',
      descricaoCurta: 'A cada 14 dias',
      descricaoCompleta: 'quinzenais (a cada 14 dias / a cada 2 semanas no mesmo dia e horário)'
    };
  }
  if (intervaloDias === 21) {
    return {
      titulo: 'Retorno VIP (3 Semanas)',
      descricaoCurta: 'A cada 21 dias',
      descricaoCompleta: 'a cada 3 semanas (21 dias no mesmo dia e horário)'
    };
  }
  if (intervaloDias === 28) {
    return {
      titulo: 'Retorno Mensal VIP (4 Semanas)',
      descricaoCurta: 'A cada 28 dias',
      descricaoCompleta: 'a cada 4 semanas (28 dias no mesmo dia e horário)'
    };
  }
  if (intervaloDias !== 7) {
    return {
      titulo: `Retorno VIP (${intervaloDias} dias)`,
      descricaoCurta: `A cada ${intervaloDias} dias`,
      descricaoCompleta: `a cada ${intervaloDias} dias no mesmo dia e horário`
    };
  }
  return {
    titulo: 'Retorno Semanal VIP',
    descricaoCurta: 'Toda semana',
    descricaoCompleta: 'semanais (toda semana no mesmo dia e horário)'
  };
};

/**
 * Extrai todos os IDs de serviços vinculados a um plano ou assinatura,
 * resolvendo inclusive por correspondência de nomes e serviços ativos no salão.
 */
export const extrairServicosPlanoHelper = (
  plano?: PlanoAssinatura | null,
  assinatura?: AssinaturaCliente | null,
  todosServicos: Servico[] = []
): string[] => {
  const ids: string[] = [];

  const adicionarSeValido = (sId?: string, nome?: string) => {
    if (sId && todosServicos.some(s => s.id === sId) && !ids.includes(sId)) {
      ids.push(sId);
      return;
    }
    if (nome) {
      const normNome = normalizarTextoVip(nome);
      const servEncontrado = todosServicos.find(s => normalizarTextoVip(s.nome) === normNome)
        || todosServicos.find(s => {
          const sNorm = normalizarTextoVip(s.nome);
          return sNorm && (normNome.includes(sNorm) || sNorm.includes(normNome));
        });
      if (servEncontrado && !ids.includes(servEncontrado.id)) {
        ids.push(servEncontrado.id);
      }
    }
  };

  // 1. Itens de serviços do plano
  if (plano?.itens_servicos && plano.itens_servicos.length > 0) {
    plano.itens_servicos.forEach(it => adicionarSeValido(it.servico_id, it.nome_servico));
  }

  // 2. Saldo da assinatura do cliente
  if (assinatura?.itens_saldo && assinatura.itens_saldo.length > 0) {
    assinatura.itens_saldo.forEach(it => adicionarSeValido(it.servico_id, it.nome_servico));
  }

  // 3. IDs permitidos configurados no plano
  if (plano?.servicos_permitidos_ids && plano.servicos_permitidos_ids.length > 0) {
    plano.servicos_permitidos_ids.forEach(sid => adicionarSeValido(sid));
  }

  // 4. Se ainda assim não encontrou IDs mas temos serviços ativos e um nome de plano descritivo
  if (ids.length === 0 && todosServicos.length > 0) {
    const textoPlano = `${plano?.nome || ''} ${assinatura?.nome_plano || ''} ${plano?.descricao || ''}`;
    const normTexto = normalizarTextoVip(textoPlano);

    todosServicos.filter(s => s.ativo).forEach(s => {
      const normS = normalizarTextoVip(s.nome);
      if (normS && normTexto.includes(normS)) {
        if (!ids.includes(s.id)) ids.push(s.id);
      } else if (normS.includes('pedicure') && (normTexto.includes('pes') || normTexto.includes('pe '))) {
        if (!ids.includes(s.id)) ids.push(s.id);
      } else if (normS.includes('manicure') && (normTexto.includes('maos') || normTexto.includes('mao '))) {
        if (!ids.includes(s.id)) ids.push(s.id);
      }
    });
  }

  return ids;
};
