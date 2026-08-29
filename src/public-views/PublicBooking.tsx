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
  Share2, 
  Copy,
  ArrowLeft,
  Settings,
  Heart
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

  // Sinal Total
  const sinalTotal = servicosSelecionados.reduce((acc, id) => {
    const s = servicos.find(item => item.id === id);
    if (!s) return acc;
    if (s.sinal_tipo === 'fixo') return acc + s.sinal_valor;
    if (s.sinal_tipo === 'porcentagem') return acc + (s.preco * s.sinal_valor / 100);
    return acc;
  }, 0);

  // Gerar slots horários válidos de 30 em 30 minutos
  const obterHorariosDisponiveis = () => {
    if (!dataSelecionada) return [];

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
    if (!nome || !telefone || !horarioSelecionado) return;

    // 1. Cadastra cliente ficticiamente ou acha existente por telefone
    let cId = '';
    const existente = clientes.find(c => c.telefone.replace(/\D/g, '') === telefone.replace(/\D/g, ''));
    
    if (existente) {
      cId = existente.id;
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

  const handleCopiarPix = () => {
    navigator.clipboard.writeText(configSalao.chave_pix);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-between pb-12 font-sans">
      
      {/* Botão de Atalho Administrativo no Topo */}
      <div className="w-full bg-[#8C6D58] text-white px-4 py-2 flex justify-between items-center text-xs">
        <span className="flex items-center gap-1">
          <Heart size={12} className="fill-white" />
          <span>Demonstração de Agendamento do Cliente</span>
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
        
        {/* Header da Marca */}
        <div className="text-center mb-6 border-b border-[#FAF9F6] pb-4">
          <div className="w-16 h-16 rounded-full bg-[#FAF6F0] border border-[#EFECE6] mx-auto flex items-center justify-center mb-3 overflow-hidden">
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

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {servsDisponiveis.map(s => {
                const checked = servicosSelecionados.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between p-3.5 border rounded-2xl cursor-pointer transition-all ${
                      checked 
                        ? 'bg-[#F6ECE8] border-[#8C6D58] text-[#8C6D58] shadow-sm' 
                        : 'bg-white border-[#EFECE6] text-[#5A4535] hover:bg-[#FAF9F6]'
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
                        className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                      />
                      <div>
                        <span className="font-semibold text-xs block">{s.nome}</span>
                        <span className="text-[10px] text-[#8C7A6B] mt-0.5 block">{s.duracao_minutos} min</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-xs">{formatarMoeda(s.preco)}</span>
                  </label>
                );
              })}
            </div>

            {servicosSelecionados.length > 0 && (
              <div className="border-t border-[#EFECE6] pt-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase block">Total Selecionado:</span>
                  <span className="font-extrabold text-sm text-[#5A4535]">
                    {formatarMoeda(precoTotal)} <span className="text-xs font-normal text-[#8C7A6B]">({duracaoTotal} min)</span>
                  </span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <span>Continuar</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
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
                <p className="text-xs text-[#D37F64] bg-[#F6ECE8] p-3 rounded-xl border border-[#F3ECE0] text-center font-medium">
                  Sem horários livres nesta data para os serviços escolhidos. Tente outra data.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {horariosDisponiveis.map(slot => {
                    const selected = horarioSelecionado === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setHorarioSelecionado(slot)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          selected 
                            ? 'bg-[#8C6D58] text-white border-[#8C6D58] shadow-sm' 
                            : 'bg-white border-[#EFECE6] text-[#5A4535] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {horarioSelecionado && (
              <div className="border-t border-[#EFECE6] pt-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[#8C7A6B] uppercase block">Resumo:</span>
                  <span className="font-bold text-xs text-[#5A4535]">
                    {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} às {horarioSelecionado}
                  </span>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <span>Preencher Dados</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: DADOS PESSOAIS E CONFIRMAÇÃO */}
        {step === 3 && (
          <form onSubmit={handleFinalizarAgendamento} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3 mb-2">
              <button type="button" onClick={() => setStep(2)} className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Confirme Seus Dados</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Preencha seu contato para finalizar a reserva</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Seu Nome Completo</label>
                <input 
                  type="text" required placeholder="Ex: Amanda Silva..."
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Seu WhatsApp</label>
                <input 
                  type="text" required placeholder="Ex: (11) 99999-9999"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Observações / Recado</label>
                <textarea 
                  rows={2} placeholder="Ex: Gostaria de unhas amendoadas..."
                  value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6] resize-none"
                />
              </div>
            </div>

            {/* Política de Cancelamento */}
            <div className="bg-[#FAF9F6] p-3.5 border border-[#EFECE6] rounded-2xl text-[10px] text-[#8C7A6B] space-y-1.5">
              <span className="font-bold text-[#5A4535] block uppercase text-[9px]">Termos e Políticas</span>
              <p>• Cancelamentos permitidos com até <strong>{configSalao.regras.cancelamento_limite_horas} horas</strong> de antecedência.</p>
              {sinalTotal > 0 && (
                <p>• Este agendamento exige um pagamento de sinal de <strong>{formatarMoeda(sinalTotal)}</strong> via Pix para garantia do horário.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {sinalTotal > 0 ? 'Concluir Pré-Agendamento' : 'Confirmar Agendamento'}
            </button>
          </form>
        )}

        {/* STEP 4: SUCESSO (PAGAMENTO DO SINAL) */}
        {step === 4 && (
          <div className="space-y-5 text-center animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-[#E2F5EC] text-[#2B7A4B] rounded-full mx-auto flex items-center justify-center border border-[#C2EAD0]">
              <Check size={24} />
            </div>

            <div>
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">
                {valorSinal > 0 ? 'Pré-Agendamento Realizado!' : 'Agendamento Confirmado!'}
              </h3>
              <p className="text-xs text-[#8C7A6B] mt-1">
                {valorSinal > 0 
                  ? 'Efetue o pagamento do sinal para confirmar seu horário.' 
                  : 'Sua vaga está garantida! Te esperamos.'}
              </p>
            </div>

            {/* Detalhes Reserva */}
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EFECE6] text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8C7A6B]">Código da Reserva:</span>
                <span className="font-bold text-[#5A4535]">{codigoReserva}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7A6B]">Data & Horário:</span>
                <span className="font-bold text-[#5A4535]">
                  {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} às {horarioSelecionado}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#EFECE6]">
                <span className="text-[#8C7A6B]">Total Serviços:</span>
                <span className="font-bold text-[#5A4535]">{formatarMoeda(valorTotal)}</span>
              </div>
              {valorSinal > 0 && (
                <div className="flex justify-between text-[#8C6D58] font-bold">
                  <span>Sinal a Pagar (Pix):</span>
                  <span>{formatarMoeda(valorSinal)}</span>
                </div>
              )}
            </div>

            {/* Pix Copy and Paste (se aplicável) */}
            {valorSinal > 0 && (
              <div className="p-4 bg-[#F6ECE8] rounded-2xl border border-[#F3ECE0] text-left space-y-3">
                <span className="font-bold text-[10px] uppercase text-[#8C6D58] block">Chave Pix (E-mail)</span>
                <div className="flex gap-2">
                  <input 
                    type="text" readOnly value={configSalao.chave_pix}
                    className="w-full bg-white border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] outline-none"
                  />
                  <button 
                    onClick={handleCopiarPix}
                    className="bg-[#8C6D58] hover:bg-[#725743] text-white p-2 rounded-lg transition-colors shrink-0"
                    title="Copiar Pix"
                  >
                    {copiado ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-[#8C7A6B] leading-relaxed">
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
              className="w-full border border-[#EFECE6] hover:bg-[#FAF9F6] text-[#8C7A6B] py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              Fazer Outro Agendamento
            </button>
          </div>
        )}

      </main>

      {/* Footer Fictício */}
      <footer className="text-center text-[10px] text-[#8C7A6B] mt-8 flex items-center justify-center gap-1">
        <span>Desenvolvido com carinho para {configSalao.proprietaria}</span>
        <Heart size={10} className="fill-[#8C6D58] text-[#8C6D58]" />
      </footer>
    </div>
  );
};
