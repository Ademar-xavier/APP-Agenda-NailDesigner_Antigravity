import React, { useState } from 'react';
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
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ setIsAdmin }) => {
  const { 
    servicos, 
    addAgendamento, 
    addCliente, 
    addListaEspera,
    clientes, 
    configSalao,
    obterProximoHorarioLivre,
    checkConflitoHorario
  } = useAppState();

  const [step, setStep] = useState<number>(1);
  
  // Agendamento State
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string>('2026-08-31'); // Padrão: Segunda-feira seguinte
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');
  
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

  const servsDisponiveis = servicos.filter(s => s.ativo);

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
      const fimAgend = dateFim.toISOString().replace(/\.\d+Z$/, '');

      // Verifica se há conflito
      const conflito = checkConflitoHorario(inicioAgend, fimAgend, 'u1');
      if (!conflito) {
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

    // 2. Criar Agendamento
    const dataInicioStr = `${dataSelecionada}T${horarioSelecionado}:00`;
    
    const res = addAgendamento({
      cliente_id: cId,
      profissional_id: 'u1',
      inicio: dataInicioStr,
      status: sinalTotal > 0 ? 'pendente' : 'confirmado',
      valor_total: precoTotal,
      valor_sinal: sinalTotal,
      observacoes,
      origem: 'cliente'
    }, servicosSelecionados);

    if (res.success && res.agendamento) {
      setCodigoReserva(res.agendamento.id);
      setValorSinal(sinalTotal);
      setValorTotal(precoTotal);
      setStep(4);
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
      data_preferida: dataSelecionada,
      periodo_preferido: periodoPreferido
    });

    setStep(6);
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
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-between pb-12 font-sans">
      
      {/* Botão de Atalho Administrativo no Topo */}
      <div className="w-full bg-[#8C6D58] text-white px-4 py-2 flex justify-between items-center text-xs">
        <span className="flex items-center gap-1">
          <Heart size={12} className="fill-white" />
          <span>Agendamento de Clientes</span>
        </span>
        <button
          onClick={() => setIsAdmin(true)}
          className="bg-white text-[#8C6D58] px-3 py-1 rounded-md font-bold hover:bg-[#FAF9F6] transition-colors"
        >
          Voltar ao Painel Admin
        </button>
      </div>

      {/* Conteúdo Principal do Fluxo */}
      <main className="w-full max-w-md bg-white border border-[#EFECE6] rounded-3xl p-6 shadow-md mt-6 mx-4">
        
        {/* Header da Marca (Updated container background to match the black logo) */}
        <div className="text-center mb-6 border-b border-[#FAF9F6] pb-4">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#E8DEC9] mx-auto flex items-center justify-center mb-3 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Logo Sheila" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-xl font-serif text-[#8C6D58] font-extrabold';
                  span.innerText = 'S';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
          <h2 className="font-serif font-bold text-xl text-[#5A4535]">{configSalao.nome}</h2>
          <p className="text-xs text-[#8C7A6B] mt-0.5">{configSalao.endereco}</p>
        </div>

        {/* STEP 1: SELEÇÃO DE SERVIÇOS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="font-serif font-bold text-base text-[#5A4535]">Selecione os Serviços</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">Escolha os procedimentos que deseja realizar</p>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {servsDisponiveis.map(s => {
                const checked = servicosSelecionados.includes(s.id);
                return (
                  <label 
                    key={s.id}
                    className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-colors ${
                      checked 
                        ? 'bg-[#F6ECE8] border-[#8C6D58] text-[#8C6D58]' 
                        : 'bg-white border-[#EFECE6] hover:bg-[#FAF9F6] text-[#5A4535]'
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
                        className="rounded text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                      />
                      <div>
                        <span className="font-semibold text-xs block">{s.nome}</span>
                        <span className="text-[10px] text-[#8C7A6B]">{s.duracao_minutos} min</span>
                      </div>
                    </div>
                    <span className="font-bold text-xs">{formatarMoeda(s.preco)}</span>
                  </label>
                );
              })}
            </div>

            {/* Sumário */}
            {servicosSelecionados.length > 0 && (
              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6] text-xs text-[#5A4535] space-y-1">
                <div className="flex justify-between">
                  <span>Duração Total:</span>
                  <span className="font-bold">{duracaoTotal} minutos</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-[#EFECE6]">
                  <span className="font-bold">Valor Total:</span>
                  <span className="font-extrabold text-[#8C6D58]">{formatarMoeda(precoTotal)}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={servicosSelecionados.length === 0}
              className="w-full bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Avançar para Data & Horário</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 2: DATA E HORA */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3 mb-2">
              <button onClick={() => setStep(1)} className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Escolha a Data & Horário</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Selecione o dia e horário que melhor atendem você</p>
              </div>
            </div>

            {/* Input de Data */}
            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Selecione a Data</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6]">
                <CalendarIcon size={14} className="text-[#8C6D58]" />
                <input 
                  type="date" 
                  min="2026-08-29"
                  value={dataSelecionada}
                  onChange={(e) => {
                    setDataSelecionada(e.target.value);
                    setHorarioSelecionado('');
                  }}
                  className="text-xs font-bold text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            {/* Grid de Horários Livres */}
            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-2">Horários Disponíveis</label>
              {horariosDisponiveis.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-[#D37F64] bg-[#F6ECE8] p-3 rounded-xl border border-[#F3ECE0] text-center font-medium">
                    Sem horários livres nesta data para os serviços escolhidos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
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
                            ? 'bg-[#8C6D58] text-white shadow-sm' 
                            : 'bg-white border border-[#EFECE6] hover:bg-[#FAF9F6] text-[#5A4535]'
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
              <button
                onClick={() => setStep(3)}
                disabled={!horarioSelecionado}
                className="w-full bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 mt-4"
              >
                <span>Avançar para Identificação</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* STEP 3: IDENTIFICAÇÃO DO CLIENTE */}
        {step === 3 && (
          <form onSubmit={handleFinalizarAgendamento} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3 mb-2">
              <button type="button" onClick={() => setStep(2)} className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Seus Dados</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Preencha com suas informações de contato</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Seu Nome Completo</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl">
                <User size={14} className="text-[#8C6D58]" />
                <input 
                  type="text" required placeholder="Ex: Amanda Santos..."
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="text-xs text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">WhatsApp de Contato</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl">
                <Phone size={14} className="text-[#8C6D58]" />
                <input 
                  type="text" required placeholder="Ex: (35) 99999-9999"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Alguma Observação? (Opcional)</label>
              <textarea 
                rows={2} placeholder="Se tiver preferências de cores, formatos ou alergias..."
                value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                className="w-full border border-[#EFECE6] rounded-xl p-2.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Concluir Agendamento</span>
              <Check size={14} />
            </button>
          </form>
        )}

        {/* STEP 4: CONFIRMAÇÃO DO AGENDAMENTO */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-[#5A4535]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center mx-auto">
                <Check size={24} />
              </div>
              <h3 className="font-serif font-bold text-lg">Agendamento Pré-Reservado!</h3>
              <p className="text-xs text-[#8C7A6B]">
                Olá, {nome}! Seu horário está garantido. Siga as orientações Pix abaixo para confirmá-lo.
              </p>
            </div>

            {/* Ficha Resumo */}
            <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8C7A6B]">Código da Reserva:</span>
                <span className="font-bold">{codigoReserva}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7A6B]">Data & Horário:</span>
                <span className="font-bold">{formatarDataLocal(dataSelecionada)} às {horarioSelecionado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7A6B]">Procedimento(s):</span>
                <span className="font-bold text-right max-w-[180px] truncate">
                  {servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).join(' + ')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EFECE6] text-sm">
                <span className="font-bold">Total do Atendimento:</span>
                <span className="font-extrabold text-[#8C6D58]">{formatarMoeda(valorTotal)}</span>
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
                    <p className="text-[9px] font-bold text-[#8C7A6B] uppercase">Chave Pix Copia-e-Cola</p>
                    <p className="font-semibold truncate text-[11px] mt-0.5">{configSalao.chave_pix}</p>
                  </div>
                  <button
                    onClick={handleCopiarPix}
                    className="bg-[#FAF9F6] border border-[#EFECE6] text-xs font-bold text-[#8C6D58] px-3 py-1.5 rounded-lg shrink-0 active:bg-gray-100 transition-colors"
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
              className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Fazer outro Agendamento
            </button>
          </div>
        )}

        {/* STEP 5: FORMULÁRIO DE LISTA DE ESPERA (Waitlist Form) */}
        {step === 5 && (
          <form onSubmit={handleFinalizarListaEspera} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3 mb-2">
              <button type="button" onClick={() => setStep(2)} className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Entrar na Lista de Espera</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Avise-nos de sua preferência caso surja alguma vaga</p>
              </div>
            </div>

            {errorWaitlist && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorWaitlist}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Seu Nome Completo</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl">
                <User size={14} className="text-[#8C6D58]" />
                <input 
                  type="text" required placeholder="Ex: Amanda Santos..."
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="text-xs text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">WhatsApp de Contato</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl">
                <Phone size={14} className="text-[#8C6D58]" />
                <input 
                  type="text" required placeholder="Ex: (35) 99999-9999"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Período de Preferência</label>
              <select
                value={periodoPreferido}
                onChange={(e: any) => setPeriodoPreferido(e.target.value)}
                className="w-full border border-[#EFECE6] bg-white rounded-xl p-2.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
              >
                <option value="qualquer">Qualquer período</option>
                <option value="manha">Período da Manhã</option>
                <option value="tarde">Período da Tarde</option>
                <option value="noite">Período da Noite</option>
              </select>
            </div>

            <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6] text-xs text-[#8C7A6B]">
              <p>Data pretendida: <strong>{formatarDataLocal(dataSelecionada)}</strong></p>
              <p className="mt-1">Serviço: <strong>{servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).join(', ')}</strong></p>
            </div>

            <button
              type="submit"
              className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Confirmar na Lista de Espera</span>
              <Check size={14} />
            </button>
          </form>
        )}

        {/* STEP 6: CONFIRMAÇÃO DA LISTA DE ESPERA (Waitlist Confirmation) */}
        {step === 6 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-[#5A4535] text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg">Inscrição Realizada com Sucesso!</h3>
            <p className="text-xs text-[#8C7A6B] leading-relaxed">
              Olá, <strong>{nome}</strong>! Você está na lista de espera para o dia <strong>{formatarDataLocal(dataSelecionada)}</strong> no período <strong>{periodoPreferido === 'qualquer' ? 'qualquer' : periodoPreferido}</strong>.
            </p>
            
            <p className="text-xs text-[#8C7A6B] leading-relaxed">
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
              className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Voltar ao Início
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#8C7A6B] mt-6 flex items-center justify-center gap-1">
        <span>Sheila Santos Nails Designer © 2026</span>
        <Heart size={10} className="fill-[#8C7A6B] text-[#8C7A6B]" />
      </footer>
    </div>
  );
};
