import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign, 
  Settings, 
  ExternalLink,
  Crown,
  LogOut,
  User as UserIcon,
  CheckCircle
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  isAdmin, 
  setIsAdmin 
}) => {
  const { configSalao, currentUser, logout } = useAppState();

  const allMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', name: 'Agenda', icon: Calendar },
    { id: 'clientes', name: 'Clientes', icon: Users, adminOnly: true },
    { id: 'confirmacoes', name: 'Confirmações', icon: CheckCircle, adminOnly: true },
    { id: 'servicos', name: 'Serviços', icon: Scissors, adminOnly: true },
    { id: 'financeiro', name: 'Financeiro', icon: DollarSign, adminOnly: true },
    { id: 'configuracoes', name: 'Configurações', icon: Settings, adminOnly: true },
  ];

  // Filtrar itens se o usuário for profissional
  const menuItems = allMenuItems.filter(item => {
    if (currentUser?.perfil === 'profissional' && item.adminOnly) {
      return false;
    }
    return true;
  });

  if (!isAdmin) return null;

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EFECE6] h-screen sticky top-0">
        {/* Header / Logo */}
        <div className="p-6 border-b border-[#EFECE6] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-3 border border-[#E8DEC9] overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-2xl font-serif text-[#8C6D58] font-bold';
                  span.innerText = 'S';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
          <h1 className="font-serif font-semibold text-lg text-[#5A4535] leading-tight">
            {configSalao.nome}
          </h1>
          
          {/* Informações do Usuário Logado */}
          <div className="mt-4 px-3 py-2 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl w-full flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-full bg-[#8C6D58] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.nome.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#5A4535] truncate">{currentUser?.nome}</p>
              <p className="text-[9px] text-[#8C7A6B] uppercase font-semibold tracking-wider flex items-center gap-0.5 mt-0.5">
                {currentUser?.perfil === 'admin' ? (
                  <>
                    <Crown size={9} className="text-[#D4AF37]" />
                    <span>Administradora</span>
                  </>
                ) : (
                  <>
                    <UserIcon size={9} className="text-[#8C6D58]" />
                    <span>Profissional</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? 'bg-[#8C6D58] text-white shadow-sm' 
                    : 'text-[#5A4535] hover:bg-[#FAF9F6] hover:text-[#8C6D58]'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Switch View Link & Logout */}
        <div className="p-4 border-t border-[#EFECE6] space-y-2">
          <button
            onClick={() => setIsAdmin(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs font-semibold text-[#8C6D58] hover:bg-[#F3ECE0] transition-colors"
          >
            <ExternalLink size={14} />
            <span>Ver Link de Agendamento</span>
          </button>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#FDE2E2] hover:bg-[#FDF2F2] rounded-xl text-xs font-semibold text-[#C81E1E] transition-colors"
          >
            <LogOut size={14} />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFECE6] z-50 flex justify-around items-center px-2 py-2">
        {menuItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                active ? 'text-[#8C6D58]' : 'text-[#8C7A6B]'
              }`}
            >
              <Icon size={20} className={active ? 'text-[#8C6D58]' : 'text-[#8C7A6B]'} />
              <span className="mt-1">{item.name}</span>
            </button>
          );
        })}
        {currentUser?.perfil === 'admin' ? (
          <button
            onClick={() => setCurrentView('configuracoes')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              currentView === 'configuracoes' ? 'text-[#8C6D58]' : 'text-[#8C7A6B]'
            }`}
          >
            <Settings size={20} className={currentView === 'configuracoes' ? 'text-[#8C6D58]' : 'text-[#8C7A6B]'} />
            <span className="mt-1">Config</span>
          </button>
        ) : (
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-medium text-[#C81E1E]"
          >
            <LogOut size={20} />
            <span className="mt-1">Sair</span>
          </button>
        )}
      </nav>
    </>
  );
};
