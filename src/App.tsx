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
  
  // No navegador web público, abre SEMPRE a tela de agendamento do cliente por padrão!
  // Apenas abre o painel se for o app instalado (Electron/Capacitor) ou se a URL contiver #admin
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const isNativeApp = 
      window.location.protocol === 'file:' || 
      !!(window as any).Capacitor?.isNativePlatform?.() ||
      navigator.userAgent.includes('Electron');

    if (isNativeApp) return true;

    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    
    return hash.includes('admin') || search.includes('admin') || pathname.includes('admin');
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
      if (hash.includes('instalar')) {
        setIsInstalarRoute(true);
      } else if (hash.includes('admin')) {
        setIsInstalarRoute(false);
        setIsAdmin(true);
      } else if (hash.includes('agendar') || hash === '' || hash === '#') {
        setIsInstalarRoute(false);
        const isNative = 
          window.location.protocol === 'file:' || 
          !!(window as any).Capacitor?.isNativePlatform?.();
        if (!isNative) {
          setIsAdmin(false);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Efeito para scrollar para o topo ao trocar de aba
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach(container => {
      container.scrollTop = 0;
    });
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
      
      {/* Container Principal */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
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
