import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Copy, X, ChevronRight } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
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
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isExplicitAgendamento = typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('agendar');

    // Em plataformas instaladas ou em desenvolvimento local (localhost) sem #agendar explícito, inicia no painel admin!
    if (isElectron || isCapacitor || isStandalone || isAppParam || (isLocalhost && !isExplicitAgendamento)) {
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

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      // Limpa chave legada no localStorage para garantir que ao fechar volte para a raiz/login
      localStorage.removeItem('nail_current_view');
      const saved = sessionStorage.getItem('nail_current_view');
      if (saved && ['dashboard', 'agenda', 'clientes', 'confirmacoes', 'servicos', 'cadastros', 'materiais', 'financeiro', 'configuracoes'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'dashboard';
  });

  const handleSetCurrentView = (view: string) => {
    setCurrentView(view);
    try {
      sessionStorage.setItem('nail_current_view', view);
    } catch (e) {}
  };
  const [selectedClienteIdForDetails, setSelectedClienteIdForDetails] = useState<string | null>(null);

  // Sincroniza com navegação por hash (#admin, #instalar, #agendar ou #confirmar)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const isStandalone = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone === true;
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isNative = 
        window.location.protocol === 'file:' || 
        navigator.userAgent.includes('Electron') ||
        !!(window as any).Capacitor?.isNativePlatform?.() ||
        isStandalone ||
        window.location.search.includes('app=1') ||
        isLocalhost;

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
      } else if (hash.includes('agendar')) {
        setIsConfirmarRoute(false);
        setIsInstalarRoute(false);
        setIsAdmin(false);
      } else if (hash === '' || hash === '#') {
        setIsConfirmarRoute(false);
        setIsInstalarRoute(false);
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
      // 1. Container principal da coluna da direita no desktop
      const mainContent = document.getElementById('main-content-scroll');
      if (mainContent) {
        mainContent.scrollTop = 0;
        // Apenas containers internos da coluna de conteúdo da direita
        mainContent.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(el => {
          el.scrollTop = 0;
        });
      }

      // 2. No celular / telas menores (<768px), rola janela para o topo
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        window.scrollTo(0, 0);
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }
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

  // Intercepta o botão voltar nativo do celular (Android) e histórico do navegador
  useEffect(() => {
    let listenerHandle: any = null;

    const handleVoltarAcao = (): boolean => {
      // 1. Se houver modal de alerta aberto, fecha o alerta
      if (modalAlerta) {
        fecharAlerta();
        return true;
      }

      // 2. Se houver modal de novo agendamento aberto, fecha o modal
      if (isNewAgendamentoModalOpen) {
        setIsNewAgendamentoModalOpen(false);
        return true;
      }

      // 3. Se houver detalhes de cliente aberto, volta para a lista
      if (selectedClienteIdForDetails) {
        setSelectedClienteIdForDetails(null);
        return true;
      }

      // 4. Se estiver em uma tela interna do painel admin que não seja o dashboard, volta ao dashboard
      if (isAdmin && currentView !== 'dashboard') {
        handleSetCurrentView('dashboard');
        return true;
      }

      // 5. Dispara evento cancelável para o fluxo público de agendamento ou outros componentes
      const ev = new CustomEvent('nail_android_back', { cancelable: true });
      window.dispatchEvent(ev);
      if (ev.defaultPrevented) {
        return true; // Foi tratado internamente (ex: recuou etapa no agendamento público)
      }

      return false; // Não há nada para voltar, pode minimizar o aplicativo
    };

    // Ouvinte nativo do Capacitor Android (botão físico / barra inferior de gestos)
    try {
      CapApp.addListener('backButton', () => {
        const handled = handleVoltarAcao();
        if (!handled) {
          // Se estiver na tela raiz e nada foi consumido, minimiza o app sem deslogar
          try { CapApp.minimizeApp(); } catch (e) {}
        }
      }).then(handle => {
        listenerHandle = handle;
      }).catch(() => {});
    } catch (e) {}

    // Ouvinte para Web / PWA móvel (popstate)
    const handlePopState = () => {
      handleVoltarAcao();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalAlerta, isNewAgendamentoModalOpen, selectedClienteIdForDetails, isAdmin, currentView, fecharAlerta]);

  const openNewAgendamentoModal = () => {
    handleSetCurrentView('agenda');
    setIsNewAgendamentoModalOpen(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentView={handleSetCurrentView}
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
            setCurrentView={handleSetCurrentView}
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

  // Renderizador do Modal Global de Alerta (disponível em todas as telas)
  const renderModalAlerta = () => {
    if (!modalAlerta) return null;
    return (
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
    );
  };

  // 2. BLOQUEIO OBRIGATÓRIO DE LICENÇA (Vitalícia ou Assinatura Mensal Ativa):
  // Se for qualquer aplicativo instalado ou rota administrativa sem licença ativa
  if ((isInstalledApp || isAdmin) && !temLicenca) {
    return (
      <>
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
        {renderModalAlerta()}
      </>
    );
  }

  // 3. Se for navegador comum acessando a rota exclusiva de instalação (#instalar)
  if (isInstalarRoute && !isInstalledApp) {
    return (
      <>
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
        {renderModalAlerta()}
      </>
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
          handleSetCurrentView(view);
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

      {/* POPUP VISUAL DE AÇÃO DA CLIENTE (Push Banner no Topo no Celular / Canto Inferior no Desktop) */}
      {notificacaoClienteAcao && (
        <div className="fixed top-2 left-2 right-2 md:top-auto md:bottom-4 md:right-4 md:left-auto z-[999999] max-w-md md:max-w-sm w-auto pointer-events-auto animate-in slide-in-from-top-4 md:animate-bounce-short fade-in duration-300">
          <div className="bg-[#1C1917]/95 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
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

            {/* Cabeçalho estilo notificação push Android / iOS */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center p-0.5 overflow-hidden">
                  <img src="./logo.png?v=3" alt="App" className="w-full h-full object-cover rounded-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <span className="font-semibold text-zinc-200">Sheila Santos Nails</span>
                <span>•</span>
                <span className="text-[10px] font-mono">{notificacaoClienteAcao.hora}</span>
              </div>

              <button
                type="button"
                onClick={fecharNotificacaoClienteAcao}
                className="text-zinc-400 hover:text-white p-0.5 rounded-lg transition-colors"
                title="Fechar aviso"
              >
                <X size={14} />
              </button>
            </div>

            {/* Conteúdo da notificação */}
            <div className="flex items-start gap-3 pt-0.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                notificacaoClienteAcao.tipo === 'confirmacao'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  : notificacaoClienteAcao.tipo === 'cancelamento'
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                  : notificacaoClienteAcao.tipo === 'espera'
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                  : 'bg-pink-950/80 text-pink-300 border border-pink-800/60'
              }`}>
                <Sparkles size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-white leading-tight">
                  {notificacaoClienteAcao.titulo}
                </h4>
                <p className="text-xs text-zinc-300 mt-1 leading-snug">
                  {notificacaoClienteAcao.mensagem}
                </p>
                {notificacaoClienteAcao.detalhes && (
                  <p className="text-[11px] text-[#E0A899] font-medium mt-0.5">
                    {notificacaoClienteAcao.detalhes}
                  </p>
                )}
              </div>
            </div>

            {/* Ações da notificação */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={fecharNotificacaoClienteAcao}
                className="px-3 py-1 text-zinc-400 hover:text-white text-[11px] font-medium transition-colors"
              >
                Dispensar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('agenda');
                  fecharNotificacaoClienteAcao();
                }}
                className="px-3 py-1.5 bg-[#8C6D58] hover:bg-[#725743] active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
              >
                <span>Ver na Agenda</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL ELEGANTE (Substituto dos popups nativos do navegador) */}
      {renderModalAlerta()}
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
