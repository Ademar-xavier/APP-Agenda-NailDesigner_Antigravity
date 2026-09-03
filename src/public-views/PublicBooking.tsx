import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  DollarSign, 
  Copy,
  Heart,
  Users
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico } from '../types';

interface PublicBookingProps {
  setIsAdmin: (isAdmin: boolean) => void;
  clientePreselecionado?: { id: string; nome: string; telefone: string } | null;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ setIsAdmin, clientePreselecionado }) => {
  const { 
    servicos, 
    addAgendamento, 
    addCliente, 
    addListaEspera,
    clientes, 
    configSalao,
    obterProximoHorarioLivre,
    checkConflitoHorario,
    equipe,
    logout
  } = useAppState();

  const [step, setStep] = useState<number>(1);
  
  // Agendamento State
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');

  // Profissional Selecionada
  const [profissionalId, setProfissionalId] = useState<string>(''); // Vazio = Qualquer profissional disponível
  const profissionaisAtivas = (equipe || []).filter(e => e.ativo !== false);
  const profissionaisAptas = useMemo(() => {
    if (servicosSelecionados.length === 0) return profissionaisAtivas;
    const aptas = profissionaisAtivas.filter(p => {
      if (!p.servicos_habilitados || p.servicos_habilitados.length === 0) return true;
      return servicosSelecionados.every(sId => p.servicos_habilitados!.includes(sId));
    });
    return aptas.length > 0 ? aptas : profissionaisAtivas;
  }, [profissionaisAtivas, servicosSelecionados]);
  
  // Cliente State
  const [nome, setNome] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  
  // Lista de Espera State
  const [periodoPreferido, setPeriodoPreferido] = useState<'manha' | 'tarde' | 'noite' | 'qualquer'>('qualquer');
  const [errorWaitlist, setErrorWaitlist] = useState<string>('');
  
  // Tela Final
  const [codigoReserva, setCodigoReserva] = useState<string>('');
  const [valorSinal, setValorSinal] = useState<number>(0);
  const [valorTotal, setValorTotal] = useState<number>(0);
  const [copiado, setCopiado] = useState<boolean>(false);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const profSelecionada = equipe.find(e => e.id === profissionalId);
  const servsDisponiveis = useMemo(() => {
    return servicos.filter(s => {
      if (!s.ativo) return false;
      if (!profSelecionada?.servicos_habilitados || profSelecionada.servicos_habilitados.length === 0) {
        return true;
      }
      return profSelecionada.servicos_habilitados.includes(s.id);
    });
  }, [servicos, profSelecionada]);

  // Duração e Preço Totais
  const duracaoTotal = servicosSelecionados.reduce((acc, id) => {
    const s = servicos.find(item => item.id === id);
    return acc + (s?.duracao_minutos || 0);
  }, 0);

  const precoTotal = servicosSelecionados.reduce((acc, id) => {
    const s = servicos.find(item => item.id === id);
    return acc + (s?.preco || 0);
  }, 0);

  // Sinal Exigido (soma dos sinais dos serviços selecionados)
  const sinalTotal = servicosSelecionados.reduce((acc, id) => {
    const s = servicos.find(item => item.id === id);
    if (!s) return acc;
    if (s.sinal_tipo === 'fixo') return acc + s.sinal_valor;
    if (s.sinal_tipo === 'porcentagem') return acc + (s.preco * s.sinal_valor / 100);
    return acc;
  }, 0);

  // Cálculo inteligente de horários disponíveis para o dia selecionado
  const obterHorariosDisponiveis = (): string[] => {
    const diaSemana = new Date(dataSelecionada + 'T00:00:00').getDay();
    const expediente = configSalao.horarios_trabalho[diaSemana];

    if (!expediente || !expediente.ativo) return [];

    const [hInicio, mInicio] = expediente.inicio.split(':').map(Number);
    const [hFim, mFim] = expediente.fim.split(':').map(Number);
    
    const inicioMinutos = hInicio * 60 + mInicio;
    const fimMinutos = hFim * 60 + mFim;
    
    const slots: string[] = [];

    for (let min = inicioMinutos; min <= fimMinutos - duracaoTotal; min += 30) {
      const hStr = String(Math.floor(min / 60)).padStart(2, '0');
      const mStr = String(min % 60).padStart(2, '0');
      const slot = `${hStr}:${mStr}`;
      
      const inicioAgend = `${dataSelecionada}T${hStr}:${mStr}:00`;
      const dateInicio = new Date(inicioAgend);
      const dateFim = new Date(dateInicio.getTime() + duracaoTotal * 60 * 1000);
      const anoF = dateFim.getFullYear();
      const mesF = String(dateFim.getMonth() + 1).padStart(2, '0');
      const diaF = String(dateFim.getDate()).padStart(2, '0');
      const horaF = String(dateFim.getHours()).padStart(2, '0');
      const minF = String(dateFim.getMinutes()).padStart(2, '0');
      const segF = String(dateFim.getSeconds()).padStart(2, '0');
      const fimAgend = `${anoF}-${mesF}-${diaF}T${horaF}:${minF}:${segF}`;

      // Verifica se há vaga para a profissional selecionada ou se qualquer uma está livre
      let temVaga = false;
      if (profissionalId) {
        temVaga = !checkConflitoHorario(inicioAgend, fimAgend, profissionalId);
      } else {
        temVaga = profissionaisAptas.length === 0 
          ? !checkConflitoHorario(inicioAgend, fimAgend, 'u1')
          : profissionaisAptas.some(p => !checkConflitoHorario(inicioAgend, fimAgend, p.id));
      }

      if (temVaga) {
        slots.push(slot);
      }
    }

    return slots;
  };

  const horariosDisponiveis = obterHorariosDisponiveis();

  // Finalizar Agendamento
  const handleFinalizarAgendamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) return;

    // 1. Identificar ou Cadastrar Cliente
    let cId = '';
    const cliExistente = clientes.find(c => c.telefone.replace(/\D/g, '') === telefone.replace(/\D/g, ''));
    if (cliExistente) {
      cId = cliExistente.id;
    } else {
      const novoCli = addCliente({
        nome,
        telefone,
        consentimento_imagem: true
      });
      cId = novoCli.id;
    }

    // 2. Definir Profissional Atendente
    const dataInicioStr = `${dataSelecionada}T${horarioSelecionado}:00`;
    const dateInicio = new Date(dataInicioStr);
    const dateFim = new Date(dateInicio.getTime() + duracaoTotal * 60 * 1000);
    const anoF = dateFim.getFullYear();
    const mesF = String(dateFim.getMonth() + 1).padStart(2, '0');
    const diaF = String(dateFim.getDate()).padStart(2, '0');
    const horaF = String(dateFim.getHours()).padStart(2, '0');
    const minF = String(dateFim.getMinutes()).padStart(2, '0');
    const segF = String(dateFim.getSeconds()).padStart(2, '0');
    const dataFimStr = `${anoF}-${mesF}-${diaF}T${horaF}:${minF}:${segF}`;

    let profFinalId = profissionalId;
    if (!profFinalId) {
      const livre = profissionaisAptas.find(p => !checkConflitoHorario(dataInicioStr, dataFimStr, p.id));
      profFinalId = livre ? livre.id : (profissionaisAptas[0]?.id || 'u1');
    }

    const profNome = profissionaisAptas.find(p => p.id === profFinalId)?.nome || 'Sheila Santos';
    const obsComProf = observacoes ? `[Atendente: ${profNome}] ${observacoes}` : `[Atendente: ${profNome}]`;

    const res = addAgendamento({
      cliente_id: cId,
      profissional_id: profFinalId,
      inicio: dataInicioStr,
      status: sinalTotal > 0 ? 'pendente' : 'confirmado',
      valor_total: precoTotal,
      valor_sinal: sinalTotal,
      observacoes: obsComProf,
      origem: 'cliente'
    }, servicosSelecionados);

    if (res.success && res.agendamento) {
      setCodigoReserva(res.agendamento.id);
      setValorSinal(sinalTotal);
      setValorTotal(precoTotal);
      setStep(5);
    }
  };

  // Finalizar Lista de Espera
  const handleFinalizarListaEspera = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWaitlist('');

    if (!nome || !telefone) {
      setErrorWaitlist('Preencha seu nome e telefone.');
      return;
    }

    let cId = '';
    const cliExistente = clientes.find(c => c.telefone.replace(/\D/g, '') === telefone.replace(/\D/g, ''));
    if (cliExistente) {
      cId = cliExistente.id;
    } else {
      const novoCli = addCliente({
        nome,
        telefone,
        consentimento_imagem: true
      });
      cId = novoCli.id;
    }

    // Adiciona na lista de espera
    addListaEspera({
      cliente_id: cId,
      servico_id: servicosSelecionados[0] || 's1', // Vincula ao primeiro serviço selecionado
      profissional_id: profissionalId || undefined,
      data_preferida: dataSelecionada,
      periodo_preferido: periodoPreferido
    });

    setStep(7);
  };

  const handleCopiarPix = () => {
    navigator.clipboard.writeText(configSalao.chave_pix);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const formatarDataLocal = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between pb-12 font-sans relative overflow-hidden"
      style={{ backgroundImage: "url('bg_nail.jpg')" }}
    >
      
      {/* Background Pink/Rose overlay to ensure premium branding and readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5F7]/40 via-[#FFEBEF]/55 to-[#FAD0DC]/70 backdrop-blur-[1px] pointer-events-none" />

      {/* Decorative ambient glowing circles */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-[#FFD1DC] opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-[#E57399] opacity-20 blur-3xl pointer-events-none" />

      {/* Botão de Atalho Administrativo no Topo */}
      <div className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white px-4 py-2.5 flex justify-between items-center text-xs relative z-20 shadow-sm">
        <span className="flex items-center gap-1.5 font-semibold">
          <Heart size={12} className="fill-white animate-pulse" />
          <span>Agendamento Online · Sheila Santos</span>
        </span>
        <button
          onClick={() => {
            logout();
            window.location.hash = 'admin';
            setIsAdmin(true);
          }}
          className="bg-white text-[#C71585] px-3 py-1 rounded-lg font-bold hover:bg-[#FFF0F4] transition-colors shadow-sm"
        >
          Painel Administrativo
        </button>
      </div>

      {/* Conteúdo Principal do Fluxo */}
      <main className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-[#FAD0DC]/50 rounded-3xl p-6 shadow-xl mt-6 mx-4 relative z-10">
        
        {/* Header da Marca (Updated container background to match the black logo) */}
        <div className="text-center mb-6 border-b border-[#FFF0F4] pb-4">
          <div className="w-24 h-24 rounded-full bg-white border-2 border-[#FCE4EC] mx-auto flex items-center justify-center mb-3 overflow-hidden shadow-md p-0.5">
            <img 
              src="./logo.png" 
              alt="Logo Sheila Santos Nails Designer" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-2xl font-serif text-[#D48B70] font-extrabold';
                  span.innerText = 'SS';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
          <h2 className="font-serif font-extrabold text-2xl text-[#5A3F45] tracking-wide">{configSalao.nome}</h2>
          <p className="text-xs text-[#A88690] mt-1 font-medium">{configSalao.endereco}</p>
        </div>

        {/* STEP 1: ESCOLHA DA PROFISSIONAL */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="font-serif font-bold text-base text-[#5A3F45]">Escolha a Profissional</h3>
              <p className="text-xs text-[#A88690] mt-0.5">Selecione quem irá realizar o seu atendimento</p>
            </div>

            <div className="space-y-2.5">
              {/* Opção Qualquer Profissional */}
              <button
                type="button"
                onClick={() => {
                  setProfissionalId('');
                  setServicosSelecionados([]);
                  setHorarioSelecionado('');
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  profissionalId === ''
                    ? 'bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white border-transparent shadow-md'
                    : 'bg-white border-[#FAD0DC]/50 text-[#5A3F45] hover:border-[#DB7093]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    profissionalId === '' ? 'bg-white/20 text-white' : 'bg-[#FFF0F4] text-[#DB7093]'
                  }`}>
                    🌟
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Qualquer Profissional Disponível</h4>
                    <p className={`text-[10px] mt-0.5 ${profissionalId === '' ? 'text-pink-100' : 'text-[#A88690]'}`}>
                      Maior flexibilidade e horários livres
                    </p>
                  </div>
                </div>
                {profissionalId === '' && <Check size={18} className="text-white shrink-0" />}
              </button>

              {/* Lista das Profissionais da Equipe */}
              {profissionaisAtivas.map(p => {
                const isSelected = profissionalId === p.id;
                const totalProcedimentos = p.servicos_habilitados?.length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProfissionalId(p.id);
                      setServicosSelecionados([]);
                      setHorarioSelecionado('');
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white border-transparent shadow-md'
                        : 'bg-white border-[#FAD0DC]/50 text-[#5A3F45] hover:border-[#DB7093]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#FFF0F4] text-[#DB7093]'
                      }`}>
                        💅
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">{p.nome}</h4>
                        <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-pink-100' : 'text-[#A88690]'}`}>
                          {p.perfil === 'admin' ? 'Especialista Master' : 'Designer'} · {totalProcedimentos ? `${totalProcedimentos} procedimentos` : 'Todos os procedimentos'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check size={18} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Continuar para Escolha dos Serviços</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 2: SELEÇÃO DE SERVIÇOS (Filtrados pela profissional escolhida) */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#FAD0DC]/50 pb-3 mb-2">
              <button type="button" onClick={() => setStep(1)} className="p-1 rounded-full hover:bg-[#FFF0F4]/30 text-[#A88690]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Selecione os Serviços</h3>
                <p className="text-xs text-[#A88690] mt-0.5">
                  Atendente: <strong className="text-[#C71585]">{profSelecionada ? profSelecionada.nome : 'Qualquer Profissional'}</strong>
                </p>
              </div>
            </div>
 
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {servsDisponiveis.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#A88690] bg-[#FFF5F7]/30 rounded-2xl border border-[#FAD0DC]/50">
                  Nenhum procedimento cadastrado para esta profissional.
                </div>
              ) : (
                servsDisponiveis.map(s => {
                  const checked = servicosSelecionados.includes(s.id);
                  return (
                    <label 
                      key={s.id}
                      className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-colors ${
                        checked 
                          ? 'bg-[#FFF0F4] border-[#DB7093] text-[#C71585]' 
                          : 'bg-white border-[#FAD0DC]/30 hover:bg-[#FFF0F4]/30 text-[#5A3F45]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setServicosSelecionados(prev => [...prev, s.id]);
                            } else {
                              setServicosSelecionados(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded text-[#DB7093] focus:ring-[#DB7093] h-4 w-4"
                        />
                        <div>
                          <span className="font-semibold text-xs block text-[#5A3F45]">{s.nome}</span>
                          {s.descricao && (
                            <span className="text-[10px] text-[#A88690] block mt-0.5 max-w-[240px] leading-relaxed italic">
                              {s.descricao}
                            </span>
                          )}
                          <span className="text-[10px] text-[#A88690] block mt-1">Duração total: <strong>{s.duracao_minutos} min</strong></span>
                          
                          {/* Se for Pacote, detalha os serviços internos para o cliente */}
                          {s.is_pacote && (s.servicos_pacote_detalhes || (s.servicos_pacote || []).map(id => ({ servico_id: id, quantidade: 1 }))).length > 0 && (
                            <div className="mt-2 bg-[#FFF9FB] p-2.5 rounded-xl border border-[#FAD0DC]/30 space-y-1.5 max-w-[280px] text-[10px] text-[#5A3F45] text-left">
                              <span className="font-bold text-[#C71585] block">Composição do Combo:</span>
                              {(s.servicos_pacote_detalhes || (s.servicos_pacote || []).map(id => ({ servico_id: id, quantidade: 1 }))).map((det, idx) => {
                                const sub = servicos.find(item => item.id === det.servico_id);
                                return sub ? (
                                  <div key={idx} className="flex flex-col pl-2 border-l border-[#DB7093] py-0.5 space-y-0.5">
                                    <div className="flex justify-between font-bold text-[#5A3F45]">
                                      <span>{det.quantidade}x {sub.nome}</span>
                                    </div>
                                    {sub.descricao && (
                                      <span className="text-[8px] text-[#A88690] leading-snug italic">"{sub.descricao}"</span>
                                    )}
                                    <span className="text-[8px] text-[#C71585] font-semibold flex items-center gap-1">
                                      <span>⏱️ Retorno recomendado: a cada {sub.intervalo_manutencao_dias > 0 ? `${sub.intervalo_manutencao_dias} dias` : 'Não exige'}</span>
                                    </span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-xs">{formatarMoeda(s.preco)}</span>
                    </label>
                  );
                })
              )}
            </div>
 
            {/* Sumário */}
            {servicosSelecionados.length > 0 && (
              <div className="bg-[#FFF0F4] p-3 rounded-xl border border-[#FAD0DC]/30 text-xs text-[#5A3F45] space-y-1">
                <div className="flex justify-between">
                  <span>Duração Total:</span>
                  <span className="font-bold">{duracaoTotal} minutos</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-[#FAD0DC]/30">
                  <span className="font-bold">Valor Total:</span>
                  <span className="font-extrabold text-[#C71585]">{formatarMoeda(precoTotal)}</span>
                </div>
              </div>
            )}
 
            <button
              onClick={() => setStep(3)}
              disabled={servicosSelecionados.length === 0}
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Avançar para Data & Horário</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 3: DATA E HORA */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3 mb-2">
              <button onClick={() => setStep(2)} className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Escolha a Data & Horário</h3>
                <p className="text-xs text-[#A88690] mt-0.5">
                  Profissional: <strong className="text-[#C71585]">{profSelecionada ? profSelecionada.nome : 'Qualquer Profissional'}</strong>
                </p>
              </div>
            </div>

            {/* Input de Data */}
            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Selecione a Data</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-[#FFF5F7]/50">
                <CalendarIcon size={14} className="text-[#DB7093]" />
                <input 
                  type="date" 
                  min={new Date().toLocaleDateString('en-CA')}
                  value={dataSelecionada}
                  onChange={(e) => {
                    setDataSelecionada(e.target.value);
                    setHorarioSelecionado('');
                  }}
                  className="text-xs font-bold text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            {/* Grid de Horários Livres */}
            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-2">Horários Disponíveis</label>
              {horariosDisponiveis.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-[#C71585] bg-[#FFF0F4] p-3 rounded-xl border border-[#FAD0DC]/30 text-center font-medium">
                    Sem horários livres nesta data para os serviços escolhidos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(6)}
                    className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Users size={14} />
                    <span>Entrar na Lista de Espera</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {horariosDisponiveis.map(slot => {
                    const selected = horarioSelecionado === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setHorarioSelecionado(slot)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          selected 
                            ? 'bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white shadow-sm' 
                            : 'bg-white border border-[#FAD0DC]/30 hover:bg-[#FFF0F4]/30 text-[#5A3F45]'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {horariosDisponiveis.length > 0 && (
              <div className="space-y-3 mt-4">
                <button
                  onClick={() => setStep(4)}
                  disabled={!horarioSelecionado}
                  className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Avançar para Identificação</span>
                  <ChevronRight size={14} />
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="w-full bg-white border border-dashed border-[#DB7093] text-[#C71585] hover:bg-[#FFF0F4]/30 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Users size={13} />
                  <span>Não encontrou seu horário? Entrar na lista de espera</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: IDENTIFICAÇÃO DO CLIENTE */}
        {step === 4 && (
          <form onSubmit={handleFinalizarAgendamento} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#FAD0DC]/50 pb-3 mb-2">
              <button type="button" onClick={() => setStep(3)} className="p-1 rounded-full hover:bg-[#FFF0F4]/30 text-[#A88690]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Seus Dados</h3>
                <p className="text-xs text-[#A88690] mt-0.5">Preencha com suas informações de contato</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Seu Nome Completo</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <User size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: Amanda Santos..."
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">WhatsApp de Contato</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <Phone size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: (35) 99999-9999"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Alguma Observação? (Opcional)</label>
              <textarea 
                rows={2} placeholder="Se tiver preferências de cores, formatos ou alergias..."
                value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                className="w-full border border-[#FAD0DC]/50 rounded-xl p-2.5 text-xs text-[#5A3F45] focus:outline-none focus:border-[#DB7093] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Concluir Agendamento</span>
              <Check size={14} />
            </button>
          </form>
        )}

        {/* STEP 5: CONFIRMAÇÃO DO AGENDAMENTO */}
        {step === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-[#5A3F45]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center mx-auto">
                <Check size={24} />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#5A3F45]">Agendamento Pré-Reservado!</h3>
              <p className="text-xs text-[#A88690]">
                Olá, {nome}! Seu horário está garantido. Siga as orientações Pix abaixo para confirmá-lo.
              </p>
            </div>

            {/* Ficha Resumo */}
            <div className="bg-[#FFF5F7]/30 border border-[#FAD0DC]/50 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A88690]">Código da Reserva:</span>
                <span className="font-bold tracking-wider text-[#C71585]">{codigoReserva}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A88690]">Data & Horário:</span>
                <span className="font-bold">{formatarDataLocal(dataSelecionada)} às {horarioSelecionado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A88690]">Atendente:</span>
                <span className="font-bold">{profSelecionada ? profSelecionada.nome : 'Sheila Santos'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A88690]">Procedimento(s):</span>
                <span className="font-bold text-right max-w-[180px] truncate">
                  {servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).join(' + ')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#FAD0DC]/50 text-sm">
                <span className="font-bold">Total do Atendimento:</span>
                <span className="font-extrabold text-[#C71585]">{formatarMoeda(valorTotal)}</span>
              </div>
            </div>

            {/* Regras de Sinal */}
            {valorSinal > 0 && (
              <div className="bg-[#FFF9E6] border border-[#FFEBAA] rounded-2xl p-4 text-xs space-y-3">
                <h4 className="font-bold text-[#856404] flex items-center gap-1.5">
                  <Sparkles size={14} className="fill-[#856404]" />
                  <span>Sinal de Confirmação Exigido</span>
                </h4>
                
                <p className="text-[11px] text-[#856404] leading-relaxed">
                  Para confirmar sua reserva, efetue o pagamento do sinal de <strong>{formatarMoeda(valorSinal)}</strong> via Pix. O restante do valor será quitado no dia do procedimento.
                </p>

                <div className="flex items-center justify-between bg-white border border-[#FFEBAA] rounded-xl px-3 py-2">
                  <div className="overflow-hidden pr-2">
                    <p className="text-[9px] font-bold text-[#A88690] uppercase">Chave Pix Copia-e-Cola</p>
                    <p className="font-semibold truncate text-[11px] mt-0.5">{configSalao.chave_pix}</p>
                  </div>
                  <button
                    onClick={handleCopiarPix}
                    className="bg-[#FFF5F7]/30 border border-[#FAD0DC]/50 text-xs font-bold text-[#C71585] px-3 py-1.5 rounded-lg shrink-0 active:bg-gray-100 transition-colors"
                  >
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <p className="text-[9px] text-[#A1813A] italic">
                  {configSalao.instrucoes_pix}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setStep(1);
                setServicosSelecionados([]);
                setHorarioSelecionado('');
                setNome('');
                setTelefone('');
                setObservacoes('');
              }}
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Fazer outro Agendamento
            </button>
          </div>
        )}

        {/* STEP 6: FORMULÁRIO DE LISTA DE ESPERA (Waitlist Form) */}
        {step === 6 && (
          <form onSubmit={handleFinalizarListaEspera} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#FAD0DC]/50 pb-3 mb-2">
              <button type="button" onClick={() => setStep(3)} className="p-1 rounded-full hover:bg-[#FFF0F4]/30 text-[#A88690]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Entrar na Lista de Espera</h3>
                <p className="text-xs text-[#A88690] mt-0.5">Avise-nos de sua preferência caso surja alguma vaga</p>
              </div>
            </div>

            {errorWaitlist && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorWaitlist}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Seu Nome Completo</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <User size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: Amanda Santos..."
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">WhatsApp de Contato</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <Phone size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: (35) 99999-9999"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Profissional de Preferência</label>
              <select
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="w-full border border-[#FAD0DC]/50 bg-white rounded-xl p-2.5 text-xs text-[#5A3F45] focus:outline-none focus:border-[#DB7093]"
              >
                <option value="">Qualquer profissional disponível</option>
                {profissionaisAtivas.map(p => (
                  <option key={p.id} value={p.id}>💅 {p.nome} ({p.perfil === 'admin' ? 'Master' : 'Designer'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Período de Preferência</label>
              <select
                value={periodoPreferido}
                onChange={(e: any) => setPeriodoPreferido(e.target.value)}
                className="w-full border border-[#FAD0DC]/50 bg-white rounded-xl p-2.5 text-xs text-[#5A3F45] focus:outline-none focus:border-[#DB7093]"
              >
                <option value="qualquer">Qualquer período</option>
                <option value="manha">Período da Manhã</option>
                <option value="tarde">Período da Tarde</option>
                <option value="noite">Período da Noite</option>
              </select>
            </div>

            <div className="bg-[#FFF5F7]/30 p-3 rounded-xl border border-[#FAD0DC]/50 text-xs text-[#A88690]">
              <p>Data pretendida: <strong>{formatarDataLocal(dataSelecionada)}</strong></p>
              <p className="mt-1">Serviço: <strong>{servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).join(', ')}</strong></p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Confirmar na Lista de Espera</span>
              <Check size={14} />
            </button>
          </form>
        )}

        {/* STEP 7: CONFIRMAÇÃO DA LISTA DE ESPERA (Waitlist Confirmation) */}
        {step === 7 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-[#5A3F45] text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#5A3F45]">Inscrição Realizada com Sucesso!</h3>
            <p className="text-xs text-[#A88690] leading-relaxed">
              Olá, <strong>{nome}</strong>! Você está na lista de espera para o dia <strong>{formatarDataLocal(dataSelecionada)}</strong> no período <strong>{periodoPreferido === 'qualquer' ? 'qualquer' : periodoPreferido}</strong>.
            </p>
            
            <p className="text-xs text-[#A88690] leading-relaxed">
              Entraremos em contato via WhatsApp caso haja alguma desistência de horário.
            </p>

            <button
              onClick={() => {
                setStep(1);
                setServicosSelecionados([]);
                setHorarioSelecionado('');
                setNome('');
                setTelefone('');
                setObservacoes('');
              }}
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Voltar ao Início
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#A88690] mt-6 flex items-center justify-center gap-1 relative z-10">
        <span>Sheila Santos Nails Designer © 2026</span>
        <Heart size={10} className="fill-[#DB7093] text-[#DB7093]" />
      </footer>
    </div>
  );
};
