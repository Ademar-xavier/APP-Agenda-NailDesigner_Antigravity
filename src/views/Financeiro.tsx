import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Tag,
  Trash2,
  List,
  FolderPlus,
  User,
  Percent,
  Wallet,
  Check,
  ShieldCheck,
  RotateCcw,
  FileText,
  Download,
  Printer,
  Sparkles,
  Crown,
  Flame,
  BarChart3
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { MetodoPagamento, Agendamento } from '../types';
import { calcularValorServicoProfissional, agendamentoEnvolveProfissional, encontrarPlanoVip } from '../utils/planoVipHelper';

export const Financeiro: React.FC = () => {
  const { 
    agendamentos, 
    clientes, 
    pagamentos, 
    servicos, 
    obterServicosDeAgendamento,
    confirmarSinal,
    marcarAvisoComoLido,
    despesas,
    addDespesa,
    deleteDespesa,
    categoriasDespesa,
    addCategoriaDespesa,
    deleteCategoriaDespesa,
    equipe,
    confirmarAcao,
    fechamentosComissao,
    salvarFechamentoComissao,
    deleteFechamentoComissao,
    configSalao,
    planosAssinatura
  } = useAppState();

  const [profissionalFiltro, setProfissionalFiltro] = useState<string>('todas');

  const [busca, setBusca] = useState('');
  const [despesaModal, setDespesaModal] = useState(false);
  const [financeTab, setFinanceTab] = useState<'pendentes' | 'despesas' | 'comissoes'>('pendentes');

  // Intercepta Escape e Botão Voltar Nativo do Celular (Android) para fechar modal em Financeiro.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && despesaModal) {
        setDespesaModal(false);
      }
    };

    const handleAndroidBack = (e: Event) => {
      if (despesaModal) {
        if (e.cancelable) e.preventDefault();
        setDespesaModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('nail_android_back', handleAndroidBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('nail_android_back', handleAndroidBack);
    };
  }, [despesaModal]);
  
  // Form Despesa Fields
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Materiais');
  const [valorDespesa, setValorDespesa] = useState(0);
  const [dataDespesa, setDataDespesa] = useState(new Date().toLocaleDateString('en-CA'));

  // Adicionar Categoria Field
  const [showNovaCat, setShowNovaCat] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState('');

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSalvarDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || valorDespesa <= 0) return;

    let catFinal = categoria;
    if (categoria === 'nova' && novaCatNome.trim()) {
      addCategoriaDespesa(novaCatNome.trim());
      catFinal = novaCatNome.trim();
    }

    addDespesa({
      descricao,
      categoria: catFinal,
      valor: valorDespesa,
      data: dataDespesa
    });

    setDescricao('');
    setValorDespesa(0);
    setCategoria('Materiais');
    setNovaCatNome('');
    setShowNovaCat(false);
    setDespesaModal(false);
  };

  const handleExcluirDespesa = (id: string) => {
    confirmarAcao({
      titulo: 'Excluir Despesa',
      mensagem: 'Deseja realmente excluir esta despesa?',
      tipo: 'erro',
      textoConfirmar: 'Excluir',
      textoCancelar: 'Cancelar',
      onConfirm: () => deleteDespesa(id)
    });
  };

  // --- FILTROS DE PERÍODO (Mês Selecionável em Tempo Real) ---
  const mesHojeStr = new Date().toLocaleDateString('en-CA').slice(0, 7);
  const [mesSelecionadoStr, setMesSelecionadoStr] = useState<string>(mesHojeStr);

  const alterarMes = (delta: number) => {
    const partes = mesSelecionadoStr.split('-');
    const ano = Number(partes[0]);
    const mes = Number(partes[1]);
    const d = new Date(ano, mes - 1 + delta, 1);
    const novoAno = d.getFullYear();
    const novoMes = String(d.getMonth() + 1).padStart(2, '0');
    setMesSelecionadoStr(`${novoAno}-${novoMes}`);
  };

  // Profissionais ativas
  const profsAtivas = useMemo(() => equipe.filter(u => u.ativo), [equipe]);
  const totalProfsAtivas = Math.max(profsAtivas.length, 1);

  // Total geral de despesas do mês (Salão)
  const totalDespesasGerais = useMemo(() => {
    return despesas
      .filter(d => d.data.startsWith(mesSelecionadoStr))
      .reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  }, [despesas, mesSelecionadoStr]);

  // Profissional atualmente filtrada (se houver)
  const profSelecionadaFiltro = useMemo(() => {
    if (profissionalFiltro === 'todas') return null;
    return equipe.find(u => u.id === profissionalFiltro) || null;
  }, [equipe, profissionalFiltro]);

  const taxaComissaoProfFiltro = profSelecionadaFiltro?.comissao_padrao_porcentagem !== undefined 
    ? profSelecionadaFiltro.comissao_padrao_porcentagem 
    : 50;

  // 3. Despesas Totais do Mês (KPI Box 3)
  // REGRA DE NEGÓCIO:
  // - Filtro "Salão": Mostra o total das despesas operacionais do salão.
  // - Filtro por Profissional:
  //   * Se comissão = 100%: rateia as despesas igualmente entre as profissionais do salão.
  //   * Se comissão < 100%: despesas zeradas (R$ 0,00), pois os custos são exclusivos do Salão.
  const totalDespesasMes = useMemo(() => {
    if (profissionalFiltro === 'todas') {
      return totalDespesasGerais;
    }
    if (taxaComissaoProfFiltro >= 100) {
      return totalDespesasGerais / totalProfsAtivas;
    }
    return 0;
  }, [profissionalFiltro, totalDespesasGerais, taxaComissaoProfFiltro, totalProfsAtivas]);

  // Faturamento e Atendimentos do Mês
  const { receitasRealizadas, faturamentoPrevisto, concluidosMes, ticketMedio, totalMinutosAgendados } = useMemo(() => {
    let recReal = 0;
    let recPrev = 0;
    let minAgendados = 0;
    const concluidos: Agendamento[] = [];

    agendamentos.forEach(a => {
      if (
        a.motivo_cancelamento === 'EXCLUIDO_ADMIN' ||
        a.cliente_id === 'bloqueado' ||
        !a.inicio.startsWith(mesSelecionadoStr) ||
        a.observacoes?.includes('[AG_PRINCIPAL:') ||
        a.status === 'cancelado' ||
        a.status === 'falta'
      ) {
        return;
      }

      const sIds = obterServicosDeAgendamento(a.id).map(s => s.id);

      if (profissionalFiltro === 'todas') {
        // Visão consolidada do Salão
        const isDupla = sIds.some(s => s === 's3') || (
          (a.observacoes?.includes('Co-atendimento') || a.observacoes?.includes('2 Profissionais') || a.observacoes?.includes('AG_PAR:') || a.observacoes?.includes('Dupla')) &&
          !sIds.some(s => s === 's_blmeapdgo')
        );
        const isVipIncluso = a.pago_com_clube && a.valor_total === 0;
        const valTotal = isVipIncluso ? 0 : (isDupla ? (obterServicosDeAgendamento(a.id)[0]?.preco || Math.max(a.valor_total, 80)) : a.valor_total);

        if (a.status === 'concluido') {
          recReal += valTotal;
          concluidos.push(a);
        } else if (a.status === 'confirmado' || a.status === 'pendente') {
          recPrev += valTotal;
        }

        const diffMs = new Date(a.fim).getTime() - new Date(a.inicio).getTime();
        minAgendados += Math.floor(diffMs / (60 * 1000));
      } else {
        // Visão individual da Profissional: calcula estritamente o valor que cabe a ela
        const valProf = calcularValorServicoProfissional(a, profissionalFiltro, servicos, equipe, sIds);
        if (valProf > 0) {
          if (a.status === 'concluido') {
            recReal += valProf;
            concluidos.push(a);
          } else if (a.status === 'confirmado' || a.status === 'pendente') {
            recPrev += valProf;
          }

          const diffMs = new Date(a.fim).getTime() - new Date(a.inicio).getTime();
          minAgendados += Math.floor(diffMs / (60 * 1000));
        }
      }
    });

    const ticket = concluidos.length > 0 ? (recReal / concluidos.length) : 0;
    return {
      receitasRealizadas: recReal,
      faturamentoPrevisto: recPrev,
      concluidosMes: concluidos,
      ticketMedio: ticket,
      totalMinutosAgendados: minAgendados
    };
  }, [agendamentos, mesSelecionadoStr, profissionalFiltro, servicos, equipe, obterServicosDeAgendamento]);

  // 4. Lucro Líquido (KPI Box 4)
  const lucroLiquido = useMemo(() => {
    if (profissionalFiltro === 'todas') {
      return receitasRealizadas - totalDespesasMes;
    }
    if (taxaComissaoProfFiltro >= 100) {
      // 100% comissão: Faturamento Realizado - Despesa rateada
      return receitasRealizadas - totalDespesasMes;
    }
    // Comissão < 100%: Comissão devida da profissional (já que os custos operacionais são do Salão)
    return (receitasRealizadas * taxaComissaoProfFiltro) / 100;
  }, [profissionalFiltro, receitasRealizadas, totalDespesasMes, taxaComissaoProfFiltro]);

  // 6. Ocupação Real (KPI Box 6)
  const expedienteMinutosMes = 22 * 540; // ~22 dias úteis de 9 horas
  const taxaOcupacao = Math.min(100, Math.round((totalMinutosAgendados / expedienteMinutosMes) * 100));

  // --- GRAFICO: Faturamento realizado por dia no mês selecionado ---
  const anoNum = Number(mesSelecionadoStr.split('-')[0]);
  const mesNum = Number(mesSelecionadoStr.split('-')[1]);
  const diasNoMes = new Date(anoNum, mesNum, 0).getDate();

  const nomesDiasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const nomesDiasSemanaCompletos = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const faturamentoPorDia = useMemo(() => {
    return Array.from({ length: diasNoMes }, (_, i) => {
      const diaNum = i + 1;
      const dia = String(diaNum).padStart(2, '0');
      const dataDiaStr = `${mesSelecionadoStr}-${dia}`;
      const dataObj = new Date(anoNum, mesNum - 1, diaNum);
      const diaSemanaIndex = dataObj.getDay();
      const diaSemana = nomesDiasSemana[diaSemanaIndex];
      const diaSemanaCompleto = nomesDiasSemanaCompletos[diaSemanaIndex];
      const isFimDeSemana = diaSemanaIndex === 0 || diaSemanaIndex === 6;

      let valorDia = 0;
      const agsDoDia = concluidosMes.filter(a => a.inicio.startsWith(dataDiaStr));
      
      agsDoDia.forEach(a => {
        const sIds = obterServicosDeAgendamento(a.id).map(s => s.id);
        if (profissionalFiltro === 'todas') {
          const isDupla = sIds.some(s => s === 's3') || (
            (a.observacoes?.includes('Co-atendimento') || a.observacoes?.includes('2 Profissionais') || a.observacoes?.includes('AG_PAR:') || a.observacoes?.includes('Dupla')) &&
            !sIds.some(s => s === 's_blmeapdgo')
          );
          const isVipIncluso = a.pago_com_clube && a.valor_total === 0;
          valorDia += isVipIncluso ? 0 : (isDupla ? (obterServicosDeAgendamento(a.id)[0]?.preco || Math.max(a.valor_total, 80)) : a.valor_total);
        } else {
          valorDia += calcularValorServicoProfissional(a, profissionalFiltro, servicos, equipe, sIds);
        }
      });

      return { 
        dia, 
        diaNum,
        dataDiaStr,
        diaSemana,
        diaSemanaCompleto,
        isFimDeSemana,
        valor: valorDia,
        qtdAtendimentos: agsDoDia.length,
        atendimentos: agsDoDia
      };
    });
  }, [diasNoMes, mesSelecionadoStr, anoNum, mesNum, concluidosMes, profissionalFiltro, obterServicosDeAgendamento, servicos, equipe]);

  const maxValorDia = useMemo(() => {
    return Math.max(...faturamentoPorDia.map(d => d.valor), 1);
  }, [faturamentoPorDia]);

  const statsGrafico = useMemo(() => {
    const diasComValor = faturamentoPorDia.filter(d => d.valor > 0);
    const diaPico = faturamentoPorDia.reduce((max, d) => (d.valor > max.valor ? d : max), faturamentoPorDia[0]);
    const totalFaturadoGrafico = faturamentoPorDia.reduce((acc, d) => acc + d.valor, 0);
    const mediaPorDiaAtivo = diasComValor.length > 0 ? (totalFaturadoGrafico / diasComValor.length) : 0;

    return {
      diaPico,
      totalDiasAtivos: diasComValor.length,
      mediaPorDiaAtivo,
      totalFaturadoGrafico
    };
  }, [faturamentoPorDia]);

  const [diaHover, setDiaHover] = useState<typeof faturamentoPorDia[0] | null>(null);

  // --- TAXAS DO PERÍODO ---
  const agendamentosMes = useMemo(() => {
    return agendamentos.filter(a => {
      const matchMes = a.inicio?.startsWith(mesSelecionadoStr);
      if (!matchMes) return false;
      if (a.motivo_cancelamento === 'EXCLUIDO_ADMIN' || a.observacoes?.includes('[AG_PRINCIPAL:')) return false;
      if (profissionalFiltro !== 'todas') {
        return a.profissional_id === profissionalFiltro || agendamentoEnvolveProfissional(a, profissionalFiltro, servicos);
      }
      return true;
    });
  }, [agendamentos, mesSelecionadoStr, profissionalFiltro, servicos]);

  const totalAgends = agendamentosMes.length || 1;
  const confCount = agendamentosMes.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
  const faltaCount = agendamentosMes.filter(a => a.status === 'falta').length;
  const cancCount = agendamentosMes.filter(a => a.status === 'cancelado').length;

  const taxaConfirmacao = Math.round((confCount / totalAgends) * 100);
  const taxaFalta = Math.round((faltaCount / totalAgends) * 100);
  const taxaCancelamento = Math.round((cancCount / totalAgends) * 100);

  // --- SERVIÇOS E PLANOS VIPS MAIS RENTÁVEIS ---
  const servicosMaisRentaveis = useMemo(() => {
    const faturamentoPorItemMap: { 
      [key: string]: { 
        id: string;
        nome: string; 
        quantidade: number; 
        total: number; 
        isVip: boolean;
      } 
    } = {};

    concluidosMes.forEach(a => {
      const cli = clientes.find(c => c.id === a.cliente_id);
      const planoVip = encontrarPlanoVip(a.plano_id, cli?.assinatura, a.observacoes, planosAssinatura);
      const isVip = !!(a.pago_com_clube || a.plano_id || a.observacoes?.includes('👑') || a.observacoes?.includes('Clube VIP') || planoVip);
      const sIds = obterServicosDeAgendamento(a.id).map(s => s.id);

      if (isVip) {
        // Atendimento vinculado ao Clube VIP
        const nomePlano = planoVip ? `👑 ${planoVip.nome}` : (cli?.assinatura?.nome_plano ? `👑 ${cli.assinatura.nome_plano}` : '👑 Clube VIP');
        const itemKey = planoVip ? `vip_${planoVip.id}` : `vip_${nomePlano}`;
        
        let valorItem = 0;
        if (profissionalFiltro === 'todas') {
          if (a.valor_total > 0) {
            valorItem = a.valor_total;
          } else if (planoVip && planoVip.preco_mensal && planoVip.qtd_procedimentos_mes) {
            valorItem = Math.round(planoVip.preco_mensal / (planoVip.qtd_procedimentos_mes || 1));
          } else {
            const servs = obterServicosDeAgendamento(a.id);
            valorItem = servs.reduce((acc, s) => acc + (s.preco || 0), 0) || 45;
          }
        } else {
          valorItem = calcularValorServicoProfissional(a, profissionalFiltro, servicos, equipe, sIds);
        }

        if (!faturamentoPorItemMap[itemKey]) {
          faturamentoPorItemMap[itemKey] = {
            id: itemKey,
            nome: nomePlano,
            quantidade: 0,
            total: 0,
            isVip: true
          };
        }
        faturamentoPorItemMap[itemKey].quantidade += 1;
        faturamentoPorItemMap[itemKey].total += valorItem;
      } else {
        // Atendimento Avulso / Procedimento Normal
        let servs = obterServicosDeAgendamento(a.id);

        // Se ainda não encontrou serviço, tenta fallback por observações ou por preço
        if (servs.length === 0) {
          if (a.observacoes) {
            const obsNorm = a.observacoes.toLowerCase();
            const servicosOrdenados = [...servicos].sort((x, y) => y.nome.length - x.nome.length);
            const sMatch = servicosOrdenados.find(s => obsNorm.includes(s.nome.toLowerCase()));
            if (sMatch) servs = [sMatch];
          }
          if (servs.length === 0 && a.valor_total > 0) {
            const sPreco = servicos.find(s => s.preco === a.valor_total);
            if (sPreco) servs = [sPreco];
          }
        }

        if (servs.length === 0) {
          const nomeFallback = a.observacoes?.trim() ? a.observacoes.split('\n')[0].replace(/\[.*?\]/g, '').trim() : '';
          const nomeItem = nomeFallback || 'Atendimento Avulso';
          const itemKey = `avulso_${nomeItem.toLowerCase().replace(/\s+/g, '_')}`;
          const valorItem = profissionalFiltro === 'todas' ? a.valor_total : calcularValorServicoProfissional(a, profissionalFiltro, servicos, equipe, []);
          if (!faturamentoPorItemMap[itemKey]) {
            faturamentoPorItemMap[itemKey] = { id: itemKey, nome: nomeItem, quantidade: 0, total: 0, isVip: false };
          }
          faturamentoPorItemMap[itemKey].quantidade += 1;
          faturamentoPorItemMap[itemKey].total += valorItem;
        } else {
          servs.forEach(s => {
            let valorItem = 0;
            if (profissionalFiltro === 'todas') {
              valorItem = s.preco;
            } else {
              valorItem = calcularValorServicoProfissional(a, profissionalFiltro, servicos, equipe, [s.id]);
            }
            if (!faturamentoPorItemMap[s.id]) {
              faturamentoPorItemMap[s.id] = { id: s.id, nome: s.nome, quantidade: 0, total: 0, isVip: false };
            }
            faturamentoPorItemMap[s.id].quantidade += 1;
            faturamentoPorItemMap[s.id].total += valorItem;
          });
        }
      }
    });

    return Object.values(faturamentoPorItemMap)
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [concluidosMes, clientes, planosAssinatura, profissionalFiltro, obterServicosDeAgendamento, servicos, equipe]);

  const maxTotalServico = useMemo(() => {
    return Math.max(...servicosMaisRentaveis.map(s => s.total), 1);
  }, [servicosMaisRentaveis]);

  // --- PAGAMENTOS PENDENTES ---
  // Inclui todos os agendamentos que estão com status 'pendente' (A Confirmar) no mês selecionado
  const pagamentosPendentes = useMemo(() => {
    // 1. Agendamentos pendentes deste mês
    const agendamentosPendentesMes = agendamentos.filter(a => {
      const matchMes = a.inicio?.startsWith(mesSelecionadoStr);
      const isPendente = a.status === 'pendente';
      if (!matchMes || !isPendente) return false;
      if (a.motivo_cancelamento === 'EXCLUIDO_ADMIN' || a.observacoes?.includes('[AG_PRINCIPAL:')) return false;
      if (profissionalFiltro !== 'todas') {
        return a.profissional_id === profissionalFiltro || agendamentoEnvolveProfissional(a, profissionalFiltro, servicos);
      }
      return true;
    });

    const lista: Array<{
      id: string;
      agendamento_id: string;
      valor: number;
      tipo: string;
      status: string;
      data_pagamento?: string;
    }> = [];

    // Para cada agendamento pendente do mês, adiciona o pagamento existente ou sintetiza
    agendamentosPendentesMes.forEach(a => {
      const pag = pagamentos.find(p => p.agendamento_id === a.id);
      if (pag) {
        lista.push({
          ...pag,
          valor: pag.valor || a.valor_sinal || a.valor_total || 0,
          status: 'pendente'
        });
      } else {
        lista.push({
          id: 'pend_' + a.id,
          agendamento_id: a.id,
          valor: a.valor_sinal || a.valor_total || 0,
          tipo: 'pix',
          status: 'pendente',
          data_pagamento: a.inicio
        });
      }
    });

    // 2. Pagamentos com status 'pendente' que porventura existam no array pagamentos
    pagamentos.forEach(p => {
      if (p.status === 'pendente' && !lista.some(item => item.agendamento_id === p.agendamento_id)) {
        const agend = agendamentos.find(a => a.id === p.agendamento_id);
        if (!agend || agend.status !== 'pendente') {
          return;
        }
        const matchData = agend.inicio?.startsWith(mesSelecionadoStr);
        if (!matchData) return;
        if (profissionalFiltro !== 'todas' && agend.profissional_id !== profissionalFiltro && !agendamentoEnvolveProfissional(agend, profissionalFiltro, servicos)) {
          return;
        }
        lista.push(p);
      }
    });

    return lista;
  }, [agendamentos, pagamentos, mesSelecionadoStr, profissionalFiltro, servicos]);

  const despesasMes = despesas.filter(d => d.data.startsWith(mesSelecionadoStr));

  // --- CÁLCULO DE COMISSÕES E REPASSES (LEI DO SALÃO-PARCEIRO) ---
  const comissoesPorProfissional = useMemo(() => {
    return equipe.filter(u => u.ativo).map(prof => {
      const agsConcluidos: { agendamento: Agendamento; valorEfetivo: number }[] = [];
      const agsPrevistos: { agendamento: Agendamento; valorEfetivo: number }[] = [];

      agendamentos.forEach(a => {
        if (
          a.motivo_cancelamento !== 'EXCLUIDO_ADMIN' &&
          a.cliente_id !== 'bloqueado' &&
          a.inicio.startsWith(mesSelecionadoStr) &&
          !a.observacoes?.includes('[AG_PRINCIPAL:')
        ) {
          const sIds = obterServicosDeAgendamento(a.id).map(s => s.id);
          const valorEfetivo = calcularValorServicoProfissional(a, prof.id, servicos, equipe, sIds);
          if (valorEfetivo > 0) {
            if (a.status === 'concluido') {
              agsConcluidos.push({ agendamento: a, valorEfetivo });
            } else if (a.status === 'confirmado') {
              agsPrevistos.push({ agendamento: a, valorEfetivo });
            }
          }
        }
      });

      const faturamentoBruto = agsConcluidos.reduce((acc, item) => acc + item.valorEfetivo, 0);
      const totalAtendimentos = agsConcluidos.length;
      const taxaPct = prof.comissao_padrao_porcentagem !== undefined ? prof.comissao_padrao_porcentagem : 50;
      const valorComissaoBruta = (faturamentoBruto * taxaPct) / 100;
      const cotaSalao = faturamentoBruto - valorComissaoBruta;

      const faturamentoPrevistoProf = agsPrevistos.reduce((acc, item) => acc + item.valorEfetivo, 0);
      const totalPrevistos = agsPrevistos.length;
      const comissaoPrevista = (faturamentoPrevistoProf * taxaPct) / 100;

      const fechamentoExistente = fechamentosComissao.find(f => 
        f.profissional_id === prof.id && 
        f.periodo_inicio.startsWith(mesSelecionadoStr)
      );

      return {
        profissional: prof,
        totalAtendimentos,
        faturamentoBruto,
        taxaPct,
        valorComissaoBruta,
        cotaSalao,
        totalPrevistos,
        faturamentoPrevistoProf,
        comissaoPrevista,
        fechamentoExistente
      };
    });
  }, [equipe, agendamentos, mesSelecionadoStr, fechamentosComissao, servicos, obterServicosDeAgendamento]);

  const handleFecharComissao = (item: typeof comissoesPorProfissional[0]) => {
    confirmarAcao({
      titulo: 'Fechar Repasse de Comissão',
      mensagem: `Deseja registrar o repasse de ${formatarMoeda(item.valorComissaoBruta)} para ${item.profissional.nome}? Esse valor será debitado como despesa do salão no fluxo de caixa.`,
      textoConfirmar: 'Confirmar e Pagar',
      tipo: 'sucesso',
      onConfirm: () => {
        salvarFechamentoComissao({
          profissional_id: item.profissional.id,
          nome_profissional: item.profissional.nome,
          periodo_inicio: `${mesSelecionadoStr}-01`,
          periodo_fim: `${mesSelecionadoStr}-31`,
          total_faturado_bruto: item.faturamentoBruto,
          taxa_comissao_porcentagem: item.taxaPct,
          valor_comissao_bruta: item.valorComissaoBruta,
          desconto_taxas_cartao: 0,
          desconto_materiais: 0,
          outros_descontos: 0,
          valor_liquido_pago: item.valorComissaoBruta,
          data_pagamento: new Date().toISOString().split('T')[0],
          pago: true
        });
      }
    });
  };

  const dataRef = new Date(anoNum, mesNum - 1, 1);
  const nomeMesAtual = dataRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const handleExportarExcelAnual = () => {
    const ano = anoNum;
    const nomeSalao = configSalao?.nome || 'Sheila Santos Nails';
    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let csv = '';
    csv += `RELATÓRIO FINANCEIRO ANUAL CONSOLIDADO - EXERCÍCIO ${ano}\n`;
    csv += `Estabelecimento:;${nomeSalao}\n`;
    csv += `Proprietária / Responsável:;${configSalao?.proprietaria || 'Sheila Santos'}\n`;
    csv += `Data de Emissão:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

    // 1. Tabela Resumo Mensal
    csv += `RESUMO MENSAL CONSOLIDADO (${ano})\n`;
    csv += `Mês;Atendimentos Concluídos;Receitas Realizadas (R$);Faturamento Previsto (R$);Despesas (R$);Lucro Líquido (R$)\n`;

    let somaAtend = 0;
    let somaRecReal = 0;
    let somaRecPrev = 0;
    let somaDesp = 0;
    let somaLucro = 0;

    for (let m = 1; m <= 12; m++) {
      const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
      const ags = agendamentos.filter(a => a.inicio.startsWith(mesStr));
      const concl = ags.filter(a => a.status === 'concluido');
      const recReal = concl.reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);
      const recPrev = ags.filter(a => a.status === 'confirmado' || a.status === 'pendente').reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);
      const desp = despesas.filter(d => d.data.startsWith(mesStr)).reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
      const lucro = recReal - desp;

      somaAtend += concl.length;
      somaRecReal += recReal;
      somaRecPrev += recPrev;
      somaDesp += desp;
      somaLucro += lucro;

      csv += `${mesesNomes[m - 1]};${concl.length};${recReal.toFixed(2).replace('.', ',')};${recPrev.toFixed(2).replace('.', ',')};${desp.toFixed(2).replace('.', ',')};${lucro.toFixed(2).replace('.', ',')}\n`;
    }

    csv += `TOTAL ANUAL;${somaAtend};${somaRecReal.toFixed(2).replace('.', ',')};${somaRecPrev.toFixed(2).replace('.', ',')};${somaDesp.toFixed(2).replace('.', ',')};${somaLucro.toFixed(2).replace('.', ',')}\n\n`;

    // 2. Extrato Detalhado de Atendimentos do Ano
    csv += `EXTRATO DETALHADO DE ATENDIMENTOS DO ANO (${ano})\n`;
    csv += `Data;Horário;Cliente;Profissional;Serviços;Status;Valor Total (R$);Valor Sinal (R$)\n`;

    const agsAno = agendamentos
      .filter(a => a.inicio.startsWith(String(ano)))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

    agsAno.forEach(a => {
      const cli = clientes.find(c => c.id === a.cliente_id);
      const prof = equipe.find(e => e.id === a.profissional_id);
      const servs = obterServicosDeAgendamento(a.id);
      const servNomes = servs.map(s => s.nome).join(' + ') || 'Procedimento';
      const [dPart, tPart] = a.inicio.split('T');
      const dataFmt = dPart ? dPart.split('-').reverse().join('/') : '';
      const horaFmt = tPart ? tPart.substring(0, 5) : '';

      csv += `${dataFmt};${horaFmt};"${cli?.nome || 'Cliente'}";"${prof?.nome || 'Sheila'}";"${servNomes}";${a.status};${(Number(a.valor_total) || 0).toFixed(2).replace('.', ',')};${(Number(a.valor_sinal) || 0).toFixed(2).replace('.', ',')}\n`;
    });

    csv += `\nEXTRATO DETALHADO DE DESPESAS DO ANO (${ano})\n`;
    csv += `Data;Categoria;Descrição;Valor (R$)\n`;
    const despAno = despesas
      .filter(d => d.data.startsWith(String(ano)))
      .sort((a, b) => a.data.localeCompare(b.data));

    despAno.forEach(d => {
      const dataFmt = d.data ? d.data.split('-').reverse().join('/') : '';
      csv += `${dataFmt};"${d.categoria}";"${d.descricao}";${(Number(d.valor) || 0).toFixed(2).replace('.', ',')}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relatorio_Financeiro_Anual_${ano}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportarPdfAnual = () => {
    const ano = anoNum;
    const nomeSalao = configSalao?.nome || 'Sheila Santos Nails';
    const proprietaria = configSalao?.proprietaria || 'Sheila Santos';
    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let linhasTabelaHtml = '';
    let somaAtend = 0;
    let somaRecReal = 0;
    let somaRecPrev = 0;
    let somaDesp = 0;
    let somaLucro = 0;

    for (let m = 1; m <= 12; m++) {
      const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
      const ags = agendamentos.filter(a => a.inicio.startsWith(mesStr));
      const concl = ags.filter(a => a.status === 'concluido');
      const recReal = concl.reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);
      const recPrev = ags.filter(a => a.status === 'confirmado' || a.status === 'pendente').reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);
      const desp = despesas.filter(d => d.data.startsWith(mesStr)).reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
      const lucro = recReal - desp;

      somaAtend += concl.length;
      somaRecReal += recReal;
      somaRecPrev += recPrev;
      somaDesp += desp;
      somaLucro += lucro;

      const lucroCor = lucro >= 0 ? '#166534' : '#991b1b';

      linhasTabelaHtml += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; font-weight: bold; text-align: left;">${mesesNomes[m - 1]}</td>
          <td style="padding: 8px 12px; text-align: center;">${concl.length}</td>
          <td style="padding: 8px 12px; text-align: right; color: #166534; font-weight: 600;">R$ ${recReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: right; color: #4b5563;">R$ ${recPrev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: right; color: #991b1b;">R$ ${desp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; text-align: right; color: ${lucroCor}; font-weight: bold;">R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Financeiro Anual - ${ano} - ${nomeSalao}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 20px; font-size: 11pt; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #8C6D58; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 20pt; font-weight: bold; color: #5A4535; margin: 0; }
          .subtitle { font-size: 11pt; color: #6b7280; margin-top: 4px; }
          .meta { text-align: right; font-size: 9pt; color: #6b7280; }
          .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #6b7280; }
          .kpi-val { font-size: 15pt; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10pt; }
          th { background-color: #8C6D58; color: white; padding: 10px 12px; text-align: left; font-size: 9pt; text-transform: uppercase; }
          th.right, td.right { text-align: right; }
          th.center, td.center { text-align: center; }
          .total-row { background: #f3f4f6; font-weight: bold; border-top: 2px solid #8C6D58; }
          .footer { margin-top: 30px; font-size: 9pt; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${nomeSalao}</h1>
            <p class="subtitle">Demonstrativo Financeiro Anual Consolidado · Exercício ${ano}</p>
            <p style="font-size: 9pt; color: #4b5563; margin-top: 2px;">Responsável: ${proprietaria} · Telefone: ${configSalao?.telefone || 'Não informado'}</p>
          </div>
          <div class="meta">
            <p><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Ano-Base: <strong>${ano}</strong></p>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi-card">
            <div class="kpi-label">Atendimentos Concluídos</div>
            <div class="kpi-val" style="color: #5A4535;">${somaAtend}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Receita Realizada Total</div>
            <div class="kpi-val" style="color: #166534;">R$ ${somaRecReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Despesas Operacionais</div>
            <div class="kpi-val" style="color: #991b1b;">R$ ${somaDesp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Lucro Líquido Anual</div>
            <div class="kpi-val" style="color: ${somaLucro >= 0 ? '#166534' : '#991b1b'};">R$ ${somaLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <h3 style="font-size: 12pt; color: #5A4535; margin-bottom: 8px;">Consolidação Mensal (${ano})</h3>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th class="center">Atendimentos</th>
              <th class="right">Receitas Realizadas</th>
              <th class="right">Faturamento Previsto</th>
              <th class="right">Despesas</th>
              <th class="right">Lucro Líquido</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabelaHtml}
            <tr class="total-row">
              <td style="padding: 10px 12px;">TOTAL ANUAL</td>
              <td class="center" style="padding: 10px 12px;">${somaAtend}</td>
              <td class="right" style="padding: 10px 12px; color: #166534;">R$ ${somaRecReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td class="right" style="padding: 10px 12px; color: #4b5563;">R$ ${somaRecPrev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td class="right" style="padding: 10px 12px; color: #991b1b;">R$ ${somaDesp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td class="right" style="padding: 10px 12px; color: ${somaLucro >= 0 ? '#166534' : '#991b1b'}; font-size: 11pt;">R$ ${somaLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          Documento gerado automaticamente pelo Sistema Agenda & Gestão Inteligente ${nomeSalao} em ${new Date().toLocaleDateString('pt-BR')}.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col min-h-screen overflow-y-auto pb-24 md:pb-12 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-5">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Financeiro</h2>
          <p className="text-xs text-[#8C7A6B]">Visão detalhada de receitas, custos de operação e lucratividade líquida</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportarPdfAnual}
            className="flex items-center justify-center gap-1.5 bg-white border border-[#EFECE6] text-[#5A4535] hover:bg-[#FAF9F6] px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title={`Gerar Relatório Executivo em PDF do ano ${anoNum}`}
          >
            <Printer size={14} className="text-[#8C6D58]" />
            <span>Relatório Anual (PDF)</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportarExcelAnual}
            className="flex items-center justify-center gap-1.5 bg-white border border-[#EFECE6] text-[#166534] hover:bg-emerald-50 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title={`Baixar Planilha Excel com consolidado anual de ${anoNum}`}
          >
            <Download size={14} className="text-[#166534]" />
            <span>Planilha Anual (Excel)</span>
          </button>

          <button
            onClick={() => setDespesaModal(true)}
            className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Registrar Despesa</span>
          </button>
        </div>
      </div>

      {/* Navegação de Período & Filtro de Profissional */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alterarMes(-1)}
            className="p-1.5 text-[#8C7A6B] hover:text-[#5A4535] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#EFECE6]"
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold text-[#5A4535] bg-white border border-[#EFECE6] px-4 py-1.5 rounded-xl shadow-sm capitalize min-w-40 text-center">
            {nomeMesAtual}
          </span>
          <button 
            onClick={() => alterarMes(1)}
            className="p-1.5 text-[#8C7A6B] hover:text-[#5A4535] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#EFECE6]"
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>

          {mesSelecionadoStr !== mesHojeStr && (
            <button
              onClick={() => setMesSelecionadoStr(mesHojeStr)}
              className="text-[10px] font-bold text-[#8C6D58] bg-[#F6ECE8] hover:bg-[#ebdace] px-2.5 py-1.5 rounded-lg transition-colors ml-1"
              title="Voltar para o mês corrente"
            >
              Mês Atual
            </button>
          )}
        </div>

        {/* Filtro por Profissional (Solicitado pelo Usuário) */}
        <div className="flex items-center gap-2 bg-white border border-[#EFECE6] px-3.5 py-1.5 rounded-xl shadow-sm">
          <User size={15} className="text-[#8C6D58]" />
          <span className="text-[11px] font-bold text-[#8C7A6B] hidden sm:inline">Profissional:</span>
          <select
            value={profissionalFiltro}
            onChange={(e) => setProfissionalFiltro(e.target.value)}
            className="text-xs font-bold text-[#5A4535] bg-transparent outline-none cursor-pointer pr-1"
          >
            <option value="todas">Salão</option>
            {equipe.map(membro => (
              <option key={membro.id} value={membro.id}>
                {membro.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {/* KPI 1: Realizado */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Faturamento Realizado</span>
            <h3 className="text-sm font-extrabold text-[#4FA97A] mt-1.5">{formatarMoeda(receitasRealizadas)}</h3>
          </div>
        </div>

        {/* KPI 2: Previsto */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Previsto (Futuro)</span>
            <h3 className="text-sm font-extrabold text-[#5A4535] mt-1.5">{formatarMoeda(faturamentoPrevisto)}</h3>
          </div>
        </div>

        {/* KPI 3: Despesas */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Total Despesas</span>
            <h3 className="text-sm font-extrabold text-[#C81E1E] mt-1.5">{formatarMoeda(totalDespesasMes)}</h3>
          </div>
        </div>

        {/* KPI 4: Lucro Líquido */}
        <div className={`p-3.5 rounded-xl border shadow-sm flex flex-col justify-between ${
          lucroLiquido >= 0 ? 'bg-[#F2F8F4] border-[#DCEFE3]' : 'bg-[#FDF2F2] border-[#FDE2E2]'
        }`}>
          <div>
            <span className={`text-[9px] font-bold uppercase tracking-wider block ${
              lucroLiquido >= 0 ? 'text-[#2B7A4B]' : 'text-[#C81E1E]'
            }`}>Lucro Líquido</span>
            <h3 className={`text-sm font-extrabold mt-1.5 ${
              lucroLiquido >= 0 ? 'text-[#2B7A4B]' : 'text-[#C81E1E]'
            }`}>{formatarMoeda(lucroLiquido)}</h3>
          </div>
        </div>

        {/* KPI 5: Ticket Médio */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Ticket médio</span>
            <h3 className="text-sm font-extrabold text-[#5A4535] mt-1.5">{formatarMoeda(ticketMedio)}</h3>
          </div>
        </div>

        {/* KPI 6: Ocupação */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Ocupação</span>
            <h3 className="text-sm font-extrabold text-[#5A4535] mt-1.5">{taxaOcupacao}%</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Bar Chart & Right Info panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Left Side: Bar Chart Premium */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EFECE6] p-5 md:p-6 shadow-sm flex flex-col justify-between relative">
          {/* Header do Gráfico com Indicadores Dinâmicos Padronizados */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-[#FAF9F6] pb-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-[#8C6D58] shrink-0" />
                <h3 className="font-serif font-bold text-sm md:text-base text-[#5A4535]">Faturamento Realizado por Dia</h3>
              </div>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">
                Valores faturados dia a dia no mês de <span className="capitalize font-semibold text-[#5A4535]">{nomeMesAtual}</span>
              </p>
            </div>

            {/* Badges de Resumo e Destaque Padronizados */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {statsGrafico.diaPico && statsGrafico.diaPico.valor > 0 && (
                <div className="h-7 px-2.5 inline-flex items-center gap-1.5 bg-[#FBF6EE] border border-[#EEDBBA] text-[#8A6218] rounded-xl text-[11px] font-medium shadow-2xs whitespace-nowrap">
                  <Crown size={13} className="text-[#C9A227] shrink-0" />
                  <span>Pico: <strong className="font-bold">Dia {statsGrafico.diaPico.dia} ({formatarMoeda(statsGrafico.diaPico.valor)})</strong></span>
                </div>
              )}
              {statsGrafico.totalDiasAtivos > 0 && (
                <div className="h-7 px-2.5 inline-flex items-center gap-1.5 bg-[#F7F5F0] border border-[#E5DFD5] text-[#5A4535] rounded-xl text-[11px] font-medium shadow-2xs whitespace-nowrap">
                  <BarChart3 size={13} className="text-[#8C6D58] shrink-0" />
                  <span>Média: <strong className="font-bold">{formatarMoeda(statsGrafico.mediaPorDiaAtivo)}/dia</strong></span>
                </div>
              )}
            </div>
          </div>
          
          {/* Corpo do Gráfico com Eixo Y e Plot Separados */}
          <div className="flex gap-2 pt-4 pb-1">
            {/* Coluna do Eixo Y */}
            <div className="w-14 sm:w-16 shrink-0 flex flex-col justify-between text-right pr-2 select-none h-44 md:h-52">
              <span className="text-[9px] font-mono text-[#A39284] leading-none">{formatarMoeda(maxValorDia)}</span>
              <span className="text-[9px] font-mono text-[#A39284] leading-none">{formatarMoeda(maxValorDia * 0.5)}</span>
              <span className="text-[9px] font-mono text-[#A39284] leading-none">R$ 0,00</span>
            </div>

            {/* Área de Plotagem (Grid + Barras + Eixo X) */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Container das Barras e Linhas Guias */}
              <div className="relative h-44 md:h-52 flex items-end">
                {/* Linhas de Grade Horizontais */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                  <div className="border-t border-[#FAF2EB] w-full"></div>
                  <div className="border-t border-[#FAF2EB] border-dashed w-full"></div>
                  <div className="border-b border-[#EFECE6] w-full"></div>
                </div>

                {/* Linha pontilhada da média */}
                {statsGrafico.mediaPorDiaAtivo > 0 && maxValorDia > 0 && (
                  <div 
                    style={{ bottom: `${Math.min(92, Math.max(4, (statsGrafico.mediaPorDiaAtivo / maxValorDia) * 100))}%` }}
                    className="absolute inset-x-0 border-t border-amber-500/50 border-dashed pointer-events-none z-0"
                    title={`Média diária: ${formatarMoeda(statsGrafico.mediaPorDiaAtivo)}`}
                  />
                )}

                {/* Barras dos Dias */}
                <div className="flex items-end justify-between gap-0.5 sm:gap-1 w-full h-full relative z-10">
                  {faturamentoPorDia.map((item) => {
                    const heightPct = (item.valor / maxValorDia) * 100;
                    const isPico = item.valor > 0 && item.valor === statsGrafico.diaPico?.valor;
                    const isHovered = diaHover?.dia === item.dia;

                    return (
                      <div 
                        key={item.dia} 
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                        onMouseEnter={() => setDiaHover(item)}
                        onMouseLeave={() => setDiaHover(null)}
                        onClick={() => setDiaHover(diaHover?.dia === item.dia ? null : item)}
                      >
                        <div className="w-full flex justify-center items-end h-full relative">
                          {/* Tooltip Interativo Premium Ampliado e Bem Distribuído */}
                          {isHovered && (
                            <div className={`absolute bottom-full mb-2.5 bg-[#2D221A] text-white p-3.5 rounded-2xl shadow-2xl z-50 text-left min-w-[220px] md:min-w-[240px] animate-in fade-in zoom-in-95 pointer-events-none border border-[#5A4535] ${
                              item.diaNum > 20 ? 'right-0' : item.diaNum < 6 ? 'left-0' : 'left-1/2 -translate-x-1/2'
                            }`}>
                              {/* Header do Tooltip */}
                              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                                <span className="text-[11px] text-[#EFE7D8] font-bold">{item.diaSemanaCompleto}</span>
                                <span className="text-[10px] font-mono text-amber-300 font-bold">{item.dia}/{String(mesNum).padStart(2, '0')}</span>
                              </div>

                              {/* Faturamento e Atendimentos */}
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-base font-extrabold text-emerald-400 font-mono tracking-tight">
                                  {formatarMoeda(item.valor)}
                                </span>
                                <span className="text-[11px] text-stone-300 font-medium whitespace-nowrap">
                                  {item.qtdAtendimentos} {item.qtdAtendimentos === 1 ? 'atendimento' : 'atendimentos'}
                                </span>
                              </div>

                              {/* Badge de Pico do Mês */}
                              {isPico && (
                                <div className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-300 bg-amber-950/70 border border-amber-700/50 px-2 py-0.5 rounded-md">
                                  <span>★ Maior faturamento do mês</span>
                                </div>
                              )}

                              {/* Lista de Atendimentos Detalhada */}
                              {item.atendimentos && item.atendimentos.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-stone-200 space-y-1 max-h-32 overflow-hidden">
                                  {item.atendimentos.slice(0, 4).map((a, aIdx) => {
                                    const cli = clientes.find(c => c.id === a.cliente_id);
                                    return (
                                      <div key={aIdx} className="flex items-center justify-between gap-3">
                                        <span className="truncate text-stone-300">• {cli?.nome || 'Cliente'}</span>
                                        <span className="font-mono font-semibold text-emerald-300 shrink-0">{formatarMoeda(a.valor_total || 0)}</span>
                                      </div>
                                    );
                                  })}
                                  {item.atendimentos.length > 4 && (
                                    <div className="text-[9px] text-stone-400 italic pt-0.5">
                                      + {item.atendimentos.length - 4} outros atendimentos
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Barra com Gradiente e Destaque */}
                          <div 
                            style={{ height: `${item.valor > 0 ? Math.max(heightPct, 6) : 0}%` }} 
                            className={`w-full max-w-[12px] sm:max-w-[16px] rounded-t-md transition-all duration-300 ${
                              isPico
                                ? 'bg-gradient-to-t from-[#8C6D58] via-[#B8977E] to-[#E5C378] shadow-[0_0_8px_rgba(229,195,120,0.5)] group-hover:brightness-110'
                                : item.valor > 0
                                ? 'bg-gradient-to-t from-[#8C6D58] to-[#AA8B75] group-hover:from-[#725743] group-hover:to-[#967761]'
                                : 'bg-transparent'
                            } ${isHovered ? 'scale-x-110 brightness-110 ring-2 ring-[#8C6D58]/40' : ''}`}
                          >
                            {isPico && (
                              <div className="w-full flex justify-center -mt-2">
                                <span className="text-[8px] text-[#C9A227]">★</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rótulo do Dia no Eixo X (Abaixo da linha de base!) */}
              <div className="flex justify-between gap-0.5 sm:gap-1 w-full pt-1.5">
                {faturamentoPorDia.map((item) => {
                  const isPico = item.valor > 0 && item.valor === statsGrafico.diaPico?.valor;
                  const isHovered = diaHover?.dia === item.dia;
                  return (
                    <div key={item.dia} className="flex-1 flex flex-col items-center">
                      <span className={`text-[8px] sm:text-[9px] font-bold tracking-tight ${
                        isHovered ? 'text-[#5A4535] font-black' : isPico ? 'text-[#8A6218]' : item.isFimDeSemana ? 'text-[#B3A295]' : 'text-[#8C7A6B]'
                      }`}>
                        {item.dia}
                      </span>
                      <span className="text-[7px] text-[#B8A89A] uppercase hidden sm:block">
                        {item.diaSemana[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rodapé explicativo do gráfico */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-[#8C7A6B] pt-3 border-t border-[#FAF9F6] mt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-t from-[#8C6D58] to-[#AA8B75]"></span>
                <span>Faturamento diário</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-t from-[#8C6D58] via-[#B8977E] to-[#E5C378]"></span>
                <span>Pico do mês (★)</span>
              </span>
            </div>
            <span className="text-[10px] text-[#8C7A6B] italic">
              Passe o mouse ou toque sobre as barras para ver detalhes
            </span>
          </div>
        </div>

        {/* Right Side Info: Taxas & Rentabilidade */}
        <div className="flex flex-col gap-4">
          {/* Taxas do Período */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#FAF9F6] pb-2">
              <h3 className="font-serif font-bold text-sm text-[#5A4535]">Taxas do Período</h3>
              <span className="text-[10px] font-bold text-[#8C7A6B] bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#EFECE6]">
                {agendamentosMes.length} {agendamentosMes.length === 1 ? 'agendamento' : 'agendamentos'}
              </span>
            </div>
            <div className="space-y-3 text-xs text-[#5A4535]">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4FA97A]"></span>
                    <span>Confirmação / Conclusão</span>
                  </span>
                  <span className="font-bold text-[#2B7A4B]">{taxaConfirmacao}% <span className="text-[10px] font-normal text-[#8C7A6B]">({confCount})</span></span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6] overflow-hidden">
                  <div style={{ width: `${taxaConfirmacao}%` }} className="bg-[#4FA97A] h-full rounded-full transition-all duration-500"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C81E1E]"></span>
                    <span>Falta (Não compareceu)</span>
                  </span>
                  <span className="font-bold text-[#C81E1E]">{taxaFalta}% <span className="text-[10px] font-normal text-[#8C7A6B]">({faltaCount})</span></span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6] overflow-hidden">
                  <div style={{ width: `${taxaFalta}%` }} className="bg-[#C81E1E] h-full rounded-full transition-all duration-500"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                    <span>Cancelamentos</span>
                  </span>
                  <span className="font-bold text-stone-600">{taxaCancelamento}% <span className="text-[10px] font-normal text-[#8C7A6B]">({cancCount})</span></span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6] overflow-hidden">
                  <div style={{ width: `${taxaCancelamento}%` }} className="bg-stone-400 h-full rounded-full transition-all duration-500"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Serviços e Planos VIP mais rentáveis */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-3.5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#FAF9F6] pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Flame size={16} className="text-[#D37F64]" />
                  <h3 className="font-serif font-bold text-sm text-[#5A4535]">Mais Rentáveis</h3>
                </div>
                <span className="text-[10px] font-bold text-[#8C6D58] bg-[#F8F2ED] px-2 py-0.5 rounded-md border border-[#EFE5DC]">
                  Top {Math.min(servicosMaisRentaveis.length, 5)}
                </span>
              </div>
              <div className="space-y-3 text-xs">
                {servicosMaisRentaveis.slice(0, 5).map((item, idx) => {
                  const barPct = maxTotalServico > 0 ? (item.total / maxTotalServico) * 100 : 0;
                  return (
                    <div key={item.id || idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[#5A4535] gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-4 text-[10px] font-bold text-[#8C7A6B] shrink-0">{idx + 1}.</span>
                          <span className="text-[#5A4535] font-semibold truncate text-[11px]" title={item.nome}>
                            {item.nome}
                          </span>
                          {item.isVip && (
                            <span className="bg-amber-100/80 text-amber-800 border border-amber-200 text-[8px] font-bold px-1.5 py-0.2 rounded shrink-0">
                              VIP
                            </span>
                          )}
                          <span className="text-[10px] text-[#8C7A6B] shrink-0 font-normal">
                            ({item.quantidade}x)
                          </span>
                        </div>
                        <span className="font-extrabold text-[#5A4535] shrink-0 text-xs">
                          {formatarMoeda(item.total)}
                        </span>
                      </div>
                      <div className="w-full bg-[#FAF9F6] rounded-full h-1.5 border border-[#EFECE6] overflow-hidden">
                        <div 
                          style={{ width: `${barPct}%` }} 
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.isVip 
                              ? 'bg-gradient-to-r from-[#D4AF37] to-[#8C6D58]' 
                              : 'bg-gradient-to-r from-[#8C6D58] to-[#AA8B75]'
                          }`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {servicosMaisRentaveis.length === 0 && (
                  <p className="text-xs text-[#8C7A6B] italic text-center py-4">Nenhum serviço ou plano faturado no período.</p>
                )}
              </div>
            </div>

            {servicosMaisRentaveis.length > 5 && (
              <p className="text-[10px] text-[#8C7A6B] text-center italic pt-2 border-t border-[#FAF9F6]">
                + {servicosMaisRentaveis.length - 5} outros itens faturados no mês
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pagamentos Pendentes, Extrato de Despesas & Comissões (Bottom Tabs) */}
      <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm flex flex-col min-h-[220px] max-h-[380px] shrink-0 mb-6 overflow-hidden">
        <div className="flex border-b border-[#EFECE6] mb-3 gap-3">
          <button
            onClick={() => setFinanceTab('pendentes')}
            className={`pb-2 text-xs font-bold border-b-2 transition-all ${
              financeTab === 'pendentes' ? 'border-[#8C6D58] text-[#8C6D58]' : 'border-transparent text-[#8C7A6B]'
            }`}
          >
            Pagamentos Pendentes ({pagamentosPendentes.length})
          </button>
          <button
            onClick={() => setFinanceTab('despesas')}
            className={`pb-2 text-xs font-bold border-b-2 transition-all ${
              financeTab === 'despesas' ? 'border-[#8C6D58] text-[#8C6D58]' : 'border-transparent text-[#8C7A6B]'
            }`}
          >
            Extrato de Despesas ({despesasMes.length})
          </button>
          <button
            onClick={() => setFinanceTab('comissoes')}
            className={`pb-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              financeTab === 'comissoes' ? 'border-[#8C6D58] text-[#8C6D58]' : 'border-transparent text-[#8C7A6B]'
            }`}
          >
            <Percent size={13} />
            <span>Comissões & Repasses (Salão-Parceiro)</span>
          </button>
        </div>
        
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {/* TAB 1: PENDENTES */}
          {financeTab === 'pendentes' && (
            <>
              {pagamentosPendentes.map((p: any) => {
                const agend = agendamentos.find(a => a.id === p.agendamento_id);
                const client = clientes.find(c => c.id === agend?.cliente_id);
                
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#5A4535]">{client?.nome}</span>
                      <span className="text-[10px] text-[#8C7A6B] mt-0.5">
                        {agend ? new Date(agend.inicio).toLocaleDateString('pt-BR') : ''} às {agend ? agend.inicio.split('T')[1].substring(0, 5) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-[#5A4535]">{formatarMoeda(p.valor)}</span>
                      <button
                        onClick={() => {
                          confirmarAcao({
                            titulo: 'Confirmar Pagamento',
                            mensagem: `Confirmar recebimento do pagamento de ${client?.nome || 'Cliente'} no valor de ${formatarMoeda(p.valor)}?`,
                            tipo: 'sucesso',
                            textoConfirmar: 'Confirmar',
                            textoCancelar: 'Voltar',
                            onConfirm: () => {
                              confirmarSinal(p.agendamento_id, p.valor, 'pix');
                              marcarAvisoComoLido(p.agendamento_id);
                            }
                          });
                        }}
                        className="bg-white hover:bg-[#8C6D58] border border-[#8C6D58] text-[#8C6D58] hover:text-white px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                );
              })}
              {pagamentosPendentes.length === 0 && (
                <p className="text-xs text-[#8C7A6B] text-center py-4 italic">Nenhum pagamento pendente no momento.</p>
              )}
            </>
          )}

          {/* TAB 2: EXTRATO DESPESAS */}
          {financeTab === 'despesas' && (
            <>
              {profissionalFiltro !== 'todas' && (
                taxaComissaoProfFiltro < 100 ? (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 mb-3 flex items-start gap-2.5 shadow-2xs">
                    <ShieldCheck size={17} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900">Custos Operacionais Exclusivos do Salão (Despesa: R$ 0,00)</p>
                      <p className="text-[11px] text-emerald-800 leading-snug mt-0.5">
                        Como <strong>{profSelecionadaFiltro?.nome}</strong> possui repasse comissionado ({taxaComissaoProfFiltro}%), as despesas operacionais do salão ({formatarMoeda(totalDespesasGerais)}) são custeadas pela cota-parte retida pelo salão e não recaem sobre a profissional.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 mb-3 flex items-start gap-2.5 shadow-2xs">
                    <ShieldCheck size={17} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">Rateio de Despesas do Salão ({formatarMoeda(totalDespesasMes)} por profissional)</p>
                      <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                        Como <strong>{profSelecionadaFiltro?.nome}</strong> recebe 100% da receita dos atendimentos, as despesas do salão ({formatarMoeda(totalDespesasGerais)}) são divididas igualmente entre as {totalProfsAtivas} profissionais ativas.
                      </p>
                    </div>
                  </div>
                )
              )}

              {despesasMes.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#5A4535]">{d.descricao}</span>
                      <span className="text-[8px] bg-red-50 text-red-600 border border-red-100 font-bold px-1.5 py-0.2 rounded-md">
                        {d.categoria}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8C7A6B] mt-0.5">
                      Paga em: {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-red-600">-{formatarMoeda(d.valor)}</span>
                    <button
                      onClick={() => handleExcluirDespesa(d.id)}
                      className="p-1.5 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors border border-[#EFECE6] hover:border-red-200 bg-white"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {despesasMes.length === 0 && (
                <p className="text-xs text-[#8C7A6B] text-center py-4 italic">Nenhuma despesa registrada neste mês.</p>
              )}
            </>
          )}

          {/* TAB 3: COMISSÕES E REPASSES (LEI DO SALÃO-PARCEIRO) */}
          {financeTab === 'comissoes' && (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DFC8] flex items-center justify-between text-xs text-[#5A4535]">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#8C6D58]" />
                  <span>
                    <strong>Cálculo Automático (Lei nº 13.352/2016):</strong> A comissão líquida a pagar considera exclusivamente atendimentos <strong>concluídos</strong> no período, discriminando a cota-parte do salão.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(profissionalFiltro === 'todas' 
                  ? comissoesPorProfissional 
                  : comissoesPorProfissional.filter(item => item.profissional.id === profissionalFiltro)
                ).map((item) => (
                  <div key={item.profissional.id} className="p-3.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
                      <div>
                        <h4 className="font-bold text-sm text-[#5A4535] flex items-center gap-1.5">
                          <User size={14} className="text-[#8C6D58]" />
                          {item.profissional.nome}
                        </h4>
                        <span className="text-[10px] text-[#8C7A6B]">
                          {item.totalAtendimentos} atendimento(s) concluídos em {nomeMesAtual}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F6ECE8] text-[#8C6D58] border border-[#EFECE6]">
                        {item.taxaPct}% Comissão
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-2 bg-white rounded-lg border border-[#EFECE6]">
                        <span className="text-[#8C7A6B] block">Faturado Bruto</span>
                        <strong className="text-[#5A4535] text-xs">{formatarMoeda(item.faturamentoBruto)}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-[#EFECE6]">
                        <span className="text-[#8C6D58] block">Cota do Salão</span>
                        <strong className="text-[#8C6D58] text-xs">{formatarMoeda(item.cotaSalao)}</strong>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <span className="text-emerald-800 block font-semibold">Comissão Devida</span>
                        <strong className="text-emerald-700 text-xs">{formatarMoeda(item.valorComissaoBruta)}</strong>
                      </div>
                    </div>

                    {item.totalPrevistos > 0 && (
                      <div className="p-2 bg-amber-50/70 border border-amber-200/70 rounded-lg flex items-center justify-between text-[10.5px] text-amber-900">
                        <span className="flex items-center gap-1">
                          <span>🔮</span>
                          <span><strong>Previsão de Agendados:</strong> {item.totalPrevistos} confirmado(s)</span>
                        </span>
                        <span className="font-bold text-amber-800">
                          +{formatarMoeda(item.comissaoPrevista)} (após conclusão)
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 w-full">
                      {item.fechamentoExistente ? (
                        <div className="flex items-center justify-between w-full bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                            <Check size={14} className="text-emerald-600" />
                            <span>Repasse Registrado e Pago</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              confirmarAcao({
                                titulo: 'Estornar Repasse de Comissão',
                                mensagem: `Deseja desfazer o fechamento de comissão de ${item.profissional.nome}? A despesa lançada no fluxo de caixa será removida e o repasse voltará a ficar pendente.`,
                                tipo: 'aviso',
                                textoConfirmar: 'Estornar Repasse',
                                textoCancelar: 'Cancelar',
                                onConfirm: () => {
                                  if (item.fechamentoExistente) {
                                    deleteFechamentoComissao(item.fechamentoExistente.id);
                                  }
                                }
                              });
                            }}
                            className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 font-bold hover:underline transition-all"
                            title="Estornar repasse e reabrir pendência"
                          >
                            <RotateCcw size={12} />
                            <span>Estornar / Reabrir</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={item.valorComissaoBruta <= 0}
                          onClick={() => handleFecharComissao(item)}
                          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            item.valorComissaoBruta > 0
                              ? 'bg-[#8C6D58] hover:bg-[#725743] text-white active:scale-98'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Wallet size={13} />
                          <span>Fechar e Pagar Repasse ({formatarMoeda(item.valorComissaoBruta)})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL REGISTRAR DESPESA --- */}
      {despesaModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setDespesaModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#EFECE6] p-6 pb-3">
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">Registrar Despesa</h3>
              <button 
                onClick={() => setDespesaModal(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <XCircle size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarDespesa} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Descrição / Produto</label>
                  <input 
                    type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Cabine UV LED / Aluguel da mesa..."
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Categoria</label>
                      <select
                        value={categoria} onChange={(e) => {
                          setCategoria(e.target.value);
                          if (e.target.value === 'nova') {
                            setShowNovaCat(true);
                          } else {
                            setShowNovaCat(false);
                          }
                        }}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                      >
                        {categoriasDespesa.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="nova">+ Nova Categoria</option>
                      </select>
                    </div>
                  </div>

                  {showNovaCat && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Nome da Nova Categoria</label>
                      <input 
                        type="text" required placeholder="Ex: Combustível, Faxina..."
                        value={novaCatNome} onChange={(e) => setNovaCatNome(e.target.value)}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none focus:border-[#8C6D58]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Valor Gasto (R$)</label>
                      <input 
                        type="number" required min={0.01} step="0.01"
                        value={valorDespesa || ''} onChange={(e) => setValorDespesa(Number(e.target.value))}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Data do Gasto</label>
                      <input 
                        type="date" required value={dataDespesa} onChange={(e) => setDataDespesa(e.target.value)}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] p-6 bg-white rounded-b-2xl shrink-0">
                <button
                  type="button" onClick={() => setDespesaModal(false)}
                  className="px-4 py-2.5 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Registrar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
