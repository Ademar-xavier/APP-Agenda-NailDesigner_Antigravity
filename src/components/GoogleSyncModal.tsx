import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  UserCheck, 
  UserPlus, 
  Globe,
  Tag,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

interface GoogleSyncModalProps {
  onClose: () => void;
}

interface EventoGoogle {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  servicoId: string;
  inicio: string; // YYYY-MM-DDTHH:MM:ss
  periodo: string;
  tituloOriginal: string;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({ onClose }) => {
  const { 
    clientes, 
    servicos, 
    googleConnected, 
    googleUserEmail, 
    conectarGoogleAgenda, 
    desconectarGoogleAgenda,
    sincronizarGoogleAgenda 
  } = useAppState();

  const [simulandoLogin, setSimulandoLogin] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');

  // Gerador dinâmico de eventos do dia 27/08 até 31/12/2026 com base nos prints
  const eventosGoogleAteFimDe2026 = useMemo((): EventoGoogle[] => {
    const eventos: EventoGoogle[] = [];
    const dataInicial = new Date('2026-08-27T09:00:00');
    const dataLimite = new Date('2026-12-31T23:59:59');
    
    let idCounter = 1;
    let dataAtual = new Date(dataInicial);

    while (dataAtual <= dataLimite) {
      // Quinta-feira (conforme print de 27 de agosto)
      if (dataAtual.getDay() === 4) {
        const dataStr = dataAtual.toISOString().split('T')[0];

        // 1. Cris às 09:00
        eventos.push({
          id: `g_gen_${idCounter++}`,
          clienteNome: 'Cris',
          clienteTelefone: '(35) 99712-4455',
          servicoNome: 'Manicure simples',
          servicoId: 's9',
          inicio: `${dataStr}T09:00:00`,
          periodo: 'manhã',
          tituloOriginal: 'Cris'
        });

        // 2. Fernanda às 09:30 (Alongamento ou Manutenção a cada duas semanas)
        const isAlongamento = idCounter % 2 === 0;
        eventos.push({
          id: `g_gen_${idCounter++}`,
          clienteNome: 'Fernanda',
          clienteTelefone: '(35) 99182-3344',
          servicoNome: isAlongamento ? 'Alongamento em fibra' : 'Manutenção de alongamento',
          servicoId: isAlongamento ? 's1' : 's3',
          inicio: `${dataStr}T09:30:00`,
          periodo: 'manhã',
          tituloOriginal: isAlongamento ? 'Fernanda alongamento' : 'Fernanda manutenção'
        });

        // 3. Olinda às 13:00
        eventos.push({
          id: `g_gen_${idCounter++}`,
          clienteNome: 'Olinda',
          clienteTelefone: '(35) 98877-0099',
          servicoNome: 'Manicure simples',
          servicoId: 's9',
          inicio: `${dataStr}T13:00:00`,
          periodo: 'tarde',
          tituloOriginal: 'Olinda'
        });

        // 4. Luiza às 14:00
        eventos.push({
          id: `g_gen_${idCounter++}`,
          clienteNome: 'Luiza',
          clienteTelefone: '(35) 99122-8877',
          servicoNome: 'Manicure simples',
          servicoId: 's9',
          inicio: `${dataStr}T14:00:00`,
          periodo: 'tarde',
          tituloOriginal: 'Luiza'
        });

        // 5. Geni às 15:30
        eventos.push({
          id: `g_gen_${idCounter++}`,
          clienteNome: 'Geni',
          clienteTelefone: '(35) 99788-3322',
          servicoNome: 'Manicure simples',
          servicoId: 's9',
          inicio: `${dataStr}T15:30:00`,
          periodo: 'tarde',
          tituloOriginal: 'Geni'
        });
      }
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    return eventos;
  }, []);

  // Controlar ids selecionados para sincronizar
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(() => 
    eventosGoogleAteFimDe2026.map(e => e.id)
  );

  const handleConectarSimulado = () => {
    setSimulandoLogin(true);
    setTimeout(() => {
      conectarGoogleAgenda('sheilaalicelara18@gmail.com');
      setSimulandoLogin(false);
    }, 2000);
  };

  const handleSincronizar = () => {
    const eventosParaImportar = eventosGoogleAteFimDe2026.filter(ev => selectedEventIds.includes(ev.id));
    sincronizarGoogleAgenda(eventosParaImportar);
    setSyncDone(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const toggleSelectEvent = (id: string) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedEventIds(prev => [...prev, id]);
    }
  };

  // Filtragem dos eventos
  const eventosFiltrados = useMemo(() => {
    return eventosGoogleAteFimDe2026.filter(ev => {
      const matchBusca = ev.clienteNome.toLowerCase().includes(busca.toLowerCase()) || 
                         ev.servicoNome.toLowerCase().includes(busca.toLowerCase());
      
      if (!matchBusca) return false;
      if (filtroMes === 'todos') return true;
      
      const mesEvento = new Date(ev.inicio).getMonth() + 1; // 1-indexed
      return String(mesEvento) === filtroMes;
    });
  }, [eventosGoogleAteFimDe2026, busca, filtroMes]);

  // Ações de seleção em lote
  const handleSelecionarTodosFiltrados = () => {
    const idsFiltrados = eventosFiltrados.map(e => e.id);
    setSelectedEventIds(prev => {
      const semFiltrados = prev.filter(id => !idsFiltrados.includes(id));
      return [...semFiltrados, ...idsFiltrados];
    });
  };

  const handleDeselecionarTodosFiltrados = () => {
    const idsFiltrados = eventosFiltrados.map(e => e.id);
    setSelectedEventIds(prev => prev.filter(id => !idsFiltrados.includes(id)));
  };

  const formatarData = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + dateStr.split('T')[1].substring(0, 5);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F6ECE8] text-[#D37F64] rounded-xl">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">Sincronização Dupla Google Agenda</h3>
              <p className="text-xs text-[#8C7A6B]">Sincronizando de 27/08 até 31/12 de 2026</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
          >
            <X size={18} />
          </button>
        </div>

        {simulandoLogin ? (
          /* Tela de Loading da Autenticação */
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw size={36} className="text-[#8C6D58] animate-spin" />
            <h4 className="font-semibold text-sm text-[#5A4535]">Conectando com o Google...</h4>
            <p className="text-xs text-[#8C7A6B] text-center max-w-xs">
              Autenticando conta <span className="font-bold text-[#5A4535]">sheilaalicelara18@gmail.com</span> e baixando agenda completa de 2026.
            </p>
          </div>
        ) : syncDone ? (
          /* Tela de Sucesso da Sincronização */
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center">
              <Check size={24} />
            </div>
            <h4 className="font-semibold text-sm text-[#5A4535]">Sincronização Concluída!</h4>
            <p className="text-xs text-[#8C7A6B] max-w-xs">
              Importamos os agendamentos das suas clientes com sucesso para toda a agenda de 2026.
            </p>
          </div>
        ) : !googleConnected ? (
          /* Tela de Desconectado (Autenticação do Google) */
          <div className="space-y-6 py-4">
            <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-4 space-y-3 text-xs text-[#5A4535]">
              <h4 className="font-bold flex items-center gap-1.5 text-[#8C6D58]">
                <Calendar size={15} />
                <span>Como funciona a sincronização até o final do ano?</span>
              </h4>
              <p className="leading-relaxed">
                O app irá escanear sua conta <strong className="text-[#5A4535]">sheilaalicelara18@gmail.com</strong> procurando por eventos recorrentes às quintas-feiras de Cris, Fernanda, Olinda, Luiza e Geni, cadastrando cada uma no sistema e garantindo sua agenda cheia no app até 31/12/2026.
              </p>
            </div>

            <div className="border border-[#EFECE6] p-5 rounded-2xl flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
                G
              </div>
              <div className="text-center">
                <h4 className="font-bold text-xs text-[#5A4535]">Conectar como sheilaalicelara18@gmail.com</h4>
                <p className="text-[10px] text-[#8C7A6B] mt-0.5">Permitir sincronização bidirecional de 2026</p>
              </div>
              <button
                type="button"
                onClick={handleConectarSimulado}
                className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Conectar Google Agenda</span>
              </button>
            </div>
          </div>
        ) : (
          /* Tela de Conectado & Importação de Eventos */
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center bg-[#FAF9F6] p-3 rounded-2xl border border-[#EFECE6] text-xs">
              <div>
                <p className="text-[#8C7A6B]">Conta Conectada:</p>
                <p className="font-bold text-[#5A4535]">{googleUserEmail}</p>
              </div>
              <button 
                onClick={desconectarGoogleAgenda}
                className="text-[10px] text-red-600 hover:underline font-bold"
              >
                Desconectar
              </button>
            </div>

            {/* Controles de Busca & Filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white p-3 border border-[#EFECE6] rounded-2xl">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6]">
                <Search size={14} className="text-[#8C7A6B]" />
                <input 
                  type="text"
                  placeholder="Buscar cliente ou serviço..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="bg-transparent text-xs text-[#5A4535] outline-none w-full border-none focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#8C7A6B] uppercase whitespace-nowrap">Mês:</span>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-2 py-1 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                >
                  <option value="todos">Todos os Meses</option>
                  <option value="8">Agosto</option>
                  <option value="9">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>
            </div>

            {/* Seleção em lote */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8C7A6B]">
                Mostrando <strong>{eventosFiltrados.length}</strong> de <strong>{eventosGoogleAteFimDe2026.length}</strong> eventos
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelecionarTodosFiltrados}
                  className="text-[10px] text-[#8C6D58] hover:underline font-bold"
                >
                  Selecionar Todos deste Filtro
                </button>
                <span className="text-[#EFECE6]">|</span>
                <button
                  type="button"
                  onClick={handleDeselecionarTodosFiltrados}
                  className="text-[10px] text-[#8C7A6B] hover:underline font-bold"
                >
                  Limpar Deste Filtro
                </button>
              </div>
            </div>

            {/* Listagem */}
            <div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {eventosFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#8C7A6B] bg-[#FAF9F6] rounded-2xl border border-dashed border-[#EFECE6]">
                    Nenhum compromisso encontrado para este filtro.
                  </div>
                ) : (
                  eventosFiltrados.map(ev => {
                    const selected = selectedEventIds.includes(ev.id);
                    const clienteExiste = clientes.some(c => 
                      c.nome.toLowerCase() === ev.clienteNome.toLowerCase() || 
                      c.telefone.replace(/\D/g, '') === ev.clienteTelefone.replace(/\D/g, '')
                    );

                    return (
                      <div 
                        key={ev.id}
                        onClick={() => toggleSelectEvent(ev.id)}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          selected 
                            ? 'bg-[#F6ECE8] border-[#8C6D58] text-[#8C6D58]' 
                            : 'bg-white border-[#EFECE6] text-[#5A4535] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={selected}
                            onChange={() => {}}
                            className="rounded text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#5A4535]">{ev.clienteNome}</span>
                              {clienteExiste ? (
                                <span className="text-[8px] bg-green-50 border border-green-200 text-green-700 font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                                  <UserCheck size={8} />
                                  <span>Cadastrada</span>
                                </span>
                              ) : (
                                <span className="text-[8px] bg-[#FFF9E6] border border-[#FFECB3] text-[#B78103] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                                  <UserPlus size={8} />
                                  <span>Novo Cliente</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#8C7A6B]">
                              <Tag size={10} className="text-[#8C6D58]" />
                              <span>Anotação: <strong>"{ev.tituloOriginal}"</strong></span>
                              <span>·</span>
                              <span>Serviço: <strong>{ev.servicoNome}</strong></span>
                            </div>
                            <p className="text-[9px] text-[#A69586] mt-0.5">
                              {formatarData(ev.inicio)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={handleSincronizar}
              disabled={selectedEventIds.length === 0}
              className="w-full bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <RefreshCw size={14} />
              <span>Importar {selectedEventIds.length} agendamentos de 2026</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
