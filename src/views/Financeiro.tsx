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
  Printer
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { MetodoPagamento } from '../types';

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
    configSalao
  } = useAppState();

  const [profissionalFiltro, setProfissionalFiltro] = useState<string>('todas');

  const [busca, setBusca] = useState('');
  const [despesaModal, setDespesaModal] = useState(false);
  const [financeTab, setFinanceTab] = useState<'pendentes' | 'despesas' | 'comissoes'>('pendentes');

  // Keyboard Escape listener to close modal in Financeiro.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && despesaModal) {
        setDespesaModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const agendamentosMes = agendamentos.filter(a => {
    const matchMes = a.inicio.startsWith(mesSelecionadoStr);
    if (!matchMes) return false;
    if (profissionalFiltro !== 'todas') {
      return a.profissional_id === profissionalFiltro;
    }
    return true;
  });
  const concluidosMes = agendamentosMes.filter(a => a.status === 'concluido');

  // 1. Receitas Realizadas (KPI Box 1 - Atendimentos Concluídos)
  const receitasRealizadas = concluidosMes.reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);

  // 2. Faturamento Previsto (KPI Box 2 - Confirmados + Pendentes)
  const faturamentoPrevisto = agendamentosMes
    .filter(a => a.status === 'confirmado' || a.status === 'pendente')
    .reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);

  // 3. Despesas Totais do Mês (KPI Box 3)
  const totalDespesasMes = despesas
    .filter(d => d.data.startsWith(mesSelecionadoStr))
    .reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

  // 4. Lucro Líquido (KPI Box 4)
  const lucroLiquido = receitasRealizadas - totalDespesasMes;

  // 5. Ticket Médio (KPI Box 5)
  const ticketMedio = concluidosMes.length > 0 ? (receitasRealizadas / concluidosMes.length) : 0;

  // 6. Ocupação Real (KPI Box 6)
  const totalMinutosAgendados = agendamentosMes
    .filter(a => a.status !== 'cancelado' && a.status !== 'falta' && a.status !== 'bloqueado')
    .reduce((acc, a) => {
      const diffMs = new Date(a.fim).getTime() - new Date(a.inicio).getTime();
      return acc + Math.floor(diffMs / (60 * 1000));
    }, 0);
  const expedienteMinutosMes = 22 * 540; // ~22 dias úteis de 9 horas
  const taxaOcupacao = Math.min(100, Math.round((totalMinutosAgendados / expedienteMinutosMes) * 100));

  // --- GRAFICO: Faturamento realizado por dia no mês selecionado ---
  const anoNum = Number(mesSelecionadoStr.split('-')[0]);
  const mesNum = Number(mesSelecionadoStr.split('-')[1]);
  const diasNoMes = new Date(anoNum, mesNum, 0).getDate();

  const faturamentoPorDia = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = String(i + 1).padStart(2, '0');
    const dataDiaStr = `${mesSelecionadoStr}-${dia}`;
    const valorDia = concluidosMes
      .filter(a => a.inicio.startsWith(dataDiaStr))
      .reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);
    return { dia, valor: valorDia };
  });

  const maxValorDia = Math.max(...faturamentoPorDia.map(d => d.valor), 1);

  // --- TAXAS DO PERÍODO ---
  const totalAgends = agendamentosMes.length || 1;
  const confCount = agendamentosMes.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
  const faltaCount = agendamentosMes.filter(a => a.status === 'falta').length;
  const cancCount = agendamentosMes.filter(a => a.status === 'cancelado').length;

  const taxaConfirmacao = Math.round((confCount / totalAgends) * 100);
  const taxaFalta = Math.round((faltaCount / totalAgends) * 100);
  const taxaCancelamento = Math.round((cancCount / totalAgends) * 100);

  // --- SERVIÇOS MAIS RENTÁVEIS ---
  const faturamentoPorServicoMap: { [key: string]: { nome: string; quantidade: number; total: number } } = {};
  
  concluidosMes.forEach(a => {
    const servs = obterServicosDeAgendamento(a.id);
    servs.forEach(s => {
      if (!faturamentoPorServicoMap[s.id]) {
        faturamentoPorServicoMap[s.id] = { nome: s.nome, quantidade: 0, total: 0 };
      }
      faturamentoPorServicoMap[s.id].quantidade += 1;
      faturamentoPorServicoMap[s.id].total += s.preco;
    });
  });

  const servicosMaisRentaveis = Object.values(faturamentoPorServicoMap)
    .sort((a, b) => b.total - a.total);

  // --- PAGAMENTOS PENDENTES ---
  // Inclui todos os agendamentos que estão com status 'pendente' (A Confirmar) no mês selecionado
  const pagamentosPendentes = useMemo(() => {
    // 1. Agendamentos pendentes deste mês
    const agendamentosPendentesMes = agendamentos.filter(a => {
      const matchMes = a.inicio?.startsWith(mesSelecionadoStr);
      const isPendente = a.status === 'pendente';
      if (!matchMes || !isPendente) return false;
      if (profissionalFiltro !== 'todas') {
        return a.profissional_id === profissionalFiltro;
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
        if (profissionalFiltro !== 'todas' && agend.profissional_id !== profissionalFiltro) {
          return;
        }
        lista.push(p);
      }
    });

    return lista;
  }, [agendamentos, pagamentos, mesSelecionadoStr, profissionalFiltro]);

  const despesasMes = despesas.filter(d => d.data.startsWith(mesSelecionadoStr));

  // --- CÁLCULO DE COMISSÕES E REPASSES (LEI DO SALÃO-PARCEIRO) ---
  const comissoesPorProfissional = useMemo(() => {
    return equipe.filter(u => u.ativo).map(prof => {
      const ags = agendamentos.filter(a => 
        a.profissional_id === prof.id && 
        (a.status === 'concluido' || a.status === 'confirmado') && 
        a.inicio.startsWith(mesSelecionadoStr)
      );
      const faturamentoBruto = ags.reduce((acc, a) => acc + (a.valor_total || 0), 0);
      const taxaPct = prof.comissao_padrao_porcentagem !== undefined ? prof.comissao_padrao_porcentagem : 50;
      const valorComissaoBruta = (faturamentoBruto * taxaPct) / 100;
      const cotaSalao = faturamentoBruto - valorComissaoBruta;
      const fechamentoExistente = fechamentosComissao.find(f => 
        f.profissional_id === prof.id && 
        f.periodo_inicio.startsWith(mesSelecionadoStr)
      );

      return {
        profissional: prof,
        totalAtendimentos: ags.length,
        faturamentoBruto,
        taxaPct,
        valorComissaoBruta,
        cotaSalao,
        fechamentoExistente
      };
    });
  }, [equipe, agendamentos, mesSelecionadoStr, fechamentosComissao]);

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
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
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
            <option value="todas">Todas as Profissionais (Geral)</option>
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-hidden pb-6">
        {/* Left Side: Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm flex flex-col h-full overflow-hidden">
          <h3 className="font-serif font-bold text-sm text-[#5A4535] mb-6">Faturamento realizado por dia</h3>
          
          <div className="flex-1 flex items-end justify-between gap-1 pt-6 border-b border-[#EFECE6] pb-2 px-2 relative min-h-[140px]">
            <div className="absolute inset-x-0 top-1/4 border-t border-[#FAF9F6] border-dashed"></div>
            <div className="absolute inset-x-0 top-2/4 border-t border-[#FAF9F6] border-dashed"></div>
            <div className="absolute inset-x-0 top-3/4 border-t border-[#FAF9F6] border-dashed"></div>

            {faturamentoPorDia.map((item) => {
              const heightPct = (item.valor / maxValorDia) * 100;
              return (
                <div key={item.dia} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex justify-center items-end h-full relative">
                    {item.valor > 0 && (
                      <span className="absolute bottom-full mb-1 bg-[#5A4535] text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow">
                        {formatarMoeda(item.valor)}
                      </span>
                    )}
                    <div 
                      style={{ height: `${item.valor > 0 ? Math.max(heightPct, 5) : 0}%` }} 
                      className="w-full max-w-[12px] bg-[#8C6D58] rounded-t-sm transition-all animate-fade-in"
                    ></div>
                  </div>
                  <span className="text-[8px] font-bold text-[#8C7A6B] tracking-tight">{item.dia}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Info: Taxas & Rentabilidade */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Taxas do Período */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-1.5">Taxas do período</h3>
            <div className="space-y-3 text-xs text-[#5A4535]">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Confirmação</span>
                  <span>{taxaConfirmacao}%</span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6]">
                  <div style={{ width: `${taxaConfirmacao}%` }} className="bg-[#4FA97A] h-full rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Falta</span>
                  <span>{taxaFalta}%</span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6]">
                  <div style={{ width: `${taxaFalta}%` }} className="bg-[#C81E1E] h-full rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Cancelamento</span>
                  <span>{taxaCancelamento}%</span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6]">
                  <div style={{ width: `${taxaCancelamento}%` }} className="bg-gray-400 h-full rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Serviços mais rentáveis */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-1.5">Serviços mais rentáveis</h3>
            <div className="space-y-2.5 text-xs">
              {servicosMaisRentaveis.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[#5A4535]">
                  <span className="text-[#8C7A6B]">
                    {idx + 1}. {item.nome} <strong className="text-[#5A4535]">({item.quantidade}x)</strong>
                  </span>
                  <span className="font-extrabold">{formatarMoeda(item.total)}</span>
                </div>
              ))}
              {servicosMaisRentaveis.length === 0 && (
                <p className="text-xs text-[#8C7A6B] italic text-center">Nenhum serviço realizado ainda.</p>
              )}
            </div>
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
                    <strong>Cálculo Automático (Lei nº 13.352/2016):</strong> Discrimina a cota-parte do salão da comissão líquida a pagar para cada profissional parceira.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comissoesPorProfissional.map((item) => (
                  <div key={item.profissional.id} className="p-3.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
                      <div>
                        <h4 className="font-bold text-sm text-[#5A4535] flex items-center gap-1.5">
                          <User size={14} className="text-[#8C6D58]" />
                          {item.profissional.nome}
                        </h4>
                        <span className="text-[10px] text-[#8C7A6B]">
                          {item.totalAtendimentos} atendimento(s) realizados em {nomeMesAtual}
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
