import React, { useState } from 'react';
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
  CheckCircle,
  Package,
  ClipboardList,
  Menu,
  X
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AlicateIcon } from './AlicateIcon';

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
  setIsAdmin: _setIsAdmin 
}) => {
  const { 
    configSalao, 
    currentUser, 
    logout 
  } = useAppState();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const allMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', name: 'Agenda', icon: Calendar },
    { id: 'clientes', name: 'Clientes', icon: Users, adminOnly: true },
    { id: 'confirmacoes', name: 'Confirmações', icon: CheckCircle },
    { id: 'servicos', name: 'Serviços', icon: AlicateIcon, adminOnly: true },
    { id: 'cadastros', name: 'Cadastros', icon: ClipboardList, adminOnly: true },
    { id: 'materiais', name: 'Materiais', icon: Package, adminOnly: true },
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
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-3 border-2 border-[#FCE4EC] overflow-hidden shadow-md p-0.5">
            <img 
              src="./logo.png" 
              alt="Logo Sheila Santos Nails Designer" 
              className="w-full h-full object-cover rounded-full" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-2xl font-serif text-[#D48B70] font-bold';
                  span.innerText = 'SS';
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
              {currentUser ? (currentUser.nome.trim().split(/\s+/).length >= 2 ? (currentUser.nome.trim().split(/\s+/)[0][0] + currentUser.nome.trim().split(/\s+/).slice(-1)[0][0]).toUpperCase() : currentUser.nome.substring(0, 2).toUpperCase()) : '?'}
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
        {/* Logout */}
        <div className="p-4 border-t border-[#EFECE6]">
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
            onClick={() => setShowMobileMenu(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              showMobileMenu ? 'text-[#8C6D58]' : 'text-[#8C7A6B]'
            }`}
          >
            <Menu size={20} className={showMobileMenu ? 'text-[#8C6D58]' : 'text-[#8C7A6B]'} />
            <span className="mt-1">Mais</span>
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

      {/* Mobile Slide-up Menu Sheet */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center md:hidden"
          onClick={() => setShowMobileMenu(false)}
        >
          <div 
            className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl border-t border-[#EFECE6] p-6 animate-in slide-in-from-bottom duration-200 pb-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#EFECE6] pb-3 mb-4">
              <h3 className="font-serif font-bold text-base text-[#5A4535]">Menu Completo</h3>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] pr-1">
              {/* Remaining items starting from index 4 */}
              {menuItems.slice(4).map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl text-xs font-semibold transition-all border ${
                      active 
                        ? 'bg-[#8C6D58] border-[#8C6D58] text-white shadow-sm' 
                        : 'bg-[#FAF9F6] border-[#EFECE6] text-[#5A4535] hover:bg-[#F3ECE0]'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-[#EFECE6]">
              <button
                onClick={() => {
                  logout();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-red-100 hover:bg-red-50 rounded-2xl text-xs font-bold text-[#C81E1E] transition-colors"
              >
                <LogOut size={14} />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
