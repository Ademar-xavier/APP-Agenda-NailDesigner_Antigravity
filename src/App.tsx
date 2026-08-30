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

function AppContent() {
  const { currentUser } = useAppState();
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedClienteIdForDetails, setSelectedClienteIdForDetails] = useState<string | null>(null);
  
  // Efeito para scrollar para o topo ao trocar de aba
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach(container => {
      container.scrollTop = 0;
    });
  }, [currentView]);

  // Patch global confirm/alert e acordar o cursor (caret) no Android WebView após janelas nativas
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
          }, 50);
        } catch (e) {
          console.error(e);
        }
      }, 50);
    };

    // Chamar no início
    wakeUpCaret();

    // Patch confirm/alert
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;

    window.confirm = (message?: string) => {
      const result = originalConfirm(message);
      setTimeout(() => {
        window.focus();
        document.body.focus();
        wakeUpCaret();
      }, 150);
      return result;
    };

    window.alert = (message?: any) => {
      originalAlert(message);
      setTimeout(() => {
        window.focus();
        document.body.focus();
        wakeUpCaret();
      }, 150);
    };

    // Acordar também ao ganhar foco na janela (ex: voltando pro app ou fechando janelas nativas)
    window.addEventListener('focus', wakeUpCaret);

    // Acordar em toques/cliques na tela para assegurar reconexão contínua
    const handleTouch = () => {
      wakeUpCaret();
    };
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('click', handleTouch);

    return () => {
      window.confirm = originalConfirm;
      window.alert = originalAlert;
      window.removeEventListener('focus', wakeUpCaret);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleTouch);
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

  // Se não estiver logado e estiver tentando acessar a parte admin, mostra tela de Login
  if (isAdmin && !currentUser) {
    return <Login setIsAdmin={setIsAdmin} />;
  }

  // Se estiver acessando como cliente
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
