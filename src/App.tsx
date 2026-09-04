import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Copy, X } from 'lucide-react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Agenda } from './views/Agenda';
import { Clientes } from './views/Clientes';
import { Servicos } from './views/Servicos';
import { Financeiro } from './views/Financeiro';
import { Configuracoes } from './views/Configuracoes';
import { PublicBooking } from './public-views/PublicBooking';
import { PublicConfirmacao } from './public-views/PublicConfirmacao';
import { Login } from './views/Login';
import { Confirmacoes } from './views/Confirmacoes';
import { Materiais } from './views/Materiais';
import { Cadastros } from './views/Cadastros';
import { InstallPwaPrompt } from './components/InstallPwaPrompt';
import { InstalarApp } from './views/InstalarApp';
import { AtivacaoLicenca } from './views/AtivacaoLicenca';
import { isLicencaAtiva, sincronizarLicencaAtualComNuvem } from './services/licencaService';

function AppContent() {
  const { 
    currentUser, 
    notificacaoGlobal, 
    modalAlerta, 
    fecharAlerta, 
    mostrarNotificacaoGlobal,
    notificacaoClienteAcao,
    fecharNotificacaoClienteAcao
  } = useAppState();
  
  // Status da Chave de Licença ou Assinatura Mensal Ativa
  const [temLicenca, setTemLicenca] = useState<boolean>(() => isLicencaAtiva());

  // Consulta silenciosa ao banco na nuvem para verificar se a assinatura foi renovada ou bloqueada
  useEffect(() => {
    sincronizarLicencaAtualComNuvem().then((info) => {
      if (info) {
        setTemLicenca(info.ativa);
      }
    });
  }, []);
  
  // Identifica se está rodando como aplicativo instalado em qualquer plataforma:
  // 1. Electron Desktop
  // 2. Capacitor Android nativo
  // 3. PWA instalado no celular (standalone)
  // 4. Parâmetro explícito de app instalado (?app=1 ou #admin)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const isElectron = window.location.protocol === 'file:' || navigator.userAgent.includes('Electron');
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    const isStandalone = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone === true;
    const isAppParam = window.location.search.includes('app=1') || window.location.hash.toLowerCase().includes('admin');

    // Em todas as plataformas instaladas, inicia SEMPRE na tela administrativa (Login)
    if (isElectron || isCapacitor || isStandalone || isAppParam) {
      return true;
    }

    return false;
  });

  const [isConfirmarRoute, setIsConfirmarRoute] = useState<boolean>(() => {
    return window.location.hash.toLowerCase().includes('confirmar') || 
           window.location.search.toLowerCase().includes('confirmar') ||
           window.location.pathname.toLowerCase().includes('confirmar');
  });

  const [isInstalarRoute, setIsInstalarRoute] = useState<boolean>(() => {
    return window.location.hash.toLowerCase().includes('instalar') || 
           window.location.search.toLowerCase().includes('instalar') ||
           window.location.pathname.toLowerCase().includes('instalar');
  });

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedClienteIdForDetails, setSelectedClienteIdForDetails] = useState<string | null>(null);

  // Sincroniza com navegação por hash (#admin, #instalar, #agendar ou #confirmar)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const isStandalone = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone === true;
      const isNative = 
        window.location.protocol === 'file:' || 
        navigator.userAgent.includes('Electron') ||
        !!(window as any).Capacitor?.isNativePlatform?.() ||
        isStandalone ||
        window.location.search.includes('app=1');

      if (hash.includes('confirmar') || window.location.search.toLowerCase().includes('confirmar')) {
        setIsConfirmarRoute(true);
        setIsInstalarRoute(false);
      } else if (hash.includes('instalar')) {
        setIsConfirmarRoute(false);
        setIsInstalarRoute(true);
      } else if (hash.includes('admin')) {
        setIsConfirmarRoute(false);
        setIsInstalarRoute(false);
        setIsAdmin(true);
      } else if (hash.includes('agendar') || hash === '' || hash === '#') {
        setIsConfirmarRoute(false);
        setIsInstalarRoute(false);
        // Se for aplicativo instalado (Desktop, Android ou PWA), NUNCA perde o modo admin!
        if (!isNative) {
          setIsAdmin(false);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Efeito para scrollar todo o conteúdo para o topo ao trocar de aba (Desktop, Web e Android WebView)
  useEffect(() => {
    const rolarParaTopo = () => {
      // 1. Container principal do desktop/tablet
      const mainContent = document.getElementById('main-content-scroll');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
      // 2. Janela e documentos raiz (crítico no Android e celulares móveis)
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

      // 3. Qualquer container com scroll interno
      document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(el => {
        el.scrollTop = 0;
      });
    };

    rolarParaTopo();
    const timer1 = setTimeout(rolarParaTopo, 40);
    const timer2 = setTimeout(rolarParaTopo, 150);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentView]);

  // Patch global confirm/alert para reatar foco ao webview após janelas nativas
  useEffect(() => {
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;

    window.confirm = (message?: string) => {
      const result = originalConfirm(message);
      setTimeout(() => {
        window.focus();
        document.body.focus();
        const active = document.activeElement as HTMLElement;
        if (active && typeof active.blur === 'function') {
          active.blur();
        }
      }, 150);
      return result;
    };

    window.alert = (message?: any) => {
      originalAlert(message);
      setTimeout(() => {
        window.focus();
        document.body.focus();
      }, 150);
    };

    return () => {
      window.confirm = originalConfirm;
      window.alert = originalAlert;
    };
  }, []);

  // Efeito para acordar o cursor (caret) no Android WebView
  useEffect(() => {
    const wakeUpCaret = () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.style.position = 'fixed';
      input.style.top = '-100px';
      input.style.left = '-100px';
      input.style.opacity = '0';
      input.style.height = '0';
      input.style.width = '0';
      document.body.appendChild(input);
      
      setTimeout(() => {
        try {
          input.focus();
          setTimeout(() => {
            input.blur();
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
            window.focus();
          }, 50);
        } catch (e) {
          console.error(e);
        }
      }, 100);
    };

    // Acorda ao inicializar
    wakeUpCaret();
    
    // Acorda no primeiro toque do usuário para garantir ativação
    const handleFirstTouch = () => {
      wakeUpCaret();
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
    window.addEventListener('touchstart', handleFirstTouch);
    window.addEventListener('click', handleFirstTouch);
    
    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
  }, []);

  // Controle global de abertura do modal de novo agendamento
  const [isNewAgendamentoModalOpen, setIsNewAgendamentoModalOpen] = useState<boolean>(false);

  // Listen for Escape key to close active views/modals in App.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewAgendamentoModalOpen) {
          setIsNewAgendamentoModalOpen(false);
        } else if (selectedClienteIdForDetails) {
          setSelectedClienteIdForDetails(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewAgendamentoModalOpen, selectedClienteIdForDetails]);

  const openNewAgendamentoModal = () => {
    setCurrentView('agenda');
    setIsNewAgendamentoModalOpen(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentView={setCurrentView}
            setSelectedClienteIdForDetails={setSelectedClienteIdForDetails}
            openNewAgendamentoModal={openNewAgendamentoModal}
          />
        );
      case 'agenda':
        return (
          <Agenda 
            currentView={currentView}
            isNewAgendamentoModalOpen={isNewAgendamentoModalOpen}
            openNewAgendamentoModal={openNewAgendamentoModal}
            closeNewAgendamentoModal={() => setIsNewAgendamentoModalOpen(false)}
          />
        );
      case 'clientes':
        return (
          <Clientes 
            selectedClienteIdForDetails={selectedClienteIdForDetails}
            setSelectedClienteIdForDetails={setSelectedClienteIdForDetails}
          />
        );
      case 'confirmacoes':
        return <Confirmacoes />;
      case 'servicos':
        return <Servicos />;
      case 'cadastros':
        return <Cadastros />;
      case 'materiais':
        return <Materiais />;
      case 'financeiro':
        return <Financeiro />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return (
          <Dashboard 
            setCurrentView={setCurrentView}
            openNewAgendamentoModal={() => setIsNewAgendamentoModalOpen(true)}
          />
        );
    }
  };

  // Verifica se é aplicativo instalado em qualquer plataforma:
  // Desktop Windows, Android Nativo ou PWA instalado no celular via link
  const isInstalledApp = 
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || 
    (window.navigator as any).standalone === true ||
    window.location.protocol === 'file:' || 
    navigator.userAgent.includes('Electron') ||
    !!(window as any).Capacitor?.isNativePlatform?.() ||
    window.location.search.includes('app=1');

  // Verifica se o usuário solicitou explicitamente a tela de agendamento (via link, botão ou hash #agendar)
  const isExplicitAgendamento = window.location.hash.toLowerCase().includes('agendar');

  // 0. Se for rota pública de confirmação de agendamento em 1 toque (#confirmar?id=...)
  if (isConfirmarRoute) {
    return <PublicConfirmacao />;
  }

  // 1. Se solicitou explicitamente a página de agendamento, SEMPRE exibe a página pública
  if (isExplicitAgendamento) {
    return (
      <PublicBooking 
        setIsAdmin={(admin) => {
          setIsAdmin(admin);
          window.location.hash = admin ? 'admin' : 'agendar';
        }} 
      />
    );
  }

  // 2. BLOQUEIO OBRIGATÓRIO DE LICENÇA (Vitalícia ou Assinatura Mensal Ativa):
  // Se for qualquer aplicativo instalado ou rota administrativa sem licença ativa
  if ((isInstalledApp || isAdmin) && !temLicenca) {
    return (
      <AtivacaoLicenca 
        onLicencaAtivada={() => {
          setTemLicenca(true);
          setIsAdmin(true);
        }}
        onVoltarAgendamento={() => {
          setIsAdmin(false);
          window.location.hash = 'agendar';
        }}
      />
    );
  }

  // 3. Se for navegador comum acessando a rota exclusiva de instalação (#instalar)
  if (isInstalarRoute && !isInstalledApp) {
    return (
      <InstalarApp 
        onEntrarAdmin={() => {
          setIsInstalarRoute(false);
          setIsAdmin(true);
          window.location.hash = 'admin';
        }}
        onIrAgendar={() => {
          setIsInstalarRoute(false);
          setIsAdmin(false);
          window.location.hash = 'agendar';
        }}
      />
    );
  }

  // 4. Se for aplicativo instalado ou rota administrativa e não estiver autenticado:
  // Inicia na tela de Login!
  if ((isInstalledApp || isAdmin) && !currentUser) {
    return (
      <Login 
        setIsAdmin={(admin) => {
          setIsAdmin(admin);
          if (!admin) {
            window.location.hash = 'agendar';
          }
        }} 
      />
    );
  }

  // 5. Se for cliente acessando no navegador comum público
  if (!isAdmin && !isInstalledApp) {
    return (
      <PublicBooking 
        setIsAdmin={(admin) => {
          setIsAdmin(admin);
          window.location.hash = admin ? 'admin' : 'agendar';
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF9F6] text-[#2D2D2D]">
      {/* Sidebar de Navegação */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(view) => {
          setSelectedClienteIdForDetails(null);
          setCurrentView(view);
        }} 
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
      />
      
      {/* Container Principal (Apenas este rola para o topo) */}
      <main id="main-content-scroll" className="flex-1 flex flex-col h-screen overflow-y-auto">
        {renderView()}
      </main>

      {/* Notificação de Instalação PWA no Celular (Exclusiva para a Profissional) */}
      <InstallPwaPrompt isAdmin={isAdmin} />

      {/* TOAST GLOBAL DE CONFIRMAÇÃO DE SALVAMENTO & SINCRONIZAÇÃO NA NUVEM */}
      {notificacaoGlobal && (
        <div className="fixed bottom-6 right-6 z-[99999] pointer-events-none animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
            notificacaoGlobal.tipo === 'sucesso'
              ? 'bg-[#1C1917] text-emerald-400 border-emerald-500/40 shadow-emerald-950/40'
              : notificacaoGlobal.tipo === 'erro'
              ? 'bg-[#1C1917] text-rose-400 border-rose-500/40'
              : 'bg-[#1C1917] text-amber-300 border-amber-500/40'
          }`}>
            <Cloud size={16} className="text-emerald-400 shrink-0" />
            <span>{notificacaoGlobal.mensagem}</span>
          </div>
        </div>
      )}

      {/* POPUP VISUAL DE AÇÃO DA CLIENTE (Tempo Real) */}
      {notificacaoClienteAcao && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] max-w-md w-[92%] sm:w-full animate-in slide-in-from-top-6 fade-in duration-300">
          <div className="bg-[#1C1917] text-white p-4 rounded-2xl shadow-2xl border border-[#8C6D58]/40 backdrop-blur-md flex items-start gap-3 relative overflow-hidden">
            {/* Barra de brilho no topo */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              notificacaoClienteAcao.tipo === 'confirmacao'
                ? 'from-emerald-400 to-teal-500'
                : notificacaoClienteAcao.tipo === 'cancelamento'
                ? 'from-rose-400 to-red-600'
                : notificacaoClienteAcao.tipo === 'espera'
                ? 'from-amber-400 to-orange-500'
                : 'from-[#DB7093] to-[#8C6D58]'
            }`} />

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              notificacaoClienteAcao.tipo === 'confirmacao'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : notificacaoClienteAcao.tipo === 'cancelamento'
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : notificacaoClienteAcao.tipo === 'espera'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-pink-950 text-pink-300 border border-pink-800'
            }`}>
              <Sparkles size={20} />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs text-white leading-tight">{notificacaoClienteAcao.titulo}</h4>
                <span className="text-[10px] text-zinc-400 font-mono">({notificacaoClienteAcao.hora})</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-snug">{notificacaoClienteAcao.mensagem}</p>
              {notificacaoClienteAcao.detalhes && (
                <p className="text-[11px] text-[#D37F64] font-semibold mt-0.5">{notificacaoClienteAcao.detalhes}</p>
              )}

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('agenda');
                    fecharNotificacaoClienteAcao();
                  }}
                  className="px-3 py-1 bg-[#8C6D58] hover:bg-[#725743] text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                >
                  Ver na Agenda
                </button>
                <button
                  type="button"
                  onClick={fecharNotificacaoClienteAcao}
                  className="px-2.5 py-1 text-zinc-400 hover:text-white text-[11px] font-medium transition-colors"
                >
                  Dispensar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={fecharNotificacaoClienteAcao}
              className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
              title="Fechar aviso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL ELEGANTE (Substituto dos popups nativos do navegador) */}
      {modalAlerta && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={fecharAlerta}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#F4ECE1] max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra de destaque colorida no topo */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D37F64] via-[#DB7093] to-[#8C6D58]" />

            {/* Ícone estilizado com badge circular */}
            <div className="pt-2 flex justify-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${
                modalAlerta.tipo === 'sucesso'
                  ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                  : modalAlerta.tipo === 'erro'
                  ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                  : modalAlerta.tipo === 'aviso'
                  ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                  : 'bg-[#FFF0F5] text-[#DB7093] border border-[#FBCFE8]'
              }`}>
                {modalAlerta.tipo === 'sucesso' ? (
                  <CheckCircle2 size={32} />
                ) : modalAlerta.tipo === 'erro' ? (
                  <AlertTriangle size={32} />
                ) : modalAlerta.tipo === 'aviso' ? (
                  <AlertCircle size={32} />
                ) : (
                  <Sparkles size={32} />
                )}
              </div>
            </div>

            {/* Título e Mensagem */}
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">
                {modalAlerta.titulo}
              </h3>
              <p className="text-xs text-[#8C7A6B] leading-relaxed whitespace-pre-line px-1">
                {modalAlerta.mensagem}
              </p>
            </div>

            {/* Caixa de Link Copiável se houver */}
            {modalAlerta.link && (
              <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-3 text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-[#5A4535] truncate select-all flex-1 font-medium">
                    {modalAlerta.link}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(modalAlerta.link!);
                      mostrarNotificacaoGlobal('Link copiado com sucesso!', 'sucesso');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors shadow-sm"
                  >
                    <Copy size={12} />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="pt-2 flex items-center gap-2">
              {modalAlerta.isConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    if (modalAlerta.onCancel) modalAlerta.onCancel();
                    fecharAlerta();
                  }}
                  className="flex-1 py-3 px-4 border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] hover:bg-[#FAF9F6] text-xs font-bold rounded-2xl transition-all"
                >
                  {modalAlerta.textoCancelar || 'Cancelar'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (modalAlerta.onConfirm) modalAlerta.onConfirm();
                  fecharAlerta();
                }}
                className={`flex-1 py-3 px-4 text-white text-xs font-bold rounded-2xl transition-all shadow-md active:scale-[0.98] ${
                  modalAlerta.tipo === 'erro'
                    ? 'bg-gradient-to-r from-[#D32F2F] to-[#B71C1C] hover:opacity-95'
                    : modalAlerta.tipo === 'aviso'
                    ? 'bg-gradient-to-r from-[#B78103] to-[#8C6D58] hover:opacity-95'
                    : 'bg-gradient-to-r from-[#8C6D58] to-[#725743] hover:opacity-95'
                }`}
              >
                {modalAlerta.textoBotao || (modalAlerta.isConfirm ? 'Confirmar' : 'OK, Entendido')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
