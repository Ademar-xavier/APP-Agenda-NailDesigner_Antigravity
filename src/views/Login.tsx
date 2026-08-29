import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { Lock, Heart, Shield, Sparkles } from 'lucide-react';

interface LoginProps {
  setIsAdmin: (isAdmin: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ setIsAdmin }) => {
  const { equipe, login } = useAppState();
  const [selectedUserId, setSelectedUserId] = useState<string>(equipe[0]?.id || '');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Para fins de demonstração do protótipo, qualquer senha ou a senha "1234" é aceita
    if (selectedUserId) {
      login(selectedUserId);
    } else {
      setError('Por favor, selecione um usuário.');
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col justify-between items-center py-12 px-4 font-sans text-[#EAEAEA]">
      {/* Top Margin Spacer */}
      <div></div>

      {/* Login Box */}
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2D2D2D] rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        {/* Logo no topo */}
        <div className="w-24 h-24 rounded-full bg-[#141414] border border-[#3A3A3A] flex items-center justify-center mb-6 overflow-hidden">
          <img 
            src="/logo.png" 
            alt="Logo Sheila Santos" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const span = document.createElement('span');
                span.className = 'text-3xl font-serif text-[#8C6D58] font-extrabold';
                span.innerText = 'SS';
                parent.appendChild(span);
              }
            }}
          />
        </div>

        <h2 className="font-serif font-bold text-2xl text-white text-center leading-tight">
          Painel de Gestão
        </h2>
        <p className="text-xs text-[#A19488] text-center mt-1">
          Acesse a sua conta profissional ou administrativa
        </p>

        <form onSubmit={handleLoginSubmit} className="w-full mt-8 space-y-5">
          {error && (
            <div className="p-3 bg-[#3d1313] border border-[#C81E1E] rounded-xl text-xs text-[#F8D7DA]">
              {error}
            </div>
          )}

          {/* Selecionar Usuário */}
          <div>
            <label className="block text-[10px] font-bold text-[#A19488] uppercase tracking-wider mb-2">
              Profissional / Perfil
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-[#141414] border border-[#333] hover:border-[#8C6D58] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#8C6D58] transition-colors"
            >
              <option value="" disabled>-- Selecione seu perfil --</option>
              {equipe
                .filter(u => u.ativo)
                .map(u => (
                  <option key={u.id} value={u.id} className="bg-[#1E1E1E]">
                    {u.nome} ({u.perfil === 'admin' ? 'Administradora' : 'Profissional'})
                  </option>
                ))}
            </select>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-[10px] font-bold text-[#A19488] uppercase tracking-wider mb-2">
              Senha / Código de Acesso
            </label>
            <div className="flex items-center bg-[#141414] border border-[#333] hover:border-[#8C6D58] focus-within:border-[#8C6D58] rounded-xl px-4 py-3 transition-colors">
              <Lock size={16} className="text-[#555] shrink-0 mr-3" />
              <input
                type="password"
                placeholder="Qualquer senha ou digite 1234"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-[#555] focus:ring-0"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
          >
            <Shield size={14} />
            <span>Acessar Painel</span>
          </button>
        </form>

        {/* Separator */}
        <div className="w-full flex items-center justify-center gap-3 my-6">
          <div className="h-[1px] bg-[#333] flex-1"></div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#555]">ou</span>
          <div className="h-[1px] bg-[#333] flex-1"></div>
        </div>

        {/* Link para página pública */}
        <button
          onClick={() => setIsAdmin(false)}
          className="w-full border border-[#333] hover:border-[#8C6D58] hover:bg-[#141414] text-[#A19488] hover:text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles size={14} />
          <span>Ir para o Agendamento de Clientes</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#555] flex items-center justify-center gap-1">
        <span>Sheila Santos Nails Designer © 2026</span>
        <Heart size={10} className="fill-[#555] text-[#555]" />
      </footer>
    </div>
  );
};
