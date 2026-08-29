import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  UserCheck, 
  UserPlus, 
  Globe 
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
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(['g1', 'g2', 'g3', 'g4']);

  // Mock de eventos encontrados na Google Agenda da Sheila
  const eventosGoogleIniciais: EventoGoogle[] = [
    { id: 'g1', clienteNome: 'Camila Oliveira', clienteTelefone: '(35) 98877-1111', servicoNome: 'Alongamento em fibra', servicoId: 's1', inicio: '2026-08-30T09:00:00', periodo: 'manhã' },
    { id: 'g2', clienteNome: 'Letícia Ramos', clienteTelefone: '(35) 97766-2222', servicoNome: 'Manutenção de alongamento', servicoId: 's3', inicio: '2026-08-30T14:00:00', periodo: 'tarde' },
    { id: 'g3', clienteNome: 'Ana Souza', clienteTelefone: '(35) 98765-4321', servicoNome: 'Esmaltação em gel', servicoId: 's2', inicio: '2026-08-31T10:00:00', periodo: 'manhã' }, // Cliente existente (c1)
    { id: 'g4', clienteNome: 'Patrícia Souza', clienteTelefone: '(35) 96655-3333', servicoNome: 'Combo mão + pé', servicoId: 's4', inicio: '2026-08-31T16:00:00', periodo: 'tarde' }
  ];

  const handleConectarSimulado = () => {
    setSimulandoLogin(true);
    setTimeout(() => {
      conectarGoogleAgenda('sheilaalicelara18@gmail.com');
      setSimulandoLogin(false);
    }, 2000);
  };

  const handleSincronizar = () => {
    const eventosParaImportar = eventosGoogleIniciais.filter(ev => selectedEventIds.includes(ev.id));
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

  const formatarData = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + dateStr.split('T')[1].substring(0, 5);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F6ECE8] text-[#D37F64] rounded-xl">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">Sincronização com Google Agenda</h3>
              <p className="text-xs text-[#8C7A6B]">Sincronize clientes e agendamentos com sua conta Google</p>
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
              Autenticando conta <span className="font-bold text-[#5A4535]">sheilaalicelara18@gmail.com</span> e concedendo permissões de leitura da agenda.
            </p>
          </div>
        ) : syncDone ? (
          /* Tela de Sucesso da Sincronização */
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center">
              <Check size={24} />
            </div>
            <h4 className="font-semibold text-sm text-[#5A4535]">Agenda Sincronizada com Sucesso!</h4>
            <p className="text-xs text-[#8C7A6B] max-w-xs">
              Os dados e novos clientes da sua Google Agenda foram importados para o app local.
            </p>
          </div>
        ) : !googleConnected ? (
          /* Tela de Desconectado (Autenticação do Google) */
          <div className="space-y-6 py-4">
            <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-4 space-y-3 text-xs text-[#5A4535]">
              <h4 className="font-bold flex items-center gap-1.5 text-[#8C6D58]">
                <Calendar size={15} />
                <span>Como funciona a importação de dados?</span>
              </h4>
              <p className="leading-relaxed">
                Ao se conectar, o app irá ler a sua agenda do Google associada ao email <strong className="text-[#5A4535]">sheilaalicelara18@gmail.com</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1 leading-relaxed text-[#8C7A6B]">
                <li>Identifica eventos futuros que representem clientes.</li>
                <li>Faz correspondência automática por telefone/nome.</li>
                <li>Cadastra novos clientes no banco de dados automaticamente.</li>
                <li>Mantém seus horários bloqueados e compromissos sincronizados.</li>
              </ul>
            </div>

            <div className="border border-[#EFECE6] p-5 rounded-2xl flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
                G
              </div>
              <div className="text-center">
                <h4 className="font-bold text-xs text-[#5A4535]">Conectar como sheilaalicelara18@gmail.com</h4>
                <p className="text-[10px] text-[#8C7A6B] mt-0.5">Permitir acesso de leitura e escrita ao Google Calendar</p>
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

            <div>
              <h4 className="text-xs font-bold text-[#8C7A6B] uppercase mb-2">Eventos Encontrados (Prontos para Sincronizar)</h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {eventosGoogleIniciais.map(ev => {
                  const selected = selectedEventIds.includes(ev.id);
                  // Verificar se cliente já existe no app local
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
                          onChange={() => {}} // toggle handled by parent div onClick
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
                          <p className="text-[10px] text-[#8C7A6B] mt-0.5">
                            {ev.servicoNome} · {formatarData(ev.inicio)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSincronizar}
              disabled={selectedEventIds.length === 0}
              className="w-full bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <RefreshCw size={14} />
              <span>Importar {selectedEventIds.length} agendamentos</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
