import { useState, useEffect } from 'react';
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

function AppContent() {
  const { currentUser } = useAppState();
  
  // Identifica se está rodando como aplicativo instalado em qualquer plataforma:
  // 1. Electron Desktop
  // 2. Capacitor Android nativo
  // 3. PWA instalado no celular (standalone)
  // 4. Parâmetro explícito de app instalado (?app=1 ou #admin)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const isElectron = window.location.protocol === 'file:' || navigator.userAgent.includes('Electron');
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
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
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
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

  // Se estiver acessando a rota exclusiva de instalação da profissional (#instalar)
  if (isInstalarRoute) {
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

  // Se não estiver logado e estiver tentando acessar a parte admin, mostra tela de Login
  if (isAdmin && !currentUser) {
    return <Login setIsAdmin={setIsAdmin} />;
  }

  // Se estiver acessando como cliente (NUNCA VÊ O PROMPT DE INSTALAÇÃO)
  if (!isAdmin) {
    return <PublicBooking setIsAdmin={setIsAdmin} />;
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
