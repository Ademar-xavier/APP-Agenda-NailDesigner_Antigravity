import React, { useState, useMemo, useEffect } from 'react';
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
  Upload, 
  Trash2, 
  ShieldCheck, 
  ExternalLink,
  FileText
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { 
  EventoGoogleReal, 
  obterGoogleClientId, 
  salvarGoogleClientId, 
  buscarEventosReaisGoogleApi, 
  parseIcsCalendar 
} from '../services/googleCalendar';

interface GoogleSyncModalProps {
  onClose: () => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({ onClose }) => {
  const { 
    clientes, 
    googleConnected, 
    googleUserEmail, 
    conectarGoogleAgenda, 
    desconectarGoogleAgenda, 
    sincronizarGoogleAgenda,
    limparAgendamentosSimuladosGoogle,
    confirmarAcao
  } = useAppState();

  const [carregando, setCarregando] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');

  // Modo de integração: 'oauth' (Google Cloud Oficial) ou 'arquivo' (.ics exportado)
  const [modoAba, setModoAba] = useState<'oauth' | 'arquivo'>('oauth');

  // Google Client ID
  const [clientId, setClientId] = useState(obterGoogleClientId());
  const [salvandoClientId, setSalvandoClientId] = useState(false);

  // Lista de eventos reais carregados
  const [eventosReais, setEventosReais] = useState<EventoGoogleReal[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Carrega a biblioteca Google Identity Services (GIS)
  useEffect(() => {
    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleSalvarClientId = (e: React.FormEvent) => {
    e.preventDefault();
    salvarGoogleClientId(clientId);
    setSalvandoClientId(true);
    setTimeout(() => setSalvandoClientId(false), 1500);
  };

  // Conexão Oficial OAuth 2.0 com Google Cloud
  const handleConectarGoogleOficial = () => {
    setErroMsg('');
    const idAtual = clientId.trim() || obterGoogleClientId();

    if (!idAtual) {
      setErroMsg('Por favor, informe o seu Google Client ID para autenticar com a Google Calendar API em modo de produção.');
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      setErroMsg('A biblioteca de autenticação do Google ainda está carregando. Aguarde 3 segundos e tente novamente.');
      return;
    }

    try {
      setCarregando(true);
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: idAtual,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setCarregando(false);
            setErroMsg(`Erro de autorização do Google: ${tokenResponse.error_description || tokenResponse.error}`);
            return;
          }

          try {
            const eventos = await buscarEventosReaisGoogleApi(tokenResponse.access_token);
            setEventosReais(eventos);
            setSelectedEventIds(eventos.map(e => e.id));
            conectarGoogleAgenda('sheilaalicelara18@gmail.com');
            setCarregando(false);
          } catch (err: any) {
            setCarregando(false);
            setErroMsg(err.message || 'Falha ao buscar compromissos da Google Calendar API.');
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e: any) {
      setCarregando(false);
      setErroMsg('Erro ao iniciar login Google: ' + (e.message || String(e)));
    }
  };

  // Importação de arquivo .ics oficial do Google Agenda
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const conteudo = event.target?.result as string;
        const eventos = parseIcsCalendar(conteudo);

        if (eventos.length === 0) {
          setErroMsg('Nenhum evento válido encontrado no arquivo .ics.');
          return;
        }

        setEventosReais(eventos);
        setSelectedEventIds(eventos.map(e => e.id));
        conectarGoogleAgenda(file.name);
      } catch (err: any) {
        setErroMsg('Falha ao processar arquivo .ics: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSincronizar = () => {
    const selecionados = eventosReais.filter(ev => selectedEventIds.includes(ev.id));
    sincronizarGoogleAgenda(selecionados);
    setSyncDone(true);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const toggleSelectEvent = (id: string) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedEventIds(prev => [...prev, id]);
    }
  };

  const eventosFiltrados = useMemo(() => {
    return eventosReais.filter(ev => {
      const matchBusca = ev.clienteNome.toLowerCase().includes(busca.toLowerCase()) || 
                         ev.servicoNome.toLowerCase().includes(busca.toLowerCase()) ||
                         ev.tituloOriginal.toLowerCase().includes(busca.toLowerCase());
      
      if (!matchBusca) return false;
      if (filtroMes === 'todos') return true;
      
      const mesEvento = new Date(ev.inicio).getMonth() + 1;
      return String(mesEvento) === filtroMes;
    });
  }, [eventosReais, busca, filtroMes]);

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
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + (dateStr.includes('T') ? dateStr.split('T')[1].substring(0, 5) : '09:00');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F6ECE8] text-[#8C6D58] rounded-xl">
              <Globe size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-[#5A4535]">Google Agenda (Modo de Produção)</h3>
                <span className="bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-green-200">
                  <ShieldCheck size={10} /> Produção Oficial
                </span>
              </div>
              <p className="text-xs text-[#8C7A6B]">Sincronização 100% real sem dados simulados ou duplicados</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Botão de Limpeza Preventiva de Testes/Simulações Antigas */}
        <div className="mb-4 p-3 bg-[#FFF9F6] border border-[#F5DFD5] rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="text-[#5A4535]">
            <span className="font-bold block text-[#B25E46]">Limpar Agendamentos Antigos de Teste</span>
            <p className="text-[10px] text-[#8C7A6B]">
              Se você importou compromissos simulados ou repetidos anteriormente, clique para limpá-los agora.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              confirmarAcao({
                titulo: 'Limpar Testes',
                mensagem: 'Deseja remover todos os agendamentos antigos gerados pela simulação?',
                tipo: 'aviso',
                textoConfirmar: 'Remover Testes',
                onConfirm: () => limparAgendamentosSimuladosGoogle()
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-[11px] font-bold shrink-0 transition-colors shadow-2xs"
          >
            <Trash2 size={13} />
            <span>Limpar Testes</span>
          </button>
        </div>

        {erroMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{erroMsg}</span>
          </div>
        )}

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw size={36} className="text-[#8C6D58] animate-spin" />
            <h4 className="font-semibold text-sm text-[#5A4535]">Acessando Google Calendar API...</h4>
            <p className="text-xs text-[#8C7A6B] text-center max-w-xs">
              Conectando com a sua conta Google real e baixando compromissos do salão.
            </p>
          </div>
        ) : syncDone ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center">
              <Check size={24} />
            </div>
            <h4 className="font-semibold text-sm text-[#5A4535]">Sincronização Concluída!</h4>
            <p className="text-xs text-[#8C7A6B] max-w-xs">
              Os compromissos reais da sua Google Agenda foram adicionados com sucesso ao sistema sem duplicatas.
            </p>
          </div>
        ) : eventosReais.length === 0 ? (
          <div className="space-y-4 py-2">
            {/* Seletor de Modo */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setModoAba('oauth')}
                className={`py-2 rounded-lg transition-all ${
                  modoAba === 'oauth' 
                    ? 'bg-[#8C6D58] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:text-[#5A4535]'
                }`}
              >
                1. Google Cloud OAuth
              </button>
              <button
                type="button"
                onClick={() => setModoAba('arquivo')}
                className={`py-2 rounded-lg transition-all ${
                  modoAba === 'arquivo' 
                    ? 'bg-[#8C6D58] text-white shadow-xs' 
                    : 'text-[#8C7A6B] hover:text-[#5A4535]'
                }`}
              >
                2. Importar Arquivo .ics
              </button>
            </div>

            {modoAba === 'oauth' ? (
              <div className="space-y-4">
                <form onSubmit={handleSalvarClientId} className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EFECE6] space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-[#5A4535]">Google OAuth Client ID (Produção)</label>
                      <a 
                        href="https://console.cloud.google.com/apis/credentials" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-[#8C6D58] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Google API Console</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ex: 123456789-abcdefg.apps.googleusercontent.com"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-white font-mono"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-[#8C6D58] text-white rounded-xl text-xs font-bold shrink-0 hover:bg-[#725743] transition-colors"
                      >
                        {salvandoClientId ? 'Salvo!' : 'Salvar'}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8C7A6B] mt-1.5 leading-relaxed">
                      Origem JavaScript autorizada no Google Cloud: <code className="bg-white px-1 py-0.5 rounded border border-[#EFECE6] font-mono">{typeof window !== 'undefined' && window.location.origin.startsWith('http') ? window.location.origin : 'https://sheilasantos-agenda.vercel.app'}</code>
                    </p>
                  </div>
                </form>

                <div className="border border-[#EFECE6] p-5 rounded-2xl flex flex-col items-center space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
                    G
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#5A4535]">Conectar Conta do Google em Tempo Real</h4>
                    <p className="text-[10px] text-[#8C7A6B] mt-0.5">Abre a janela oficial do Google para autorizar leitura da sua agenda</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConectarGoogleOficial}
                    className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Conectar Google Agenda Oficial</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-4 text-xs text-[#5A4535] space-y-2">
                  <span className="font-bold block text-[#8C6D58]">Como exportar sua agenda sem precisar de chaves API:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#8C7A6B]">
                    <li>Abra <strong className="text-[#5A4535]">calendar.google.com</strong> no seu computador;</li>
                    <li>Clique no ícone de engrenagem ⚙️ no topo &gt; <strong>Configurações</strong>;</li>
                    <li>No menu esquerdo, clique em <strong>Importar e exportar</strong>;</li>
                    <li>Clique no botão <strong>Exportar</strong> para baixar o arquivo .zip com seus eventos;</li>
                    <li>Abra o arquivo .zip e selecione o arquivo <strong>.ics</strong> abaixo.</li>
                  </ol>
                </div>

                <label className="border-2 border-dashed border-[#8C6D58]/40 hover:border-[#8C6D58] bg-[#FAF9F6] p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Upload size={32} className="text-[#8C6D58] mb-2" />
                  <span className="font-bold text-xs text-[#5A4535]">Clique para carregar seu arquivo .ics</span>
                  <span className="text-[10px] text-[#8C7A6B] mt-1">Exportação direta da sua Google Agenda oficial</span>
                  <input 
                    type="file" 
                    accept=".ics" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            )}
          </div>
        ) : (
          /* Lista de Eventos Reais Carregados */
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center bg-[#FAF9F6] p-3 rounded-2xl border border-[#EFECE6] text-xs">
              <div>
                <p className="text-[#8C7A6B]">Eventos Reais Carregados:</p>
                <p className="font-bold text-[#5A4535]">{eventosReais.length} compromisso(s) encontrados</p>
              </div>
              <button 
                onClick={() => {
                  setEventosReais([]);
                  desconectarGoogleAgenda();
                }}
                className="text-[10px] text-red-600 hover:underline font-bold"
              >
                Trocar Fonte / Desconectar
              </button>
            </div>

            {/* Controles de Busca & Filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white p-3 border border-[#EFECE6] rounded-2xl">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6]">
                <Search size={14} className="text-[#8C7A6B]" />
                <input 
                  type="text"
                  placeholder="Buscar cliente ou compromisso..."
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
                Exibindo <strong>{eventosFiltrados.length}</strong> de <strong>{eventosReais.length}</strong> eventos
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelecionarTodosFiltrados}
                  className="text-[10px] text-[#8C6D58] hover:underline font-bold"
                >
                  Selecionar Todos
                </button>
                <span className="text-[#EFECE6]">|</span>
                <button
                  type="button"
                  onClick={handleDeselecionarTodosFiltrados}
                  className="text-[10px] text-[#8C7A6B] hover:underline font-bold"
                >
                  Limpar Seleção
                </button>
              </div>
            </div>

            {/* Listagem */}
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
                    (ev.clienteTelefone && c.telefone.replace(/\D/g, '').endsWith(ev.clienteTelefone.replace(/\D/g, '').slice(-8)))
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
                            <span>Compromisso: <strong>"{ev.tituloOriginal}"</strong></span>
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

            <button
              onClick={handleSincronizar}
              disabled={selectedEventIds.length === 0}
              className="w-full bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <RefreshCw size={14} />
              <span>Importar {selectedEventIds.length} agendamentos reais</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
