import { useState } from 'react';
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

function AppContent() {
  const { currentUser } = useAppState();
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedClienteIdForDetails, setSelectedClienteIdForDetails] = useState<string | null>(null);
  
  // Controle global de abertura do modal de novo agendamento
  const [isNewAgendamentoModalOpen, setIsNewAgendamentoModalOpen] = useState<boolean>(false);

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
