import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Agenda } from './views/Agenda';
import { Clientes } from './views/Clientes';
import { Servicos } from './views/Servicos';
import { Financeiro } from './views/Financeiro';
import { Configuracoes } from './views/Configuracoes';
import { PublicBooking } from './public-views/PublicBooking';
import { Login } from './views/Login';
import { Confirmacoes } from './views/Confirmacoes';
import { Materiais } from './views/Materiais';
import { Cadastros } from './views/Cadastros';
import { InstallPwaPrompt } from './components/InstallPwaPrompt';
import { InstalarApp } from './views/InstalarApp';
import { AtivacaoLicenca } from './views/AtivacaoLicenca';
import { isLicencaAtiva, sincronizarLicencaAtualComNuvem } from './services/licencaService';

function AppContent() {
  const { currentUser, notificacaoGlobal } = useAppState();
  
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

  const [isInstalarRoute, setIsInstalarRoute] = useState<boolean>(() => {
    return window.location.hash.toLowerCase().includes('instalar') || 
           window.location.search.toLowerCase().includes('instalar') ||
           window.location.pathname.toLowerCase().includes('instalar');
  });

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedClienteIdForDetails, setSelectedClienteIdForDetails] = useState<string | null>(null);

  // Sincroniza com navegação por hash (#admin, #instalar ou #agendar)
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

      if (hash.includes('instalar')) {
        setIsInstalarRoute(true);
      } else if (hash.includes('admin')) {
        setIsInstalarRoute(false);
        setIsAdmin(true);
      } else if (hash.includes('agendar') || hash === '' || hash === '#') {
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
  
  // Efeito para scrollar APENAS o conteúdo da direita para o topo ao trocar de aba (mantendo o menu lateral 100% fixo)
  useEffect(() => {
    const mainContent = document.getElementById('main-content-scroll');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
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
