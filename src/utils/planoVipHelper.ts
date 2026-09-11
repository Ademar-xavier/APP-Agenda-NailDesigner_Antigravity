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
/**
 * Encontra o plano de assinatura correspondente com tolerância a variações de nomenclatura,
 * sinônimos (ex: pés vs pedicure), extração de ID imutável e resolução de ambiguidades.
 */
export const encontrarPlanoVip = (
  planoIdOrNome?: string | null,
  assinatura?: AssinaturaCliente | null,
  observacoes?: string | null,
  planos: PlanoAssinatura[] = []
): PlanoAssinatura | null => {
  if (!planos || planos.length === 0) return null;

  // 1. Busca por ID direto do plano ou da assinatura
  const targetId = planoIdOrNome || assinatura?.plano_id;
  if (targetId) {
    const pById = planos.find(p => p.id === targetId);
    if (pById) return pById;
  }

  // 1.1 Extração de tag de código/ID embutida nas observações: [PLANO_ID:xxx]
  if (observacoes) {
    const matchIdTag = observacoes.match(/\[PLANO_ID:([a-zA-Z0-9_\-]+)\]/i);
    if (matchIdTag && matchIdTag[1]) {
      const pByTag = planos.find(p => p.id === matchIdTag[1]);
      if (pByTag) return pByTag;
    }
  }

  // 2. Extração de candidatos textuais específicos e limpos
  const candidatos: string[] = [];

  // Se houver texto entre parênteses em observações (ex: "👑 Clube VIP (Clube Vip 4 Mãos + 1 Pé) - Sessão 1")
  if (observacoes) {
    const matchParenteses = observacoes.match(/\(([^)]+)\)/);
    if (matchParenteses && matchParenteses[1]) {
      candidatos.push(matchParenteses[1].trim());
    }
    const matchAdesao = observacoes.match(/\[👑\s*Adesão Clube VIP:\s*([^\]]+)\]/i);
    if (matchAdesao && matchAdesao[1]) {
      candidatos.push(matchAdesao[1].trim());
    }
  }

  if (assinatura?.nome_plano) candidatos.push(assinatura.nome_plano.trim());
  if (planoIdOrNome) candidatos.push(planoIdOrNome.trim());
  if (observacoes) candidatos.push(observacoes.trim());

  // 3. FASE 1: Match 100% EXATO normalizado (prioridade máxima absoluta)
  for (const cand of candidatos) {
    const normCand = normalizarTextoVip(cand);
    if (!normCand) continue;

    const pExato = planos.find(p => normalizarTextoVip(p.nome) === normCand);
    if (pExato) return pExato;
  }

  // 4. FASE 2: Match por inclusão ordenado do mais longo/específico para o mais curto
  // Isso impede categoricamente que um plano curto como "4 Mãos" engula um mais longo como "4 Mãos + 1 Pé"
  const planosOrdenadosPorTamanho = [...planos].sort((a, b) => {
    return normalizarTextoVip(b.nome).length - normalizarTextoVip(a.nome).length;
  });

  for (const cand of candidatos) {
    const normCand = normalizarTextoVip(cand);
    if (!normCand) continue;

    for (const p of planosOrdenadosPorTamanho) {
      const normP = normalizarTextoVip(p.nome);
      if (!normP) continue;

      // Se a descrição do plano está contida exatamente no candidato ou vice-versa
      if (normCand === normP || normCand.includes(normP)) {
        // Verifica se não há discrepância de palavras-chave críticas (ex: "pe" vs "sem pe")
        const candTemPe = normCand.includes('pe') || normCand.includes('pes') || normCand.includes('pedicure');
        const planoTemPe = normP.includes('pe') || normP.includes('pes') || normP.includes('pedicure');
        if (candTemPe === planoTemPe) {
          return p;
        }
      }
    }
  }

  // 5. FASE 3: Match por pontuação de palavras-chave e sinônimos
  const stopWords = ['clube', 'club', 'plano', 'vip', 'com', 'para', 'das', 'dos', 'de', 'do', 'da', 'e', 'em', 'sessoes', 'sessao'];

  for (const cand of candidatos) {
    const normCand = normalizarTextoVip(cand);
    if (!normCand) continue;

    const tokensCand = normCand.split(' ').filter(t => t.length >= 2 && !stopWords.includes(t));
    if (tokensCand.length === 0) continue;

    let melhorPlano: PlanoAssinatura | null = null;
    let maiorScore = 0;

    for (const p of planosOrdenadosPorTamanho) {
      const normP = normalizarTextoVip(p.nome);
      const tokensP = normP.split(' ').filter(t => t.length >= 2 && !stopWords.includes(t));

      let score = 0;
      for (const tc of tokensCand) {
        if (tokensP.includes(tc)) {
          score += 3;
        } else if ((tc === 'pes' || tc === 'pe') && (tokensP.includes('pedicure') || normP.includes('pedicure'))) {
          score += 3;
        } else if (tc === 'pedicure' && (tokensP.includes('pes') || tokensP.includes('pe') || normP.includes('pes'))) {
          score += 3;
        } else if ((tc === 'maos' || tc === 'mao') && (tokensP.includes('manicure') || normP.includes('manicure'))) {
          score += 3;
        } else if (tc === 'manicure' && (tokensP.includes('maos') || tokensP.includes('mao') || normP.includes('mao'))) {
          score += 3;
        } else if (tokensP.some(tp => tp.includes(tc) || tc.includes(tp))) {
          score += 1;
        }
      }

      // Penaliza planos que omitem componentes explícitos do candidato
      const candTemPe = tokensCand.some(t => t === 'pe' || t === 'pes' || t === 'pedicure');
      const planoTemPe = tokensP.some(t => t === 'pe' || t === 'pes' || t === 'pedicure');
      if (candTemPe !== planoTemPe) {
        score -= 5;
      }

      if (score > maiorScore) {
        maiorScore = score;
        melhorPlano = p;
      }
    }

    if (melhorPlano && maiorScore >= 3) {
      return melhorPlano;
    }
  }

  // 6. Fallback inteligente: se houver apenas 1 plano ativo no salão e estamos lidando com cliente VIP
  const planosAtivos = planos.filter(p => p.ativo !== false);
  if (planosAtivos.length === 1 && (assinatura?.status === 'ativo' || observacoes?.includes('VIP') || observacoes?.includes('Clube'))) {
    return planosAtivos[0];
  }

  // 7. Se a cliente tem assinatura ativa mas o nome mudou, associa ao plano ativo de mesmo ID ou primeiro plano ativo
  if (assinatura?.status === 'ativo' && planosAtivos.length > 0) {
    if (assinatura.plano_id) {
      const p = planosAtivos.find(x => x.id === assinatura.plano_id);
      if (p) return p;
    }
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

export interface ProcedimentoSessaoVip {
  servico_id: string;
  nome_servico: string;
  profissional_id?: string;
  duracao_minutos: number;
}

/**
 * Retorna os procedimentos/serviços configurados exatamente para uma sessão específica de um plano VIP
 */
export const obterConfiguracaoSessaoVip = (
  plano?: PlanoAssinatura | null,
  sessaoNumero: number = 1,
  todosServicos: Servico[] = []
): ProcedimentoSessaoVip[] => {
  if (!plano) return [];

  const procs: ProcedimentoSessaoVip[] = [];

  // 1. Prioridade máxima: distribuicao_sessoes configurada
  if (plano.distribuicao_sessoes && plano.distribuicao_sessoes.length > 0) {
    const itensSessao = plano.distribuicao_sessoes.filter(d => d.sessao_numero === sessaoNumero);
    if (itensSessao.length > 0) {
      itensSessao.forEach(d => {
        const s = todosServicos.find(serv => serv.id === d.servico_id);
        procs.push({
          servico_id: d.servico_id,
          nome_servico: d.nome_servico || s?.nome || 'Procedimento VIP',
          profissional_id: d.profissional_id,
          duracao_minutos: d.duracao_minutos || s?.duracao_minutos || 60
        });
      });
      return procs;
    }
  }

  // 2. Segunda prioridade: itens_servicos com array sessoes
  if (plano.itens_servicos && plano.itens_servicos.length > 0) {
    const itensComSessao = plano.itens_servicos.filter(it => it.sessoes && it.sessoes.includes(sessaoNumero));
    if (itensComSessao.length > 0) {
      itensComSessao.forEach(it => {
        const s = todosServicos.find(serv => serv.id === it.servico_id);
        procs.push({
          servico_id: it.servico_id,
          nome_servico: it.nome_servico || s?.nome || 'Procedimento VIP',
          profissional_id: it.profissional_id,
          duracao_minutos: s?.duracao_minutos || 60
        });
      });
      return procs;
    }

    // Se nenhum item tem sessoes explícitas (ex: plano simples):
    plano.itens_servicos.forEach(it => {
      const s = todosServicos.find(serv => serv.id === it.servico_id);
      procs.push({
        servico_id: it.servico_id,
        nome_servico: it.nome_servico || s?.nome || 'Procedimento VIP',
        profissional_id: it.profissional_id,
        duracao_minutos: s?.duracao_minutos || 60
      });
    });
    return procs;
  }

  // 3. Fallback: servicos_permitidos_ids
  if (plano.servicos_permitidos_ids && plano.servicos_permitidos_ids.length > 0) {
    const sid = plano.servicos_permitidos_ids[0];
    const s = todosServicos.find(serv => serv.id === sid);
    procs.push({
      servico_id: sid,
      nome_servico: s?.nome || 'Procedimento VIP',
      duracao_minutos: s?.duracao_minutos || 60
    });
    return procs;
  }

  return procs;
};

/**
 * Calcula a duração exata em minutos de uma sessão do Clube VIP,
 * respeitando atendimento simultâneo (em paralelo) se houver profissionais distintas.
 */
export const calcularDuracaoSessaoVip = (
  plano?: PlanoAssinatura | null,
  sessaoNumero: number = 1,
  todosServicos: Servico[] = []
): number => {
  if (!plano) return 60;

  const procs = obterConfiguracaoSessaoVip(plano, sessaoNumero, todosServicos);
  if (procs.length === 0) {
    return 60;
  }

  // Agrupa procedimentos por profissional para considerar trabalho simultâneo (4 mãos)
  const porProf = new Map<string, number>();
  procs.forEach(p => {
    const profKey = p.profissional_id || 'padrao';
    const durAtual = porProf.get(profKey) || 0;
    porProf.set(profKey, durAtual + p.duracao_minutos);
  });

  const duracoes = Array.from(porProf.values());
  const maxDur = Math.max(...duracoes);

  return maxDur > 0 ? maxDur : 60;
};

/**
 * Retorna os IDs dos serviços configurados para uma sessão específica do plano VIP
 */
export const obterServicosIdsSessaoVip = (
  plano?: PlanoAssinatura | null,
  sessaoNumero: number = 1,
  todosServicos: Servico[] = []
): string[] => {
  const procs = obterConfiguracaoSessaoVip(plano, sessaoNumero, todosServicos);
  const ids = procs.map(p => p.servico_id).filter(Boolean);
  if (ids.length > 0) return ids;

  return extrairServicosPlanoHelper(plano, null, todosServicos);
};

/**
 * Retorna o resumo formatado da duração das sessões do plano para exibição nos cards e catálogo
 */
export const obterTextoResumoSessoesVip = (
  plano?: PlanoAssinatura | null,
  todosServicos: Servico[] = []
): {
  duracaoResumo: string;
  detalhePorSessao: string;
  duracoesPorSessao: { sessao: number; duracao: number; procedimentos: string }[];
} => {
  if (!plano) {
    return {
      duracaoResumo: '60 min / sessão',
      detalhePorSessao: '',
      duracoesPorSessao: []
    };
  }

  const totalSessoes = plano.qtd_procedimentos_mes || 4;
  const lista: { sessao: number; duracao: number; procedimentos: string }[] = [];

  let numMaxSessoes = 4;
  if (plano.distribuicao_sessoes && plano.distribuicao_sessoes.length > 0) {
    numMaxSessoes = Math.max(...plano.distribuicao_sessoes.map(d => d.sessao_numero));
  } else if (plano.itens_servicos) {
    const sessoesNosItens = plano.itens_servicos.flatMap(it => it.sessoes || []);
    if (sessoesNosItens.length > 0) {
      numMaxSessoes = Math.max(...sessoesNosItens);
    } else {
      numMaxSessoes = Math.max(1, Math.round(30 / (plano.frequencia_dias || 7)));
    }
  }

  for (let s = 1; s <= numMaxSessoes; s++) {
    const procs = obterConfiguracaoSessaoVip(plano, s, todosServicos);
    if (procs.length > 0) {
      const dur = calcularDuracaoSessaoVip(plano, s, todosServicos);
      const nomes = procs.map(p => p.nome_servico).join(' + ');
      lista.push({ sessao: s, duracao: dur, procedimentos: nomes });
    }
  }

  if (lista.length === 0) {
    return {
      duracaoResumo: '60 min / sessão',
      detalhePorSessao: '',
      duracoesPorSessao: []
    };
  }

  const todasDuracoes = lista.map(l => l.duracao);
  const minDur = Math.min(...todasDuracoes);
  const maxDur = Math.max(...todasDuracoes);

  let duracaoResumo = `${minDur} min / sessão`;
  if (minDur !== maxDur) {
    duracaoResumo = `${minDur} a ${maxDur} min / sessão`;
  }

  const mapaDurSessoes = new Map<number, number[]>();
  lista.forEach(item => {
    const arr = mapaDurSessoes.get(item.duracao) || [];
    arr.push(item.sessao);
    mapaDurSessoes.set(item.duracao, arr);
  });

  const partesDetalhe: string[] = [];
  mapaDurSessoes.forEach((sessoes, dur) => {
    const sessoesStr = sessoes.length === 1 
      ? `Sessão ${sessoes[0]}` 
      : `Sessões ${sessoes.slice(0, -1).join(', ')} e ${sessoes[sessoes.length - 1]}`;
    partesDetalhe.push(`${sessoesStr}: ${dur} min`);
  });

  return {
    duracaoResumo,
    detalhePorSessao: partesDetalhe.join(' • '),
    duracoesPorSessao: lista
  };
};
