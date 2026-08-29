import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { MetodoPagamento } from '../types';

interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
}

export const Financeiro: React.FC = () => {
  const { 
    agendamentos, 
    clientes, 
    pagamentos, 
    servicos,
    obterServicosDeAgendamento,
    confirmarSinal
  } = useAppState();

  const [busca, setBusca] = useState('');
  const [despesaModal, setDespesaModal] = useState(false);
  
  // Form Despesa Fields
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('material');
  const [valorDespesa, setValorDespesa] = useState(0);
  const [dataDespesa, setDataDespesa] = useState('2026-08-29');

  // Estado de Despesas
  const [despesas, setDespesas] = useState<Despesa[]>(() => {
    const saved = localStorage.getItem('nail_despesas');
    return saved ? JSON.parse(saved) : [
      { id: 'd1', descricao: 'Gel UV X&D e Tips de unha', categoria: 'material', valor: 85, data: '2026-08-24' },
      { id: 'd2', descricao: 'Esmaltes novos tons nude', categoria: 'material', valor: 60, data: '2026-08-26' },
      { id: 'd3', descricao: 'Lixas banana e luvas desc.', categoria: 'material', valor: 45, data: '2026-08-28' }
    ];
  });

  const saveDespesas = (novasDespesas: Despesa[]) => {
    setDespesas(novasDespesas);
    localStorage.setItem('nail_despesas', JSON.stringify(novasDespesas));
  };

  const handleSalvarDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || valorDespesa <= 0) return;

    const nova: Despesa = {
      id: 'd_' + Math.random().toString(36).substring(2, 9),
      descricao,
      categoria,
      valor: valorDespesa,
      data: dataDespesa
    };

    saveDespesas([...despesas, nova]);
    setDescricao('');
    setValorDespesa(0);
    setDespesaModal(false);
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // --- FILTROS DE PERÍODO (Agosto 2026) ---
  const agendamentosAgosto = agendamentos.filter(a => a.inicio.startsWith('2026-08'));
  const pagamentosAgosto = pagamentos.filter(p => p.data_pagamento.startsWith('2026-08'));
  
  // 1. Realizado (KPI Box 1)
  // Receitas Realizadas (concluídos + sinais pagos)
  const receitasRealizadas = pagamentosAgosto
    .filter(p => p.status === 'pago' || p.status === 'sinal pago')
    .reduce((acc, p) => acc + p.valor, 0);

  // 2. Previsto (KPI Box 2)
  // Total dos agendamentos confirmados e pendentes futuros
  const faturamentoPrevisto = agendamentosAgosto
    .filter(a => a.status === 'confirmado' || a.status === 'pendente')
    .reduce((acc, a) => acc + a.valor_total, 0);

  // 3. Cancelado (KPI Box 3)
  const faturamentoCancelado = agendamentosAgosto
    .filter(a => a.status === 'cancelado')
    .reduce((acc, a) => acc + a.valor_total, 0);

  // 4. Perdido (falta) (KPI Box 4)
  const faturamentoPerdido = agendamentosAgosto
    .filter(a => a.status === 'falta')
    .reduce((acc, a) => acc + a.valor_total, 0);

  // 5. Ticket Médio (KPI Box 5)
  const concluidosAgosto = agendamentosAgosto.filter(a => a.status === 'concluido');
  const ticketMedio = concluidosAgosto.length > 0 ? (receitasRealizadas / concluidosAgosto.length) : 0;

  // 6. Ocupação (KPI Box 6) - 8% conforme a imagem do cliente
  const taxaOcupacao = 8;

  // --- GRAFICO: Faturamento realizado por dia ---
  const faturamentoPorDia = Array.from({ length: 31 }, (_, i) => {
    const dia = String(i + 1).padStart(2, '0');
    const dataDiaStr = `2026-08-${dia}`;
    const valorDia = pagamentosAgosto
      .filter(p => p.data_pagamento.startsWith(dataDiaStr) && (p.status === 'pago' || p.status === 'sinal pago'))
      .reduce((acc, p) => acc + p.valor, 0);
    return { dia, valor: valorDia };
  });

  const maxValorDia = Math.max(...faturamentoPorDia.map(d => d.valor), 1);

  // --- TAXAS DO PERÍODO ---
  const totalAgends = agendamentosAgosto.length || 1;
  const confCount = agendamentosAgosto.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
  const faltaCount = agendamentosAgosto.filter(a => a.status === 'falta').length;
  const cancCount = agendamentosAgosto.filter(a => a.status === 'cancelado').length;

  const taxaConfirmacao = Math.round((confCount / totalAgends) * 100);
  const taxaFalta = Math.round((faltaCount / totalAgends) * 100);
  const taxaCancelamento = Math.round((cancCount / totalAgends) * 100);

  // --- SERVIÇOS MAIS RENTÁVEIS ---
  // Mapear faturamento por serviço
  const faturamentoPorServicoMap: { [key: string]: { nome: string; quantidade: number; total: number } } = {};
  
  concluidosAgosto.forEach(a => {
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
  const pagamentosPendentes = pagamentosAgosto.filter(p => p.status === 'pendente');

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-5">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Financeiro</h2>
          <p className="text-xs text-[#8C7A6B]">Visão de receitas, custos e taxas de ocupação</p>
        </div>
        <button
          onClick={() => setDespesaModal(true)}
          className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Registrar Despesa</span>
        </button>
      </div>

      {/* Navegação de Período (Agosto De 2026) */}
      <div className="flex items-center gap-3 mb-5">
        <button className="p-1 text-[#8C7A6B] hover:text-[#5A4535]">
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs font-bold text-[#5A4535] bg-white border border-[#EFECE6] px-3.5 py-1.5 rounded-xl shadow-sm">
          Agosto De 2026
        </span>
        <button className="p-1 text-[#8C7A6B] hover:text-[#5A4535]">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* KPIs Grid (LIKE IMAGE 5) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        
        {/* KPI 1: Realizado */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Realizado</span>
            <h3 className="text-sm font-extrabold text-[#5A4535] mt-1.5">{formatarMoeda(receitasRealizadas)}</h3>
          </div>
        </div>

        {/* KPI 2: Previsto */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Previsto</span>
            <h3 className="text-sm font-extrabold text-[#5A4535] mt-1.5">{formatarMoeda(faturamentoPrevisto)}</h3>
          </div>
        </div>

        {/* KPI 3: Cancelado */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Cancelado</span>
            <h3 className="text-sm font-extrabold text-[#8C7A6B] mt-1.5">{formatarMoeda(faturamentoCancelado)}</h3>
          </div>
        </div>

        {/* KPI 4: Perdido (falta) */}
        <div className="bg-white p-3.5 rounded-xl border border-[#EFECE6] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">Perdido (falta)</span>
            <h3 className="text-sm font-extrabold text-[#8C7A6B] mt-1.5">{formatarMoeda(faturamentoPerdido)}</h3>
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
        
        {/* Left Side: Bar Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm flex flex-col h-full overflow-hidden">
          <h3 className="font-serif font-bold text-sm text-[#5A4535] mb-6">Faturamento realizado por dia</h3>
          
          <div className="flex-1 flex items-end justify-between gap-1 pt-6 border-b border-[#EFECE6] pb-2 px-2 relative min-h-[160px]">
            {/* Linhas horizontais de referência */}
            <div className="absolute inset-x-0 top-1/4 border-t border-[#FAF9F6] border-dashed"></div>
            <div className="absolute inset-x-0 top-2/4 border-t border-[#FAF9F6] border-dashed"></div>
            <div className="absolute inset-x-0 top-3/4 border-t border-[#FAF9F6] border-dashed"></div>

            {faturamentoPorDia.map((item) => {
              const heightPct = (item.valor / maxValorDia) * 100;
              return (
                <div key={item.dia} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex justify-center items-end h-full relative">
                    {/* Tooltip Hover */}
                    {item.valor > 0 && (
                      <span className="absolute bottom-full mb-1 bg-[#5A4535] text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow">
                        {formatarMoeda(item.valor)}
                      </span>
                    )}
                    {/* Bar */}
                    <div 
                      style={{ height: `${item.valor > 0 ? Math.max(heightPct, 5) : 0}%` }} 
                      className={`w-full max-w-[12px] bg-[#8C6D58] rounded-t-sm transition-all`}
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
              {/* Confirmação */}
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Confirmação</span>
                  <span>{taxaConfirmacao}%</span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6]">
                  <div 
                    style={{ width: `${taxaConfirmacao}%` }} 
                    className="bg-[#4FA97A] h-full rounded-full"
                  ></div>
                </div>
              </div>

              {/* Falta */}
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Falta</span>
                  <span>{taxaFalta}%</span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6]">
                  <div 
                    style={{ width: `${taxaFalta}%` }} 
                    className="bg-[#C81E1E] h-full rounded-full"
                  ></div>
                </div>
              </div>

              {/* Cancelamento */}
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Cancelamento</span>
                  <span>{taxaCancelamento}%</span>
                </div>
                <div className="w-full bg-[#FAF9F6] rounded-full h-2 border border-[#EFECE6]">
                  <div 
                    style={{ width: `${taxaCancelamento}%` }} 
                    className="bg-gray-400 h-full rounded-full"
                  ></div>
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

      {/* Pagamentos Pendentes (Bottom Panel) */}
      <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm flex flex-col max-h-[140px] shrink-0 mb-6">
        <h3 className="font-serif font-bold text-sm text-[#5A4535] mb-2 border-b border-[#FAF9F6] pb-1.5">Pagamentos pendentes</h3>
        
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {pagamentosPendentes.map((p) => {
            const agend = agendamentos.find(a => a.id === p.agendamento_id);
            const client = clientes.find(c => c.id === agend?.cliente_id);
            
            return (
              <div 
                key={p.id} 
                className="flex items-center justify-between p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-[#5A4535]">{client?.nome}</span>
                  <span className="text-[10px] text-[#8C7A6B] mt-0.5">
                    {agend ? new Date(agend.inicio).toLocaleDateString('pt-BR') : ''} às {agend ? agend.inicio.split('T')[1].substring(0, 5) : ''}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-[#5A4535]">{formatarMoeda(p.valor)}</span>
                  
                  {/* Botão para Confirmar Pendente */}
                  <button
                    onClick={() => {
                      if (confirm(`Confirmar recebimento do pagamento de ${client?.nome}?`)) {
                        confirmarSinal(p.agendamento_id, p.valor, 'pix');
                      }
                    }}
                    className="bg-white hover:bg-[#8C6D58] border border-[#8C6D58] text-[#8C6D58] hover:text-white px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm"
                  >
                    Confirmar
                  </button>
                  
                  <span className="bg-[#FFF3CD] text-[#856404] border border-[#FFEEBA] text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase">
                    Pendente
                  </span>
                </div>
              </div>
            );
          })}
          {pagamentosPendentes.length === 0 && (
            <p className="text-xs text-[#8C7A6B] text-center py-1">Nenhum pagamento pendente no momento.</p>
          )}
        </div>
      </div>

      {/* --- MODAL REGISTRAR DESPESA --- */}
      {despesaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200">
            <h3 className="font-serif font-bold text-lg text-[#5A4535] mb-4">Registrar Despesa</h3>
            
            <form onSubmit={handleSalvarDespesa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Descrição / Produto</label>
                <input 
                  type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Cabine UV LED / Aluguel da mesa..."
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Categoria</label>
                  <select
                    value={categoria} onChange={(e) => setCategoria(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  >
                    <option value="material">Materiais</option>
                    <option value="aluguel">Aluguel / Taxas</option>
                    <option value="marketing">Marketing</option>
                    <option value="transporte">Transporte</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Valor Gasto (R$)</label>
                  <input 
                    type="number" required min={0.01} step="0.01"
                    value={valorDespesa} onChange={(e) => setValorDespesa(Number(e.target.value))}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Data do Gasto</label>
                <input 
                  type="date" required value={dataDespesa} onChange={(e) => setDataDespesa(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
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
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
