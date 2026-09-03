import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Clock, 
  User, 
  X, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AgendamentoDetalheModal } from '../components/AgendamentoDetalheModal';

interface AgendaProps {
  currentView: string;
  isNewAgendamentoModalOpen: boolean;
  closeNewAgendamentoModal: () => void;
  openNewAgendamentoModal: () => void;
}

export const Agenda: React.FC<AgendaProps> = ({ 
  isNewAgendamentoModalOpen, 
  closeNewAgendamentoModal,
  openNewAgendamentoModal 
}) => {
  const { 
    agendamentos, 
    clientes, 
    servicos, 
    addAgendamento, 
    addCliente, 
    equipe,
    currentUser,
    configSalao,
    checkConflitoHorario,
    obterServicosDeAgendamento
  } = useAppState();

  // Data Base Real (Data Local Hoje)
  const dataHojeObj = new Date();
  const dataBaseStr = dataHojeObj.toLocaleDateString('en-CA');

  const [dataSelecionada, setDataSelecionada] = useState<string>(dataBaseStr);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  
  // Calendário Popover com Destaque de Atendimentos
  const [showCalendarPicker, setShowCalendarPicker] = useState<boolean>(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());

  // Mapa de dias com atendimento (para marcar com pontinho no calendário)
  const mapaDiasComAtendimento = useMemo(() => {
    const mapa: { [dataStr: string]: number } = {};
    agendamentos.forEach(a => {
      if (a.status !== 'cancelado') {
        const dia = a.inicio.split('T')[0];
        mapa[dia] = (mapa[dia] || 0) + 1;
      }
    });
    return mapa;
  }, [agendamentos]);

  // Auxiliar para gerar os dias da grade mensal
  const gerarDiasDoMes = (dataBase: Date) => {
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth();
    
    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);
    
    const dias: { data: Date; iso: string; dia: number; outroMes: boolean }[] = [];
    
    // Dias do mês anterior
    const diaSemanaInicio = primeiroDiaMes.getDay();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const d = new Date(ano, mes, -i);
      const iso = d.toLocaleDateString('en-CA');
      dias.push({ data: d, iso, dia: d.getDate(), outroMes: true });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
      const d = new Date(ano, mes, i);
      const iso = d.toLocaleDateString('en-CA');
      dias.push({ data: d, iso, dia: i, outroMes: false });
    }
    
    // Dias do próximo mês
    const restantes = (7 - (dias.length % 7)) % 7;
    for (let i = 1; i <= restantes; i++) {
      const d = new Date(ano, mes + 1, i);
      const iso = d.toLocaleDateString('en-CA');
      dias.push({ data: d, iso, dia: i, outroMes: true });
    }
    
    return dias;
  };

  // Detalhes do agendamento selecionado
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null);
  
  // Novo Agendamento Formulário
  const [clienteExistente, setClienteExistente] = useState<boolean>(true);
  const [clienteId, setClienteId] = useState<string>('');
  const [novoClienteNome, setNovoClienteNome] = useState<string>('');
  const [novoClienteFone, setNovoClienteFone] = useState<string>('');
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [horaInicio, setHoraInicio] = useState<string>('09:00');
  const [obsAgendamento, setObsAgendamento] = useState<string>('');
  const [isBloqueio, setIsBloqueio] = useState<boolean>(false);
  const [profissionalId, setProfissionalId] = useState<string>('u1');
  const [errorAgendamento, setErrorAgendamento] = useState<string>('');
  const [cobrarSinal, setCobrarSinal] = useState<boolean>(true);

  // Serviços habilitados da profissional selecionada
  const profSelecionada = equipe.find(u => u.id === profissionalId);
  const servicosHabilitadosProf = useMemo(() => {
    return servicos.filter(s => {
      if (!s.ativo) return false;
      if (!profSelecionada?.servicos_habilitados || profSelecionada.servicos_habilitados.length === 0) {
        return true;
      }
      return profSelecionada.servicos_habilitados.includes(s.id);
    });
  }, [servicos, profSelecionada]);

  // Local state for modal to prevent rendering lag
  const [localNewAgendamentoOpen, setLocalNewAgendamentoOpen] = useState(isNewAgendamentoModalOpen);

  useEffect(() => {
    setLocalNewAgendamentoOpen(isNewAgendamentoModalOpen);
  }, [isNewAgendamentoModalOpen]);

  // Keyboard Escape listener to close modal in Agenda.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (localNewAgendamentoOpen) {
          handleCloseLocalModal();
        } else if (selectedAgendamentoId) {
          setSelectedAgendamentoId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localNewAgendamentoOpen, selectedAgendamentoId]);

  const handleOpenLocalModal = () => {
    setLocalNewAgendamentoOpen(true);
    openNewAgendamentoModal();
  };

  const handleCloseLocalModal = () => {
    setLocalNewAgendamentoOpen(false);
    closeNewAgendamentoModal();
  };

  // Sincronizar o profissionalId com o profissional logado por padrão
  useEffect(() => {
    if (currentUser) {
      setProfissionalId(currentUser.id);
    }
  }, [currentUser, localNewAgendamentoOpen]);

  // Formatar Moeda
  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Alterar dia selecionado
  const alterarDia = (dias: number) => {
    const data = new Date(dataSelecionada + 'T00:00:00');
    data.setDate(data.getDate() + dias);
    const y = data.getFullYear();
    const m = String(data.getMonth() + 1).padStart(2, '0');
    const d = String(data.getDate()).padStart(2, '0');
    setDataSelecionada(`${y}-${m}-${d}`);
  };

  // Filtrar e organizar agendamentos para o dia selecionado
  const agendamentosDoDia = agendamentos
    .filter(a => a.inicio.startsWith(dataSelecionada))
    .filter(a => {
      // Se for profissional da equipe, visualiza apenas a própria agenda
      if (currentUser?.perfil === 'profissional' && a.profissional_id !== currentUser.id) {
        return false;
      }
      return true;
    })
    .filter(a => {
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
      if (busca) {
        if (a.cliente_id === 'bloqueado') {
          return a.observacoes?.toLowerCase().includes(busca.toLowerCase());
        }
        const client = clientes.find(c => c.id === a.cliente_id);
        const servs = servicos.filter(s => (a.cliente_id !== 'bloqueado') && (agendamentos.some(item => item.id === a.id))); // Safely fetch
        return client?.nome.toLowerCase().includes(busca.toLowerCase()) || 
               client?.telefone.includes(busca);
      }
      return true;
    })
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  // Gerar slots horários para exibição visual do dia (das 08:00 às 20:00)
  const horasExpediente = Array.from({ length: 25 }, (_, i) => {
    const hora = 8 + Math.floor(i / 2);
    const min = (i % 2) * 30;
    return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  });

  // Salvar agendamento
  const handleCriarAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAgendamento('');

    let cId = clienteId;

    if (isBloqueio) {
      cId = 'bloqueado';
    } else if (!clienteExistente) {
      if (!novoClienteNome || !novoClienteFone) {
        setErrorAgendamento('Preencha os dados da nova cliente.');
        return;
      }
      const novoCli = addCliente({
        nome: novoClienteNome,
        telefone: novoClienteFone,
        consentimento_imagem: false
      });
      cId = novoCli.id;
    } else if (!cId) {
      setErrorAgendamento('Selecione uma cliente.');
      return;
    }

    if (servicosSelecionados.length === 0 && !isBloqueio) {
      setErrorAgendamento('Selecione pelo menos um serviço.');
      return;
    }

    // Calcular valores
    const servs = servicos.filter(s => servicosSelecionados.includes(s.id));
    const total = isBloqueio ? 0 : servs.reduce((acc, s) => acc + s.preco, 0);
    
    // Sinal total (soma)
    const sinal = (isBloqueio || !cobrarSinal) ? 0 : servs.reduce((acc, s) => {
      if (s.sinal_tipo === 'fixo') return acc + s.sinal_valor;
      if (s.sinal_tipo === 'porcentagem') return acc + (s.preco * s.sinal_valor / 100);
      return acc;
    }, 0);

    const dataInicioStr = `${dataSelecionada}T${horaInicio}:00`;

    const res = addAgendamento({
      cliente_id: cId,
      profissional_id: profissionalId,
      inicio: dataInicioStr,
      status: isBloqueio ? 'bloqueado' : (sinal > 0 ? 'pendente' : 'confirmado'),
      valor_total: total,
      valor_sinal: sinal,
      observacoes: obsAgendamento,
      origem: 'admin'
    }, isBloqueio ? [] : servicosSelecionados);

    if (res.success) {
      // Limpar formulário
      setClienteId('');
      setNovoClienteNome('');
      setNovoClienteFone('');
      setServicosSelecionados([]);
      setObsAgendamento('');
      setIsBloqueio(false);
      handleCloseLocalModal();
    } else {
      setErrorAgendamento(res.error || 'Erro desconhecido');
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header Fixo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Agenda de Atendimentos</h2>
          <p className="text-xs text-[#8C7A6B]">
            {currentUser?.perfil === 'profissional' 
              ? `Visualizando agenda de ${currentUser.nome}` 
              : 'Gerencie os agendamentos das clientes e bloqueios pessoais'}
          </p>
        </div>
        <button
          onClick={handleOpenLocalModal}
          className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Controles e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 bg-white p-3 rounded-2xl border border-[#EFECE6]">
        {/* Navegação por Data */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alterarDia(-1)} 
            className="p-1.5 border border-[#EFECE6] rounded-lg hover:bg-[#FAF9F6] text-[#8C7A6B]"
          >
            <ChevronLeft size={16} />
          </button>
          
          {/* Seletor com Calendário Popover Interativo */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => {
                const partes = dataSelecionada.split('-');
                if (partes.length === 3) {
                  setCalendarViewDate(new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])));
                }
                setShowCalendarPicker(!showCalendarPicker);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F6] hover:bg-[#F6ECE8] transition-colors rounded-xl border border-[#EFECE6] text-xs font-semibold text-[#5A4535]"
              title="Abrir calendário mensal"
            >
              <CalendarIcon size={14} className="text-[#8C6D58]" />
              <span>{dataSelecionada.split('-').reverse().join('/')}</span>
              {mapaDiasComAtendimento[dataSelecionada] ? (
                <span className="w-2 h-2 rounded-full bg-[#DB7093]" title={`${mapaDiasComAtendimento[dataSelecionada]} agendamento(s)`} />
              ) : null}
            </button>

            {/* POPOVER DO CALENDÁRIO COM DESTAQUE DE DIAS COM ATENDIMENTO */}
            {showCalendarPicker && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCalendarPicker(false)}
                />
                <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-[#EFECE6] p-4 w-72 animate-in fade-in zoom-in duration-150">
                  {/* Cabeçalho do Mês */}
                  <div className="flex items-center justify-between mb-3">
                    <button 
                      type="button"
                      onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                      className="p-1 rounded-lg hover:bg-[#FAF9F6] text-[#8C7A6B]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-[#5A4535] capitalize">
                      {calendarViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                      className="p-1 rounded-lg hover:bg-[#FAF9F6] text-[#8C7A6B]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Dias da semana */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <span key={i} className="text-[10px] font-bold text-[#A88690] py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Grade de Dias */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {gerarDiasDoMes(calendarViewDate).map((item, idx) => {
                      const isSelected = item.iso === dataSelecionada;
                      const qtdAtendimentos = mapaDiasComAtendimento[item.iso] || 0;
                      const temAtendimento = qtdAtendimentos > 0;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDataSelecionada(item.iso);
                            setShowCalendarPicker(false);
                          }}
                          className={`relative py-1.5 px-0.5 rounded-xl text-xs flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#8C6D58] text-white font-bold shadow-sm'
                              : temAtendimento
                              ? 'bg-[#FFF0F5] text-[#C71585] font-bold border border-[#FAD0DC] hover:bg-[#FAD0DC]/60'
                              : item.outroMes
                              ? 'text-[#C2B7AE] hover:bg-[#FAF9F6]'
                              : 'text-[#5A4535] hover:bg-[#FAF9F6]'
                          }`}
                          title={temAtendimento ? `${qtdAtendimentos} atendimento(s)` : undefined}
                        >
                          <span>{item.dia}</span>
                          {temAtendimento && (
                            <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-[#DB7093]'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rodapé explicativo */}
                  <div className="mt-3 pt-2.5 border-t border-[#EFECE6] flex items-center justify-between text-[10px] text-[#8C7A6B]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#DB7093]" />
                      <span className="font-medium text-[#C71585]">Dias com atendimento</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDataSelecionada(dataBaseStr);
                        setShowCalendarPicker(false);
                      }}
                      className="font-bold text-[#8C6D58] hover:underline"
                    >
                      Hoje
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button 
            onClick={() => alterarDia(1)} 
            className="p-1.5 border border-[#EFECE6] rounded-lg hover:bg-[#FAF9F6] text-[#8C7A6B]"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => setDataSelecionada(dataBaseStr)}
            className="text-[10px] font-bold text-[#8C6D58] bg-[#F6ECE8] px-2 py-1.5 rounded-lg hover:bg-[#ebdace] transition-colors"
          >
            Hoje
          </button>
        </div>

        {/* Busca e Status */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Busca */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl flex-1 md:flex-initial">
            <Search size={14} className="text-[#8C7A6B]" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-[#5A4535] placeholder-[#C2B7AE] w-full md:w-36 focus:ring-0"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-1 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl p-0.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendente', label: 'Pendente' },
              { id: 'confirmado', label: 'Confirmado' },
              { id: 'concluido', label: 'Concluído' },
              { id: 'falta', label: 'Faltas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFiltroStatus(tab.id)}
                className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                  filtroStatus === tab.id 
                    ? 'bg-[#8C6D58] text-white shadow-sm' 
                    : 'text-[#8C7A6B] hover:text-[#8C6D58]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Agendamentos */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-[#EFECE6] p-4 relative shadow-sm">
        {agendamentosDoDia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#8C7A6B]">
            <CalendarIcon size={48} className="text-[#E8DEC9] mb-3" />
            <h4 className="font-semibold text-sm">Sem atendimentos neste dia</h4>
            <p className="text-xs mt-1 text-[#C2B7AE]">Use o botão "Novo Agendamento" para agendar uma cliente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agendamentosDoDia.map((a) => {
              const client = clientes.find(c => c.id === a.cliente_id);
              const prof = equipe.find(u => u.id === a.profissional_id);
              const servText = a.cliente_id === 'bloqueado' ? 'Bloqueio' : 'Atendimento';
              const horaIn = a.inicio.split('T')[1].substring(0, 5);
              const horaFi = a.fim.split('T')[1].substring(0, 5);

              const statusStyles: { [key: string]: string } = {
                pendente: 'bg-[#FFF9E6] border-[#FFECB3] text-[#B78103]',
                confirmado: 'bg-[#EBF7EE] border-[#C2EAD0] text-[#2B7A4B]',
                concluido: 'bg-[#F2F1ED] border-[#E5E2DA] text-[#6E6B64]',
                cancelado: 'bg-[#FDF2F2] border-[#FDE2E2] text-[#C81E1E]',
                falta: 'bg-[#FDF2F9] border-[#FDE2F3] text-[#9B2C2C]',
                bloqueado: 'bg-[#F4ECE3] border-[#E8DEC9] text-[#786150] opacity-75'
              };

              const statusLabels: { [key: string]: string } = {
                pendente: 'Pendente',
                confirmado: 'Confirmado',
                concluido: 'Concluído',
                cancelado: 'Cancelado',
                falta: 'Falta',
                bloqueado: 'Horário Bloqueado'
              };

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAgendamentoId(a.id)}
                  className={`p-4 border rounded-xl cursor-pointer hover:shadow-sm transition-all ${statusStyles[a.status] || ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-bold text-sm bg-white bg-opacity-70 px-2 py-1 rounded-lg">
                        <Clock size={13} />
                        <span>{horaIn} - {horaFi}</span>
                      </div>
                      <div>
                        {a.cliente_id === 'bloqueado' ? (
                          <h4 className="font-bold text-sm text-[#786150]">Bloqueio: {a.observacoes || 'Sem detalhes'}</h4>
                        ) : (
                          <>
                            <h4 className="font-bold text-sm">{client?.nome}</h4>
                            <p className="text-xs opacity-90 mt-0.5">
                              {servText} {currentUser?.perfil === 'admin' && prof && `· Profissional: ${prof.nome}`}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-black border-opacity-5 sm:border-none pt-2 sm:pt-0">
                      {a.cliente_id !== 'bloqueado' && (
                        <span className="text-xs font-extrabold">{formatarMoeda(a.valor_total)}</span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white bg-opacity-60 px-2 py-0.5 rounded">
                        {statusLabels[a.status] || a.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- UNIFIED DETAILS MODAL --- */}
      {selectedAgendamentoId && (
        <AgendamentoDetalheModal 
          agendamentoId={selectedAgendamentoId} 
          onClose={() => setSelectedAgendamentoId(null)} 
        />
      )}

      {/* --- MODAL NOVO AGENDAMENTO --- */}
      {localNewAgendamentoOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseLocalModal}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#EFECE6] p-6 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#5A4535]">Novo Agendamento Manual</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Reserve um horário na agenda do salão</p>
              </div>
              <button 
                onClick={handleCloseLocalModal}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarAgendamento} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
                {errorAgendamento && (
                  <div className="p-3 bg-[#FDF2F2] border border-[#FDE2E2] rounded-xl text-xs text-[#C81E1E] flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{errorAgendamento}</span>
                  </div>
                )}

                {/* Toggle Bloqueio Pessoal */}
                <div className="flex justify-between items-center bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6]">
                  <div>
                    <h4 className="text-xs font-bold text-[#5A4535]">Bloqueio de Horário Pessoal</h4>
                    <p className="text-[10px] text-[#8C7A6B] mt-0.5">Bloquear tempo para almoço, reuniões, etc.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isBloqueio}
                    onChange={(e) => setIsBloqueio(e.target.checked)}
                    className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                  />
                </div>

                {!isBloqueio ? (
                  <>
                    {/* Seleção do Profissional */}
                    <div>
                      <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Profissional do Atendimento</label>
                      <select
                        value={profissionalId}
                        onChange={(e) => {
                          const novoId = e.target.value;
                          setProfissionalId(novoId);
                          const prof = equipe.find(u => u.id === novoId);
                          if (prof?.servicos_habilitados && prof.servicos_habilitados.length > 0) {
                            setServicosSelecionados(prev => prev.filter(sId => prof.servicos_habilitados!.includes(sId)));
                          }
                        }}
                        disabled={currentUser?.perfil === 'profissional'}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-sm text-[#5A4535] bg-[#FAF9F6] focus:outline-none focus:border-[#8C6D58] disabled:opacity-75"
                      >
                        {equipe
                          .filter(u => u.ativo)
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.nome} ({u.perfil === 'admin' ? 'Administradora' : 'Profissional'})</option>
                          ))}
                      </select>
                    </div>

                    {/* Escolha Cliente */}
                    <div className="space-y-2">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-[#5A4535] cursor-pointer">
                          <input 
                            type="radio" 
                            checked={clienteExistente} 
                            onChange={() => setClienteExistente(true)}
                            className="text-[#8C6D58] focus:ring-[#8C6D58]"
                          />
                          <span>Cliente Cadastrada</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-[#5A4535] cursor-pointer">
                          <input 
                            type="radio" 
                            checked={!clienteExistente} 
                            onChange={() => setClienteExistente(false)}
                            className="text-[#8C6D58] focus:ring-[#8C6D58]"
                          />
                          <span>Nova Cliente</span>
                        </label>
                      </div>

                      {clienteExistente ? (
                        <div>
                          <select
                            value={clienteId}
                            onChange={(e) => setClienteId(e.target.value)}
                            className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-sm text-[#5A4535] bg-[#FAF9F6] focus:outline-none focus:border-[#8C6D58]"
                          >
                            <option value="">-- Selecione a Cliente --</option>
                            {clientes.map(c => (
                              <option key={c.id} value={c.id}>{c.nome} ({c.telefone})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#FAF9F6] rounded-xl border border-[#EFECE6]">
                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome Completo</label>
                            <input 
                              type="text" 
                              value={novoClienteNome}
                              onChange={(e) => setNovoClienteNome(e.target.value)}
                              placeholder="Ex: Amanda Santos"
                              className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">WhatsApp</label>
                            <input 
                              type="text" 
                              value={novoClienteFone}
                              onChange={(e) => setNovoClienteFone(e.target.value)}
                              placeholder="(35) 99999-9999"
                              className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Serviços */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-[#8C7A6B] uppercase">Serviços Selecionados</label>
                        {profSelecionada && (
                          <span className="text-[10px] text-[#A88690] italic">
                            Especialidades de {profSelecionada.nome}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-[#EFECE6] p-3 rounded-xl bg-[#FAF9F6]">
                        {servicosHabilitadosProf.length === 0 ? (
                          <p className="col-span-2 text-center text-xs text-[#8C7A6B] py-3">
                            Nenhum serviço habilitado cadastrado para esta profissional.
                          </p>
                        ) : (
                          servicosHabilitadosProf.map(s => {
                            const selecionado = servicosSelecionados.includes(s.id);
                            return (
                              <label 
                                key={s.id} 
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  selecionado 
                                    ? 'bg-[#F6ECE8] border-[#8C6D58] text-[#8C6D58]' 
                                    : 'bg-white border-[#EFECE6] text-[#5A4535] hover:bg-[#FAF9F6]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox"
                                    checked={selecionado}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setServicosSelecionados(prev => [...prev, s.id]);
                                      } else {
                                        setServicosSelecionados(prev => prev.filter(id => id !== s.id));
                                      }
                                    }}
                                    className="rounded text-[#8C6D58] focus:ring-[#8C6D58]"
                                  />
                                  <div>
                                    <span className="font-semibold block">{s.nome}</span>
                                    <span className="text-[10px] text-[#8C7A6B]">{s.duracao_minutos} min</span>
                                  </div>
                                </div>
                                <span className="font-bold text-[10px]">{formatarMoeda(s.preco)}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Cobrar Sinal Toggle */}
                    <div className="flex items-center gap-2 mt-2 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#EFECE6]">
                      <input 
                        type="checkbox" 
                        id="cobrar_sinal_agend" 
                        checked={cobrarSinal} 
                        onChange={(e) => setCobrarSinal(e.target.checked)}
                        className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58]"
                      />
                      <label htmlFor="cobrar_sinal_agend" className="text-xs text-[#5A4535] font-semibold cursor-pointer">
                        Cobrar sinal para este agendamento
                      </label>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Título/Motivo do Bloqueio</label>
                    <input 
                      type="text" 
                      value={obsAgendamento}
                      onChange={(e) => setObsAgendamento(e.target.value)}
                      placeholder="Ex: Almoço / Manutenção da Cadeira..."
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-sm text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                    />
                  </div>
                )}

                {/* Data & Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Data</label>
                    <input 
                      type="date" 
                      value={dataSelecionada}
                      onChange={(e) => setDataSelecionada(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-sm text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Horário de Início</label>
                    <select
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-sm text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                    >
                      {horasExpediente.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isBloqueio && (
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Observações do Agendamento</label>
                    <textarea 
                      rows={2}
                      value={obsAgendamento}
                      onChange={(e) => setObsAgendamento(e.target.value)}
                      placeholder="Algum detalhe relevante..."
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Botões Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] p-6 bg-white rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={handleCloseLocalModal}
                  className="px-4 py-2.5 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  {isBloqueio ? 'Bloquear Horário' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
