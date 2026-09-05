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
  Sparkles,
  RotateCcw,
  CheckCircle
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
  const [buscaClienteModal, setBuscaClienteModal] = useState<string>('');
  const [dropdownClienteAberto, setDropdownClienteAberto] = useState<boolean>(false);
  const [novoClienteNome, setNovoClienteNome] = useState<string>('');
  const [novoClienteFone, setNovoClienteFone] = useState<string>('');
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [horaInicio, setHoraInicio] = useState<string>('09:00');
  const [obsAgendamento, setObsAgendamento] = useState<string>('');
  const [isBloqueio, setIsBloqueio] = useState<boolean>(false);
  const [profissionalId, setProfissionalId] = useState<string>('u1');
  const [errorAgendamento, setErrorAgendamento] = useState<string>('');
  const [cobrarSinal, setCobrarSinal] = useState<boolean>(false);
  const [valorSinalManual, setValorSinalManual] = useState<number | ''>('');

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

  // Filtro de Clientes com busca por digitação rápida
  const clientesFiltradasModal = useMemo(() => {
    const q = buscaClienteModal.trim().toLowerCase();
    const qDigits = buscaClienteModal.replace(/\D/g, '');
    return [...clientes]
      .filter(c => {
        if (!q) return true;
        const matchNome = c.nome.toLowerCase().includes(q);
        const matchTel = qDigits && c.telefone ? c.telefone.replace(/\D/g, '').includes(qDigits) : false;
        return matchNome || matchTel;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [clientes, buscaClienteModal]);

  const clienteSelecionadoObj = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find(c => c.id === clienteId) || null;
  }, [clientes, clienteId]);

  // Resumo Inteligente de Tempo Total e Retorno de Manutenção
  const resumoServicosSelecionados = useMemo(() => {
    const selecionados = servicos.filter(s => servicosSelecionados.includes(s.id));
    const duracaoTotal = selecionados.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
    const precoTotal = selecionados.reduce((acc, s) => acc + (s.preco || 0), 0);
    
    // Intervalo de manutenção recomendado (pega o menor intervalo positivo entre os serviços selecionados)
    const intervalos = selecionados
      .map(s => Number(s.intervalo_manutencao_dias || (s as any).retorno_dias) || 0)
      .filter(d => d > 0);
    
    const diasRetorno = intervalos.length > 0 ? Math.min(...intervalos) : 0;

    // Cálculo do horário previsto de término
    let horaTermino = horaInicio;
    if (horaInicio && duracaoTotal > 0) {
      const partes = horaInicio.split(':').map(Number);
      const h = partes[0] || 0;
      const m = partes[1] || 0;
      const totalMin = h * 60 + m + duracaoTotal;
      const fimH = Math.floor(totalMin / 60) % 24;
      const fimM = totalMin % 60;
      horaTermino = `${String(fimH).padStart(2, '0')}:${String(fimM).padStart(2, '0')}`;
    }

    // Cálculo da data prevista de retorno
    let dataSugeridaRetorno = '';
    if (dataSelecionada && diasRetorno > 0) {
      const d = new Date(dataSelecionada + 'T12:00:00');
      d.setDate(d.getDate() + diasRetorno);
      dataSugeridaRetorno = d.toLocaleDateString('pt-BR');
    }

    // Formatação amigável de horas e minutos (ex: 130 min = 2h 10min)
    const horasFormatadas = Math.floor(duracaoTotal / 60);
    const minFormatados = duracaoTotal % 60;
    const duracaoExtenso = horasFormatadas > 0 
      ? `${horasFormatadas}h${minFormatados > 0 ? ` ${minFormatados}min` : ''} (${duracaoTotal} min)`
      : `${duracaoTotal} min`;

    return {
      selecionados,
      duracaoTotal,
      duracaoExtenso,
      precoTotal,
      diasRetorno,
      horaTermino,
      dataSugeridaRetorno
    };
  }, [servicos, servicosSelecionados, horaInicio, dataSelecionada]);

  // Sinal sugerido dos serviços selecionados
  const sinalSugeridoServicos = useMemo(() => {
    const servs = servicos.filter(s => servicosSelecionados.includes(s.id));
    return servs.reduce((acc, s) => {
      if (s.sinal_tipo === 'fixo') return acc + (s.sinal_valor || 0);
      if (s.sinal_tipo === 'porcentagem') return acc + (s.preco * (s.sinal_valor || 0) / 100);
      return acc;
    }, 0);
  }, [servicos, servicosSelecionados]);

  // Atualiza o valor do sinal sugerido quando troca o serviço
  useEffect(() => {
    if (sinalSugeridoServicos > 0) {
      setValorSinalManual(sinalSugeridoServicos);
    }
  }, [sinalSugeridoServicos]);

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
    setBuscaClienteModal('');
    setDropdownClienteAberto(false);
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

  // Validação do dia da semana e expediente cadastrado
  const nomesDias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diaSemanaSelecionado = new Date(dataSelecionada + 'T12:00:00').getDay();
  const expedienteDoDia = configSalao.horarios_trabalho?.[diaSemanaSelecionado];
  const diaFechado = !expedienteDoDia || !expedienteDoDia.ativo;

  // Duração necessária para o atendimento em minutos
  const duracaoMinutosAtual = isBloqueio 
    ? 30 
    : (resumoServicosSelecionados.duracaoTotal > 0 ? resumoServicosSelecionados.duracaoTotal : 30);

  // Análise completa de disponibilidade de horários (Livres vs Ocupados)
  const analiseHorarios = useMemo(() => {
    if (diaFechado || !expedienteDoDia) {
      return {
        livres: [] as string[],
        ocupados: [] as { hora: string; motivo: string }[]
      };
    }

    const [hIni, mIni] = (expedienteDoDia.inicio || '08:00').split(':').map(Number);
    const [hFim, mFim] = (expedienteDoDia.fim || '20:00').split(':').map(Number);
    const minInicio = hIni * 60 + mIni;
    const minFim = hFim * 60 + mFim;

    const livres: string[] = [];
    const ocupados: { hora: string; motivo: string }[] = [];

    const agora = new Date();
    const anoH = agora.getFullYear();
    const mesH = String(agora.getMonth() + 1).padStart(2, '0');
    const diaH = String(agora.getDate()).padStart(2, '0');
    const hojeStr = `${anoH}-${mesH}-${diaH}`;
    const isHoje = dataSelecionada === hojeStr;
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();

    // Avalia cada intervalo de 30 em 30 minutos dentro do expediente
    for (let m = minInicio; m <= minFim - duracaoMinutosAtual; m += 30) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const mStr = String(m % 60).padStart(2, '0');
      const slot = `${hStr}:${mStr}`;

      const inicioAgend = `${dataSelecionada}T${slot}:00`;
      const dateInicio = new Date(`${dataSelecionada}T${slot}:00`);
      const dateFim = new Date(dateInicio.getTime() + duracaoMinutosAtual * 60 * 1000);
      const anoF = dateFim.getFullYear();
      const mesF = String(dateFim.getMonth() + 1).padStart(2, '0');
      const diaF = String(dateFim.getDate()).padStart(2, '0');
      const horaF = String(dateFim.getHours()).padStart(2, '0');
      const minF = String(dateFim.getMinutes()).padStart(2, '0');
      const segF = String(dateFim.getSeconds()).padStart(2, '0');
      const fimAgend = `${anoF}-${mesF}-${diaF}T${horaF}:${minF}:${segF}`;

      let conflito = false;
      let motivoConflito = '';

      if (isHoje && m < agoraMinutos) {
        conflito = true;
        motivoConflito = 'Horário já ultrapassado';
      } else if (!isBloqueio) {
        conflito = checkConflitoHorario(inicioAgend, fimAgend, profissionalId);

        if (conflito) {
          const normalizarDataHora = (str: string): number => {
            if (!str) return 0;
            const limpo = str.replace('Z', '').split('+')[0];
            const [dStr, tStr] = limpo.split('T');
            if (!dStr || !tStr) return 0;
            const [ano, mes, dia] = dStr.split('-').map(Number);
            const [h, min] = (tStr || '00:00').split(':').map(Number);
            return Date.UTC(ano, mes - 1, dia, h || 0, min || 0, 0);
          };

          const testIni = normalizarDataHora(inicioAgend);
          const testFim = normalizarDataHora(fimAgend);

          const agConflitante = agendamentos.find(a => {
            if (a.status === 'cancelado' || a.status === 'falta') return false;
            if (a.profissional_id !== profissionalId) return false;
            const aIni = normalizarDataHora(a.inicio);
            const aFim = normalizarDataHora(a.fim);
            return Math.max(testIni, aIni) < Math.min(testFim, aFim);
          });

          if (agConflitante) {
            if (agConflitante.cliente_id === 'bloqueado') {
              motivoConflito = `Bloqueio: ${agConflitante.observacoes || 'Pessoal'}`;
            } else {
              const cli = clientes.find(c => c.id === agConflitante.cliente_id);
              motivoConflito = cli?.nome ? `Agendado: ${cli.nome}` : 'Horário Ocupado';
            }
          } else {
            motivoConflito = 'Horário Ocupado';
          }
        }
      }

      if (conflito) {
        ocupados.push({ hora: slot, motivo: motivoConflito });
      } else {
        livres.push(slot);
      }
    }

    return { livres, ocupados };
  }, [diaFechado, expedienteDoDia, dataSelecionada, duracaoMinutosAtual, isBloqueio, profissionalId, agendamentos, clientes, checkConflitoHorario]);

  const horasExpediente = analiseHorarios.livres;

  // Atualiza automaticamente o horário para o primeiro livre ao trocar de data ou serviço
  useEffect(() => {
    if (analiseHorarios.livres.length > 0 && !analiseHorarios.livres.includes(horaInicio)) {
      setHoraInicio(analiseHorarios.livres[0]);
    }
  }, [analiseHorarios.livres]);

  // Salvar agendamento
  const handleCriarAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAgendamento('');

    if (diaFechado) {
      setErrorAgendamento(`O salão não abre aos ${nomesDias[diaSemanaSelecionado]}s (Fechado). Por favor, selecione uma data de expediente.`);
      return;
    }

    // 1. Validações preliminares de dados
    if (!isBloqueio) {
      if (clienteExistente && !clienteId) {
        setErrorAgendamento('Selecione uma cliente.');
        return;
      }
      if (!clienteExistente && (!novoClienteNome.trim() || !novoClienteFone.trim())) {
        setErrorAgendamento('Preencha o nome e o telefone da nova cliente.');
        return;
      }
      if (servicosSelecionados.length === 0) {
        setErrorAgendamento('Selecione pelo menos um serviço.');
        return;
      }
      if (analiseHorarios.livres.length === 0) {
        setErrorAgendamento('Não há horários disponíveis para a duração selecionada neste dia. Escolha outra data.');
        return;
      }
      if (!analiseHorarios.livres.includes(horaInicio)) {
        setErrorAgendamento('O horário selecionado não está disponível. Por favor, escolha um dos horários livres.');
        return;
      }
    }

    // 2. Calcular valores e horários para verificar disponibilidade ANTES de cadastrar cliente
    const servs = servicos.filter(s => servicosSelecionados.includes(s.id));
    const total = isBloqueio ? 0 : servs.reduce((acc, s) => acc + s.preco, 0);
    const duracaoTotal = isBloqueio ? 30 : servs.reduce((acc, s) => acc + s.duracao_minutos, 0);

    const dataInicioStr = `${dataSelecionada}T${horaInicio}:00`;
    const dataInicio = new Date(dataInicioStr);
    const dataFim = new Date(dataInicio.getTime() + duracaoTotal * 60 * 1000);
    const ano = dataFim.getFullYear();
    const mes = String(dataFim.getMonth() + 1).padStart(2, '0');
    const dia = String(dataFim.getDate()).padStart(2, '0');
    const hora = String(dataFim.getHours()).padStart(2, '0');
    const min = String(dataFim.getMinutes()).padStart(2, '0');
    const seg = String(dataFim.getSeconds()).padStart(2, '0');
    const dataFimStr = `${ano}-${mes}-${dia}T${hora}:${min}:${seg}`;

    // 3. Avaliar conflito de horário em primeiro lugar (não cadastra cliente se conflitar)
    if (!isBloqueio && checkConflitoHorario(dataInicioStr, dataFimStr, profissionalId)) {
      setErrorAgendamento('O horário selecionado conflita com outro agendamento ativo desta profissional. Por favor, escolha outro horário.');
      return;
    }

    // 4. Se a disponibilidade foi aprovada, definir o cliente (reutilizando existente por telefone para evitar duplicatas)
    let cId = clienteId;

    if (isBloqueio) {
      cId = 'bloqueado';
    } else if (!clienteExistente) {
      const foneLimpo = novoClienteFone.replace(/\D/g, '');
      const cliExistente = clientes.find(c => c.telefone.replace(/\D/g, '') === foneLimpo);
      if (cliExistente) {
        cId = cliExistente.id;
      } else {
        const novoCli = addCliente({
          nome: novoClienteNome.trim(),
          telefone: novoClienteFone.trim(),
          consentimento_imagem: false
        });
        cId = novoCli.id;
      }
    }

    // Sinal e Status: se cobrarSinal estiver marcado, o agendamento VAI como 'pendente' (A confirmar)
    const valorSinalFinal = (isBloqueio || !cobrarSinal)
      ? 0
      : (valorSinalManual !== '' ? Number(valorSinalManual) : sinalSugeridoServicos);

    const statusFinal: 'bloqueado' | 'pendente' | 'confirmado' = isBloqueio
      ? 'bloqueado'
      : (cobrarSinal ? 'pendente' : 'confirmado');

    const res = addAgendamento({
      cliente_id: cId,
      profissional_id: profissionalId,
      inicio: dataInicioStr,
      status: statusFinal,
      valor_total: total,
      valor_sinal: valorSinalFinal,
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
      setCobrarSinal(false);
      setValorSinalManual('');
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
                          <h4 className="font-bold text-sm text-[#786150]">
                            Bloqueio: {a.observacoes 
                              ? a.observacoes.replace(/\[Google Agenda Oficial\]/gi, 'Google Agenda: ').replace(/ID:[a-zA-Z0-9_\-]+(\s*-\s*)?/gi, '').trim() 
                              : 'Sem detalhes'}
                          </h4>
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
                        <div className="space-y-1 relative">
                          {clienteSelecionadoObj ? (
                            <div className="flex items-center justify-between p-3 bg-white border border-[#8C6D58]/40 rounded-xl shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#FAF6F0] text-[#8C6D58] border border-[#EFECE6] flex items-center justify-center font-bold text-xs">
                                  {clienteSelecionadoObj.nome.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-[#5A4535] block leading-tight">{clienteSelecionadoObj.nome}</span>
                                  <span className="text-[11px] text-[#8C7A6B] block">{clienteSelecionadoObj.telefone || 'Sem telefone'}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteId('');
                                  setBuscaClienteModal('');
                                  setDropdownClienteAberto(true);
                                }}
                                className="text-xs font-semibold text-[#8C6D58] hover:text-[#5A4535] hover:underline px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Trocar</span>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="flex items-center gap-2 border border-[#EFECE6] rounded-xl px-3 py-2.5 bg-[#FAF9F6] focus-within:border-[#8C6D58] focus-within:bg-white transition-all shadow-2xs">
                                <Search size={15} className="text-[#8C7A6B] shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Digite para buscar por nome ou telefone..."
                                  value={buscaClienteModal}
                                  onChange={(e) => {
                                    setBuscaClienteModal(e.target.value);
                                    setDropdownClienteAberto(true);
                                  }}
                                  onFocus={() => setDropdownClienteAberto(true)}
                                  className="w-full text-xs text-[#5A4535] bg-transparent outline-none border-none focus:ring-0 p-0 placeholder:text-[#A88690]"
                                />
                                {buscaClienteModal && (
                                  <button
                                    type="button"
                                    onClick={() => setBuscaClienteModal('')}
                                    className="text-[#8C7A6B] hover:text-[#5A4535] p-0.5 cursor-pointer"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              {dropdownClienteAberto && (
                                <div className="absolute top-full left-0 right-0 mt-1 border border-[#EFECE6] rounded-xl bg-white shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-[#FAF9F6]">
                                  {clientesFiltradasModal.length === 0 ? (
                                    <div className="p-3 text-center space-y-2">
                                      <p className="text-xs text-[#8C7A6B]">Nenhuma cliente cadastrada encontrada.</p>
                                      {buscaClienteModal.trim() && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setClienteExistente(false);
                                            setNovoClienteNome(buscaClienteModal);
                                            setDropdownClienteAberto(false);
                                          }}
                                          className="text-xs font-bold text-[#8C6D58] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                        >
                                          <Plus size={12} />
                                          <span>Cadastrar "{buscaClienteModal}" como Nova Cliente</span>
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    clientesFiltradasModal.map(c => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setClienteId(c.id);
                                          setBuscaClienteModal('');
                                          setDropdownClienteAberto(false);
                                        }}
                                        className="w-full text-left p-2.5 hover:bg-[#FAF9F6] flex items-center justify-between transition-colors group cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-[#FAF6F0] text-[#8C6D58] flex items-center justify-center font-bold text-[10px] group-hover:bg-[#8C6D58] group-hover:text-white transition-colors">
                                            {c.nome.substring(0, 2).toUpperCase()}
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-[#5A4535] group-hover:text-[#8C6D58] transition-colors">{c.nome}</p>
                                            <p className="text-[10px] text-[#8C7A6B]">{c.telefone || 'Sem telefone'}</p>
                                          </div>
                                        </div>
                                        <span className="text-[10px] font-semibold text-[#8C6D58] opacity-0 group-hover:opacity-100 transition-opacity">
                                          Selecionar
                                        </span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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
                                    <span className="font-semibold block text-xs">{s.nome}</span>
                                  </div>
                                </div>
                                <span className="font-bold text-[10px]">{formatarMoeda(s.preco)}</span>
                              </label>
                            );
                          })
                        )}
                      </div>

                      {/* Painel Informativo de Tempo e Retorno do Agendamento */}
                      {resumoServicosSelecionados.selecionados.length > 0 && (
                        <div className="mt-2.5 p-3 bg-[#FDF9F6] border border-[#F2DFD5] rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                          <div className="flex items-center justify-between border-b border-[#F2DFD5]/70 pb-2">
                            <span className="font-bold text-[#5A4535] flex items-center gap-1.5">
                              <Clock size={13} className="text-[#8C6D58]" />
                              <span>Tempo e Duração do Atendimento:</span>
                            </span>
                            <span className="font-bold text-[#8C6D58]">
                              {resumoServicosSelecionados.duracaoExtenso}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5A4535]">
                            <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-[#F2DFD5]/50">
                              <Clock size={12} className="text-[#8C6D58] shrink-0" />
                              <div>
                                <span className="text-[#8C7A6B] block text-[9px] uppercase font-bold">Horário de Atendimento</span>
                                <strong>{horaInicio} às {resumoServicosSelecionados.horaTermino}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-[#F2DFD5]/50">
                              <RotateCcw size={12} className="text-[#8C6D58] shrink-0" />
                              <div>
                                <span className="text-[#8C7A6B] block text-[9px] uppercase font-bold">Sugestão de Retorno</span>
                                <strong>
                                  {resumoServicosSelecionados.diasRetorno > 0
                                    ? `${resumoServicosSelecionados.diasRetorno} dias (${resumoServicosSelecionados.dataSugeridaRetorno})`
                                    : 'Não exige retorno programado'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cobrar Sinal Toggle */}
                    <div className="mt-2 bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6] space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="cobrar_sinal_agend" className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            id="cobrar_sinal_agend" 
                            checked={cobrarSinal} 
                            onChange={(e) => {
                              const marcado = e.target.checked;
                              setCobrarSinal(marcado);
                              if (marcado && (valorSinalManual === '' || valorSinalManual === 0)) {
                                setValorSinalManual(sinalSugeridoServicos > 0 ? sinalSugeridoServicos : 20);
                              }
                            }}
                            className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58]"
                          />
                          <span className="text-xs text-[#5A4535] font-semibold">
                            Cobrar sinal / Deixar como "A confirmar"
                          </span>
                        </label>
                        {cobrarSinal && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                            ⏳ Entra em "A confirmar"
                          </span>
                        )}
                      </div>

                      {cobrarSinal && (
                        <div className="flex items-center gap-2 pt-1.5 border-t border-[#EFECE6] animate-in fade-in duration-150">
                          <label className="text-[11px] font-bold text-[#8C7A6B] uppercase">Valor do Sinal:</label>
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1.5 text-xs text-[#8C7A6B] font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={valorSinalManual}
                              onChange={(e) => setValorSinalManual(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0,00"
                              className="w-full border border-[#EFECE6] rounded-lg pl-8 pr-2 py-1 text-xs text-[#5A4535] bg-white font-bold focus:outline-none focus:border-[#8C6D58]"
                            />
                          </div>
                          <span className="text-[10px] text-[#8C7A6B]">
                            {sinalSugeridoServicos > 0 ? `(Configurado no serviço: R$ ${sinalSugeridoServicos.toFixed(2)})` : '(O agendamento aguardará confirmação)'}
                          </span>
                        </div>
                      )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Data</label>
                    <input 
                      type="date" 
                      value={dataSelecionada}
                      onChange={(e) => {
                        setDataSelecionada(e.target.value);
                        setErrorAgendamento('');
                      }}
                      className={`w-full border rounded-xl px-3 py-2 text-sm text-[#5A4535] bg-[#FAF9F6] focus:outline-none ${
                        diaFechado ? 'border-[#C81E1E] bg-[#FDF2F2]' : 'border-[#EFECE6]'
                      }`}
                    />
                    {diaFechado && (
                      <p className="text-[11px] text-[#C81E1E] font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Salão fechado aos {nomesDias[diaSemanaSelecionado]}s! Escolha outro dia.</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Horário de Início</label>
                    {analiseHorarios.livres.length === 0 ? (
                      <div className="border border-[#F2DFD5] rounded-xl px-3 py-2 text-xs text-[#C81E1E] bg-[#FDF9F6] font-medium">
                        Nenhum horário livre nesta data
                      </div>
                    ) : (
                      <select
                        value={horaInicio}
                        onChange={(e) => {
                          setHoraInicio(e.target.value);
                          setErrorAgendamento('');
                        }}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-sm text-[#5A4535] bg-[#FAF9F6] focus:outline-none font-medium"
                      >
                        {analiseHorarios.livres.map(h => (
                          <option key={h} value={h}>{h} (Disponível)</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Painel Visual de Horários Disponíveis e Ocupados */}
                {!diaFechado && (
                  <div className="space-y-3 bg-[#FAF9F6] p-3.5 rounded-xl border border-[#EFECE6]">
                    {/* Horários Livres */}
                    {analiseHorarios.livres.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-[#5A4535] flex items-center gap-1.5">
                            <CheckCircle size={13} className="text-emerald-600" />
                            <span>Horários Livres Disponíveis ({analiseHorarios.livres.length})</span>
                          </span>
                          <span className="text-[10px] text-[#8C7A6B]">Toque para selecionar</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {analiseHorarios.livres.map(h => {
                            const isSelected = horaInicio === h;
                            return (
                              <button
                                key={h}
                                type="button"
                                onClick={() => {
                                  setHoraInicio(h);
                                  setErrorAgendamento('');
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                  isSelected
                                    ? 'bg-[#8C6D58] text-white border-[#8C6D58] shadow-xs ring-2 ring-[#8C6D58]/20'
                                    : 'bg-white text-[#5A4535] border-[#EFECE6] hover:border-[#8C6D58] hover:bg-[#FDFBF7]'
                                }`}
                              >
                                {isSelected && <CheckCircle size={12} className="text-white shrink-0" />}
                                {h}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                        <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <strong className="block">Agenda cheia para este dia ou duração</strong>
                          <span>
                            Não há horários suficientes para comportar a duração total ({resumoServicosSelecionados.duracaoExtenso}). Escolha outra data ou profissional.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Horários Ocupados / Indisponíveis no dia */}
                    {analiseHorarios.ocupados.length > 0 && (
                      <div className="pt-2 border-t border-[#EFECE6]">
                        <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1.5">
                          Horários Indisponíveis neste dia ({analiseHorarios.ocupados.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {analiseHorarios.ocupados.map((item, idx) => (
                            <span
                              key={idx}
                              title={item.motivo}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-white text-[#A8988B] border border-[#EFECE6] line-through cursor-default"
                            >
                              <span>{item.hora}</span>
                              <span className="no-underline text-[9px] text-[#8C7A6B] font-normal">
                                ({item.motivo.length > 18 ? item.motivo.substring(0, 18) + '...' : item.motivo})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

              {/* Botões Footer com Aviso Logo Acima do Botão */}
              <div className="border-t border-[#EFECE6] p-4 sm:p-6 bg-white rounded-b-2xl shrink-0 space-y-3">
                {errorAgendamento && (
                  <div className="p-3 bg-[#FDF2F2] border border-[#FDE2E2] rounded-xl text-xs text-[#C81E1E] flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertTriangle size={16} className="shrink-0 text-[#C81E1E]" />
                    <span className="font-semibold">{errorAgendamento}</span>
                  </div>
                )}

                <div className="flex gap-2 justify-end items-center">
                  <button
                    type="button"
                    onClick={handleCloseLocalModal}
                    className="px-4 py-2.5 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={diaFechado || (!isBloqueio && analiseHorarios.livres.length === 0)}
                    className="px-5 py-2.5 bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    {isBloqueio ? 'Bloquear Horário' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
