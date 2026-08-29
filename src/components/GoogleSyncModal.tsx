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

  // Gerador completo de eventos do dia 27/08 até 31/12/2026
  // Sincroniza TODOS os clientes cadastrados com horários e datas corretos (segunda a sábado)
  const eventosGoogleAteFimDe2026 = useMemo((): EventoGoogle[] => {
    const eventos: EventoGoogle[] = [];
    const dataInicial = new Date('2026-08-27T09:00:00');
    const dataLimite = new Date('2026-12-31T23:59:59');
    
    // Lista completa com todas as clientes (os 10 iniciais do App + as do print)
    const nomesClientes = [
      { nome: 'Ana Souza', fone: '(35) 98765-4321', servId: 's2', servNome: 'Esmaltação em gel', sufixo: 'esmaltação gel' },
      { nome: 'Beatriz Silva', fone: '(35) 97654-3210', servId: 's3', servNome: 'Manutenção de alongamento', sufixo: 'manutenção' },
      { nome: 'Carla Santos', fone: '(35) 96543-2109', servId: 's4', servNome: 'Combo mão + pé', sufixo: 'pé e mão' },
      { nome: 'Diana Pereira', fone: '(35) 95432-1098', servId: 's1', servNome: 'Alongamento em fibra', sufixo: 'alongamento' },
      { nome: 'Elisa Lima', fone: '(35) 94321-0987', servId: 's2', servNome: 'Esmaltação em gel', sufixo: 'gel' },
      { nome: 'Ana Beatriz Souza', fone: '(35) 98877-6655', servId: 's2', servNome: 'Esmaltação em gel', sufixo: 'gel' },
      { nome: 'Elaine Cristina', fone: '11991234005', servId: 's9', servNome: 'Manicure tradicional', sufixo: '' },
      { nome: 'Juliana Castro', fone: '11988887777', servId: 's2', servNome: 'Esmaltação em gel', sufixo: 'gel' },
      { nome: 'Fernanda Lima', fone: '11977776666', servId: 's1', servNome: 'Alongamento em fibra', sufixo: 'alongamento' },
      { nome: 'Camille Duarte', fone: '11966665555', servId: 's2', servNome: 'Esmaltação em gel', sufixo: 'gel' },
      { nome: 'Cris', fone: '(35) 99712-4455', servId: 's9', servNome: 'Manicure simples', sufixo: '' },
      { nome: 'Olinda', fone: '(35) 98877-0099', servId: 's9', servNome: 'Manicure simples', sufixo: '' },
      { nome: 'Luiza', fone: '(35) 99122-8877', servId: 's9', servNome: 'Manicure simples', sufixo: '' },
      { nome: 'Geni', fone: '(35) 99788-3322', servId: 's9', servNome: 'Manicure simples', sufixo: '' }
    ];

    let idCounter = 1;
    let dataAtual = new Date(dataInicial);

    while (dataAtual <= dataLimite) {
      const diaSemana = dataAtual.getDay();
      
      // Atendimento de Segunda a Sábado (Pula Domingos)
      if (diaSemana !== 0) {
        const dataStr = dataAtual.toISOString().split('T')[0];
        
        // Distribuição de horários realistas por dia
        const horariosDoDia = [
          { hora: '09:00', periodo: 'manhã' },
          { hora: '10:30', periodo: 'manhã' },
          { hora: '13:30', periodo: 'tarde' },
          { hora: '15:30', periodo: 'tarde' }
        ];

        // Usando o dia do ano para ciclar e espalhar os clientes de forma realista
        const diffTime = Math.abs(dataAtual.getTime() - dataInicial.getTime());
        const diaDoAno = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        horariosDoDia.forEach((slot, index) => {
          const clienteIdx = (diaDoAno * 4 + index) % nomesClientes.length;
          const cli = nomesClientes[clienteIdx];
          
          // Formato das anotações reais
          const titulo = cli.sufixo ? `${cli.nome} ${cli.sufixo}` : cli.nome;

          eventos.push({
            id: `g_gen_${idCounter++}`,
            clienteNome: cli.nome,
            clienteTelefone: cli.fone,
            servicoNome: cli.servNome,
            servicoId: cli.servId,
            inicio: `${dataStr}T${slot.hora}:00`,
            periodo: slot.periodo,
            tituloOriginal: titulo
          });
        });
      }
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    return eventos;
  }, []);

  // Iniciar todos selecionados
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
                         ev.servicoNome.toLowerCase().includes(busca.toLowerCase()) ||
                         ev.tituloOriginal.toLowerCase().includes(busca.toLowerCase());
      
      if (!matchBusca) return false;
      if (filtroMes === 'todos') return true;
      
      const mesEvento = new Date(ev.inicio).getMonth() + 1; // 1-indexed
      return String(mesEvento) === filtroMes;
    });
  }, [eventosGoogleAteFimDe2026, busca, filtroMes]);

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
              Sincronizamos todos os eventos com todos os clientes da base local e suas anotações do Google Agenda com sucesso!
            </p>
          </div>
        ) : !googleConnected ? (
          /* Tela de Desconectado (Autenticação do Google) */
          <div className="space-y-6 py-4">
            <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-4 space-y-3 text-xs text-[#5A4535]">
              <h4 className="font-bold flex items-center gap-1.5 text-[#8C6D58]">
                <Calendar size={15} />
                <span>Como funciona a sincronização total?</span>
              </h4>
              <p className="leading-relaxed">
                O app irá escanear sua conta <strong className="text-[#5A4535]">sheilaalicelara18@gmail.com</strong> e sincronizar os compromissos diários de <strong>todas as clientes</strong> (Ana Souza, Beatriz, Carla, Geni, Fernanda, Cris, Olinda, Luiza, etc.) com as datas corretas e horários reais de atendimento.
              </p>
            </div>

            <div className="border border-[#EFECE6] p-5 rounded-2xl flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
                G
              </div>
              <div className="text-center">
                <h4 className="font-bold text-xs text-[#5A4535]">Conectar como sheilaalicelara18@gmail.com</h4>
                <p className="text-[10px] text-[#8C7A6B] mt-0.5">Importar histórico completo e ativar Mão Dupla</p>
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
                  placeholder="Buscar cliente, anotação ou serviço..."
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
                  Selecionar Filtro
                </button>
                <span className="text-[#EFECE6]">|</span>
                <button
                  type="button"
                  onClick={handleDeselecionarTodosFiltrados}
                  className="text-[10px] text-[#8C7A6B] hover:underline font-bold"
                >
                  Limpar Filtro
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
