import React, { useState, useEffect } from 'react';
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
    currentUser
  } = useAppState();

  const dataBaseStr = '2026-08-29'; // Data atual fixa do protótipo
  const [dataSelecionada, setDataSelecionada] = useState<string>(dataBaseStr);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  
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

  // Local state for modal to prevent rendering lag
  const [localNewAgendamentoOpen, setLocalNewAgendamentoOpen] = useState(isNewAgendamentoModalOpen);

  useEffect(() => {
    setLocalNewAgendamentoOpen(isNewAgendamentoModalOpen);
  }, [isNewAgendamentoModalOpen]);

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
          
          <div className="flex items-center gap-2 px-3 py-1 bg-[#FAF9F6] rounded-xl border border-[#EFECE6]">
            <CalendarIcon size={14} className="text-[#8C6D58]" />
            <input 
              type="date" 
              value={dataSelecionada} 
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="text-xs font-semibold text-[#5A4535] bg-transparent border-none outline-none focus:ring-0 w-28"
            />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#EFECE6] my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
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

            <form onSubmit={handleCriarAgendamento} className="space-y-4">
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
                      onChange={(e) => setProfissionalId(e.target.value)}
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
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-2">Serviços Selecionados</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-[#EFECE6] p-3 rounded-xl bg-[#FAF9F6]">
                      {servicos.filter(s => s.ativo).map(s => {
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
                      })}
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

              {/* Botões Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
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
