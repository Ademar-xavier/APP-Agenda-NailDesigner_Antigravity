import React, { useMemo } from 'react';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Plus,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Users
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Cliente } from '../types';

interface DashboardProps {
  setCurrentView: (view: string) => void;
  setSelectedClienteIdForDetails?: (id: string | null) => void;
  openNewAgendamentoModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  setCurrentView,
  setSelectedClienteIdForDetails,
  openNewAgendamentoModal 
}) => {
  const { 
    agendamentos, 
    clientes, 
    pagamentos, 
    obterRecomendacoesManutencao,
    configSalao,
    updateAgendamentoStatus,
    obterServicosDeAgendamento,
    currentUser,
    listaEspera,
    servicos
  } = useAppState();

  const dataBaseStr = new Date().toLocaleDateString('en-CA'); // Data de hoje em tempo real (YYYY-MM-DD)
  const mesAtualStr = dataBaseStr.slice(0, 7); // Mês atual em tempo real (YYYY-MM)

  // Formatação bonita da data de hoje para o topo do Dashboard
  const hojeDate = new Date();
  const dataHojeFormatada = hojeDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const dataHojeExibicao = dataHojeFormatada.charAt(0).toUpperCase() + dataHojeFormatada.slice(1);

  // Informação dinâmica do expediente configurado pela administradora
  const infoExpediente = useMemo(() => {
    const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const hojeIndex = new Date().getDay();
    const hojeConfig = configSalao.horarios_trabalho?.[hojeIndex];

    if (hojeConfig?.ativo) {
      return {
        abertoHoje: true,
        texto: `Expediente de hoje (${diasNomes[hojeIndex]}): ${hojeConfig.inicio} às ${hojeConfig.fim}`
      };
    }

    // Se hoje estiver fechado, busca o próximo dia aberto configurado pela administradora
    for (let i = 1; i <= 7; i++) {
      const proxIndex = (hojeIndex + i) % 7;
      const proxConfig = configSalao.horarios_trabalho?.[proxIndex];
      if (proxConfig?.ativo) {
        return {
          abertoHoje: false,
          texto: `Hoje o salão está fechado. Próximo expediente: ${diasNomes[proxIndex]} das ${proxConfig.inicio} às ${proxConfig.fim}`
        };
      }
    }

    return {
      abertoHoje: false,
      texto: 'Horários de funcionamento a definir nas configurações.'
    };
  }, [configSalao.horarios_trabalho]);

  // 1. Filtrar agendamentos do profissional se não for administrador
  const agendamentosFiltrados = agendamentos.filter(a => {
    if (currentUser?.perfil === 'profissional' && a.profissional_id !== currentUser.id) {
      return false;
    }
    return true;
  });

  const atendimentosHoje = agendamentosFiltrados.filter(a => a.inicio.startsWith(dataBaseStr));
  const concluidosHoje = atendimentosHoje.filter(a => a.status === 'concluido');
  const confirmadosHoje = atendimentosHoje.filter(a => a.status === 'confirmado');
  const pendentesHoje = atendimentosHoje.filter(a => a.status === 'pendente');

  // 2. Cálculos de Faturamento 100% Dinâmicos e Reais (Apenas Admin)
  const faturamentoPrevistoHoje = atendimentosHoje
    .filter(a => a.status !== 'cancelado' && a.status !== 'falta')
    .reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);

  const faturamentoRealizadoHoje = atendimentosHoje
    .filter(a => a.status === 'concluido')
    .reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);

  const faturamentoPrevistoMes = agendamentosFiltrados
    .filter(a => a.inicio.startsWith(mesAtualStr) && a.status !== 'cancelado' && a.status !== 'falta')
    .reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);

  const faturamentoRealizadoMes = agendamentosFiltrados
    .filter(a => a.inicio.startsWith(mesAtualStr) && a.status === 'concluido')
    .reduce((acc, a) => acc + (Number(a.valor_total) || 0), 0);

  // Ocupação da Agenda (Horário disponível vs Horário agendado)
  const minutosTotaisExpediente = 540;
  const minutosAgendadosHoje = atendimentosHoje
    .filter(a => a.status !== 'cancelado' && a.status !== 'bloqueado')
    .reduce((acc, a) => {
      const diffMs = new Date(a.fim).getTime() - new Date(a.inicio).getTime();
      return acc + Math.floor(diffMs / (60 * 1000));
    }, 0);
  const taxaOcupacao = Math.min(100, Math.round((minutosAgendadosHoje / minutosTotaisExpediente) * 100));

  const aguardandoConfirmacao = atendimentosHoje.filter(a => a.status === 'pendente');
  const recomendacoesManutencao = obterRecomendacoesManutencao().slice(0, 4);
  const listaEsperaAtiva = useMemo(() => {
    return (listaEspera || []).filter(item => item.status === 'aguardando');
  }, [listaEspera]);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleEnviarMensagemWhatsApp = (cliente: Cliente, tipo: 'confirmacao' | 'lembrete' | 'retorno_manutencao', extra?: any) => {
    let msg = '';
    const link = `https://agenda-sheila.com.br/reserva`;
    const fone = cliente.telefone.replace(/\D/g, '');

    if (tipo === 'confirmacao') {
      msg = configSalao.templates_whatsapp.confirmacao
        .replace('{cliente}', cliente.nome)
        .replace('{servico}', extra?.servico || 'serviço')
        .replace('{profissional}', currentUser?.nome || 'Sheila')
        .replace('{data}', extra?.data || 'data')
        .replace('{hora}', extra?.hora || 'hora')
        .replace('{sinal}', String(extra?.sinal || 0))
        .replace('{chave_pix}', configSalao.chave_pix)
        .replace('{link_reserva}', link);
    } else if (tipo === 'lembrete') {
      msg = configSalao.templates_whatsapp.lembrete
        .replace('{cliente}', cliente.nome)
        .replace('{data}', extra?.data || 'amanhã')
        .replace('{hora}', extra?.hora || '')
        .replace('{servico}', extra?.servico || '')
        .replace('{limite_horas}', String(configSalao.regras.cancelamento_limite_horas));
    } else if (tipo === 'retorno_manutencao') {
      msg = configSalao.templates_whatsapp.retorno_manutencao
        .replace('{cliente}', cliente.nome)
        .replace('{dias_visita}', String(extra?.dias || 20))
        .replace('{servico}', extra?.servico || 'Alongamento')
        .replace('{link_agendamento}', `https://agenda-sheila.com.br/agendar`);
    }

    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const isAdminRole = currentUser?.perfil === 'admin';

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto pb-24 md:pb-10 bg-[#FAF9F6]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-2xl md:text-3xl text-[#5A4535]">Olá, {currentUser?.nome}!</h2>
          <p className="text-sm text-[#8C7A6B]">
            Aqui está o seu resumo para hoje, <span className="font-semibold">{dataHojeExibicao}</span>
          </p>
        </div>
        <button
          onClick={openNewAgendamentoModal}
          className="flex items-center justify-center gap-2 bg-[#8C6D58] hover:bg-[#725743] text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all self-start md:self-auto"
        >
          <Plus size={18} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Faturamento Hoje (Apenas Admin) / Total Atendimentos Hoje (Profissional) */}
        {isAdminRole ? (
          <div className="bg-white p-5 rounded-2xl border border-[#EFECE6] flex items-center gap-4">
            <div className="p-3 bg-[#F6ECE8] text-[#D37F64] rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#8C7A6B] uppercase tracking-wider">Faturamento Hoje</p>
              <h3 className="text-lg font-bold text-[#5A4535] mt-1">{formatarMoeda(faturamentoRealizadoHoje)}</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Previsto: {formatarMoeda(faturamentoPrevistoHoje)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-[#EFECE6] flex items-center gap-4">
            <div className="p-3 bg-[#F6ECE8] text-[#D37F64] rounded-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#8C7A6B] uppercase tracking-wider">Seus Atendimentos Concluídos</p>
              <h3 className="text-lg font-bold text-[#5A4535] mt-1">{concluidosHoje.length}</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Hoje no salão</p>
            </div>
          </div>
        )}

        {/* KPI 2: Faturamento Mês (Apenas Admin) / Agenda Total (Profissional) */}
        {isAdminRole ? (
          <div className="bg-white p-5 rounded-2xl border border-[#EFECE6] flex items-center gap-4">
            <div className="p-3 bg-[#ECECF6] text-[#6969B3] rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#8C7A6B] uppercase tracking-wider">Faturamento Mês</p>
              <h3 className="text-lg font-bold text-[#5A4535] mt-1">{formatarMoeda(faturamentoRealizadoMes)}</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Previsto: {formatarMoeda(faturamentoPrevistoMes)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-[#EFECE6] flex items-center gap-4">
            <div className="p-3 bg-[#ECECF6] text-[#6969B3] rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#8C7A6B] uppercase tracking-wider">Total Agendados Hoje</p>
              <h3 className="text-lg font-bold text-[#5A4535] mt-1">
                {atendimentosHoje.filter(a => a.status !== 'cancelado' && a.status !== 'bloqueado').length}
              </h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Seus horários agendados</p>
            </div>
          </div>
        )}

        {/* KPI 3: Ocupação */}
        <div className="bg-white p-5 rounded-2xl border border-[#EFECE6] flex items-center gap-4">
          <div className="p-3 bg-[#E8F6EE] text-[#4FA97A] rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8C7A6B] uppercase tracking-wider">Ocupação da Agenda</p>
            <h3 className="text-lg font-bold text-[#5A4535] mt-1">{taxaOcupacao}%</h3>
            <p className="text-xs text-[#8C7A6B] mt-0.5">{minutosAgendadosHoje} min ocupados</p>
          </div>
        </div>

        {/* KPI 4: Atendimentos Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-[#EFECE6] flex items-center gap-4">
          <div className="p-3 bg-[#FFF9E6] text-[#D4AF37] rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8C7A6B] uppercase tracking-wider">Status Geral Hoje</p>
            <h3 className="text-lg font-bold text-[#5A4535] mt-1">
              {concluidosHoje.length} / {atendimentosHoje.filter(a => a.status !== 'cancelado' && a.status !== 'bloqueado').length}
            </h3>
            <p className="text-xs text-[#8C7A6B] mt-0.5">
              {confirmadosHoje.length} confirmados | {pendentesHoje.length} pendentes
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (List / Agenda) - Right (Confirmations / Maintenance) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Agenda Summary */}
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#EFECE6] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">Atendimentos do Dia</h3>
              <button 
                onClick={() => setCurrentView('agenda')}
                className="text-xs font-semibold text-[#8C6D58] hover:text-[#725743] flex items-center gap-1"
              >
                <span>Ver agenda completa</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {atendimentosHoje.length === 0 ? (
              <div className="text-center py-8 text-[#8C7A6B]">
                <Calendar size={36} className="mx-auto text-[#E8DEC9] mb-2" />
                <p className="text-sm">Nenhum atendimento agendado para hoje.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atendimentosHoje
                  .filter(a => a.status !== 'bloqueado')
                  .sort((a, b) => a.inicio.localeCompare(b.inicio))
                  .map((a) => {
                    const client = clientes.find(c => c.id === a.cliente_id);
                    const servs = obterServicosDeAgendamento(a.id);
                    const servText = servs.map(s => s.nome).join(' + ');

                    const statusStyles: { [key: string]: string } = {
                      pendente: 'bg-[#FFF3CD] text-[#856404] border-[#FFEEBA]',
                      confirmado: 'bg-[#D4EDDA] text-[#155724] border-[#C3E6CB]',
                      concluido: 'bg-[#E2E3E5] text-[#383D41] border-[#D6D8DB]',
                      cancelado: 'bg-[#F8D7DA] text-[#721C24] border-[#F5C6CB]',
                      falta: 'bg-[#F5D6E7] text-[#7E2D58] border-[#F2C2DC]',
                    };

                    const statusLabels: { [key: string]: string } = {
                      pendente: 'Pendente',
                      confirmado: 'Confirmado',
                      concluido: 'Concluído',
                      cancelado: 'Cancelado',
                      falta: 'Falta',
                    };

                    return (
                      <div 
                        key={a.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-[#EFECE6] rounded-xl hover:border-[#8C6D58] transition-colors gap-3 cursor-pointer"
                        onClick={() => {
                          if (isAdminRole && setSelectedClienteIdForDetails && client) {
                            setSelectedClienteIdForDetails(client.id);
                            setCurrentView('clientes');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center border-r border-[#EFECE6] pr-3 min-w-[65px]">
                            <span className="block font-bold text-sm text-[#5A4535]">
                              {a.inicio.split('T')[1].substring(0, 5)}
                            </span>
                            <span className="text-[10px] text-[#8C7A6B]">
                              {a.fim.split('T')[1].substring(0, 5)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-[#5A4535] hover:text-[#8C6D58] transition-colors">
                              {client?.nome}
                            </h4>
                            <p className="text-xs text-[#8C7A6B] mt-0.5">{servText}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                          {isAdminRole && (
                            <span className="text-sm font-bold text-[#5A4535] mr-2">{formatarMoeda(a.valor_total)}</span>
                          )}
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusStyles[a.status] || ''}`}>
                            {statusLabels[a.status] || a.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Weekly Performance Bar Chart SVG (Apenas Admin) */}
          {isAdminRole && (
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#5A4535] mb-4">Desempenho da Semana</h3>
              <div className="h-48 flex items-end justify-between gap-2 pt-6">
                {[
                  { dia: 'Seg', valor: 350, real: 350 },
                  { dia: 'Ter', valor: 480, real: 480 },
                  { dia: 'Qua', valor: 650, real: 650 },
                  { dia: 'Qui', valor: 850, real: 750 },
                  { dia: 'Sex', valor: 1200, real: 1050 },
                  { dia: 'Sáb', valor: faturamentoPrevistoHoje, real: faturamentoRealizadoHoje }
                ].map((item, idx) => {
                  const maxVal = 1300;
                  const prevHeight = (item.valor / maxVal) * 100;
                  const realHeight = (item.real / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div className="w-full flex justify-center gap-1 items-end h-32 relative">
                        <div 
                          style={{ height: `${prevHeight}%` }} 
                          className="w-3 bg-[#E8DEC9] rounded-t-sm transition-all"
                          title={`Previsto: ${formatarMoeda(item.valor)}`}
                        ></div>
                        <div 
                          style={{ height: `${realHeight}%` }} 
                          className="w-3 bg-[#8C6D58] rounded-t-sm transition-all"
                          title={`Realizado: ${formatarMoeda(item.real)}`}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold text-[#8C7A6B]">{item.dia}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 justify-center mt-4 pt-3 border-t border-[#EFECE6]">
                <div className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
                  <div className="w-3 h-3 bg-[#E8DEC9] rounded-sm"></div>
                  <span>Faturamento Previsto</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
                  <div className="w-3 h-3 bg-[#8C6D58] rounded-sm"></div>
                  <span>Faturamento Realizado</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Confirmations / Maintenance (Toggles hidden for normal professional) */}
        {isAdminRole ? (
          <div className="space-y-6">
            {/* Actionable Confirmations */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm">
              <h3 className="font-serif font-bold text-base text-[#5A4535] mb-3 flex items-center gap-2">
                <UserCheck size={18} className="text-[#8C6D58]" />
                <span>Aguardando Confirmação ({aguardandoConfirmacao.length})</span>
              </h3>
              
              {aguardandoConfirmacao.length === 0 ? (
                <p className="text-xs text-[#8C7A6B] py-3 text-center">Nenhum atendimento pendente para hoje.</p>
              ) : (
                <div className="space-y-3">
                  {aguardandoConfirmacao.map(a => {
                    const client = clientes.find(c => c.id === a.cliente_id);
                    const servs = obterServicosDeAgendamento(a.id);
                    const servText = servs.map(s => s.nome).join(', ');
                    
                    return (
                      <div key={a.id} className="p-3 border border-[#EFECE6] rounded-xl bg-[#FAF9F6]">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-[#5A4535]">{client?.nome}</h4>
                            <p className="text-[10px] text-[#8C7A6B] mt-0.5">
                              {a.inicio.split('T')[1].substring(0, 5)} - {servText}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-[#D37F64]">{formatarMoeda(a.valor_total)}</span>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <button
                            onClick={() => {
                              if (client) {
                                const horaStr = a.inicio.split('T')[1].substring(0, 5);
                                handleEnviarMensagemWhatsApp(client, 'confirmacao', {
                                  servico: servText,
                                  data: '29/08/2026',
                                  hora: horaStr,
                                  sinal: a.valor_sinal
                                });
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#4FA97A] hover:bg-[#419266] text-white text-[10px] font-semibold rounded-lg shadow-sm transition-colors"
                          >
                            <MessageCircle size={12} />
                            <span>Lembrete Pix</span>
                          </button>
                          <button
                            onClick={() => updateAgendamentoStatus(a.id, 'confirmado')}
                            className="px-2.5 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-[10px] font-semibold rounded-lg shadow-sm transition-colors"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Maintenance Alerter */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm">
              <h3 className="font-serif font-bold text-base text-[#5A4535] mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-[#D37F64]" />
                <span>Retorno de Manutenção</span>
              </h3>

              {recomendacoesManutencao.length === 0 ? (
                <p className="text-xs text-[#8C7A6B] py-3 text-center">Nenhum cliente com manutenção pendente hoje.</p>
              ) : (
                <div className="space-y-3">
                  {recomendacoesManutencao.map((rec, idx) => (
                    <div key={idx} className="p-3 border border-[#EFECE6] rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#5A4535]">{rec.cliente.nome}</h4>
                        <p className="text-[10px] text-[#8C7A6B] mt-0.5">
                          {rec.servico.nome} ({rec.servico.intervalo_manutencao_dias}d)
                        </p>
                        <span className="inline-block text-[9px] font-medium text-[#D37F64] bg-[#F6ECE8] px-1.5 py-0.5 rounded mt-1">
                          {rec.diasAtraso === 0 ? 'Vence hoje' : `Atrasada há ${rec.diasAtraso}d`}
                        </span>
                      </div>

                      <button
                        onClick={() => handleEnviarMensagemWhatsApp(rec.cliente, 'retorno_manutencao', {
                          servico: rec.servico.nome,
                          dias: rec.servico.intervalo_manutencao_dias + rec.diasAtraso
                        })}
                        className="p-2 bg-[#E2F5EC] hover:bg-[#c9ebd9] text-[#4FA97A] rounded-full transition-colors"
                        title="Enviar convite de retorno no WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card Lista de Espera */}
            <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-2">
                  <Users size={18} className="text-[#8C6D58]" />
                  <span>Lista de Espera ({listaEsperaAtiva.length})</span>
                </h3>
                <button
                  onClick={() => setCurrentView('confirmacoes')}
                  className="text-[11px] font-bold text-[#8C6D58] hover:text-[#725743] hover:underline flex items-center gap-1"
                >
                  <span>Ver todos</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {listaEsperaAtiva.length === 0 ? (
                <p className="text-xs text-[#8C7A6B] py-3 text-center">Nenhuma cliente na lista de espera no momento.</p>
              ) : (
                <div className="space-y-3">
                  {listaEsperaAtiva.slice(0, 4).map(item => {
                    const client = clientes.find(c => c.id === item.cliente_id);
                    const serv = servicos.find(s => s.id === item.servico_id);
                    return (
                      <div key={item.id} className="p-3 border border-[#EFECE6] rounded-xl flex items-center justify-between gap-2 bg-[#FAF9F6]">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-[#5A4535] truncate">{client?.nome || 'Cliente'}</h4>
                          <p className="text-[10px] text-[#8C7A6B] mt-0.5 truncate">
                            {serv?.nome || 'Procedimento'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block text-[9px] font-semibold text-[#8C6D58] bg-[#F4EBE6] px-1.5 py-0.5 rounded capitalize">
                              {item.periodo_preferido || 'Qualquer horário'}
                            </span>
                            {(item.data_preferida || item.criado_em) && (
                              <span className="text-[9px] text-[#8C7A6B]">
                                {new Date((item.data_preferida ? item.data_preferida + 'T12:00:00' : item.criado_em)).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (client?.telefone) {
                              const msg = `Olá, ${client.nome}! Surgiu um horário disponível para seu procedimento (${serv?.nome || 'atendimento'}) na Sheila Santos Nails Designer. Gostaria de agendar?`;
                              window.open(`https://wa.me/55${client.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                            }
                          }}
                          className="p-2 bg-[#E2F5EC] hover:bg-[#c9ebd9] text-[#4FA97A] rounded-full transition-colors shrink-0"
                          title="Chamar cliente no WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Profissional view side panel: simplified information
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
              <Sparkles size={18} className="text-[#8C6D58]" />
              <span>Dicas do Salão</span>
            </h3>
            <p className="text-xs text-[#8C7A6B] leading-relaxed">
              Olá, <strong>{currentUser?.nome || 'Profissional'}</strong>! Lembre-se de sempre marcar seus atendimentos finalizados como <strong>Concluído</strong> na aba <strong>Agenda</strong> para registrar a próxima sugestão de manutenção da cliente.
            </p>
            <div className={`p-3 rounded-xl border text-xs font-semibold ${
              infoExpediente.abertoHoje 
                ? 'bg-[#F2F8F4] border-[#D1E7D8] text-[#2D6A4F]' 
                : 'bg-[#FAF9F6] border-[#EFECE6] text-[#5A4535]'
            }`}>
              {infoExpediente.texto}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
