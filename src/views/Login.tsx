import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import { Lock, Heart, Shield, Sparkles, User, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { verificarBloqueioLogin, registrarFalhaLogin, resetarFalhasLogin } from '../services/securityShield';

interface LoginProps {
  setIsAdmin: (isAdmin: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ setIsAdmin }) => {
  const { loginWithCredentials } = useAppState();
  const [usuarioInput, setUsuarioInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [bloqueioSegundos, setBloqueioSegundos] = useState<number>(0);

  // Verifica se há bloqueio ativo por excesso de tentativas
  useEffect(() => {
    const status = verificarBloqueioLogin();
    if (status.bloqueado) {
      setBloqueioSegundos(status.segundosRestantes);
    }
  }, []);

  // Timer regressivo de bloqueio
  useEffect(() => {
    if (bloqueioSegundos <= 0) return;
    const timer = setInterval(() => {
      setBloqueioSegundos(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bloqueioSegundos]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Se estiver em período de bloqueio por tentativas
    if (bloqueioSegundos > 0) {
      setError(`Acesso temporariamente bloqueado por segurança. Aguarde ${bloqueioSegundos}s.`);
      return;
    }

    const targetUser = usuarioInput.trim();
    const pwd = password.trim();

    if (!targetUser) {
      setError('Por favor, digite o seu usuário ou e-mail.');
      return;
    }

    if (!pwd) {
      setError('Por favor, digite a sua senha de acesso.');
      return;
    }

    const success = loginWithCredentials(targetUser, pwd);
    if (success) {
      resetarFalhasLogin();
    } else {
      const falha = registrarFalhaLogin();
      if (falha.bloqueouAgora) {
        setBloqueioSegundos(falha.segundosRestantes);
        setError(`Múltiplas tentativas incorretas detectadas! O acesso foi bloqueado por ${falha.segundosRestantes} segundos para proteção da conta.`);
      } else {
        setError('Usuário ou senha incorretos. Verifique suas credenciais.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col justify-between items-center py-12 px-4 font-sans text-[#EAEAEA]">
      {/* Top Margin Spacer */}
      <div></div>

      {/* Login Box */}
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2D2D2D] rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        {/* Logo no topo - Imagem 2 Rosa com Borda Suave */}
        <div className="w-24 h-24 rounded-full bg-white border-2 border-[#FCE4EC] flex items-center justify-center mb-6 overflow-hidden shadow-xl p-0.5">
          <img 
            src="./logo.png?v=3" 
            alt="Logo Sheila Santos Nails Designer" 
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const span = document.createElement('span');
                span.className = 'text-3xl font-serif text-[#D48B70] font-extrabold';
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
            <div className="p-3 bg-[#3d1313] border border-[#C81E1E] rounded-xl text-xs text-[#F8D7DA] flex items-start gap-2">
              <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo de Usuário digitável e seguro */}
          <div>
            <label className="block text-[10px] font-bold text-[#A19488] uppercase tracking-wider mb-2">
              Usuário ou E-mail
            </label>
            <div className="flex items-center bg-[#141414] border border-[#333] hover:border-[#8C6D58] focus-within:border-[#8C6D58] rounded-xl px-4 py-3 transition-colors">
              <User size={16} className="text-[#555] shrink-0 mr-3" />
              <input
                type="text"
                required
                autoCapitalize="none"
                autoComplete="username"
                placeholder="Digite seu usuário ou e-mail"
                value={usuarioInput}
                onChange={(e) => setUsuarioInput(e.target.value)}
                disabled={bloqueioSegundos > 0}
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-[#666] focus:ring-0 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Senha com visualização segura */}
          <div>
            <label className="block text-[10px] font-bold text-[#A19488] uppercase tracking-wider mb-2">
              Senha / Código de Acesso
            </label>
            <div className="flex items-center bg-[#141414] border border-[#333] hover:border-[#8C6D58] focus-within:border-[#8C6D58] rounded-xl px-4 py-3 transition-colors">
              <Lock size={16} className="text-[#555] shrink-0 mr-3" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Digite a sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={bloqueioSegundos > 0}
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-[#666] focus:ring-0 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#666] hover:text-[#AAA] p-1 transition-colors"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit com proteção anti-força bruta */}
          <button
            type="submit"
            disabled={bloqueioSegundos > 0}
            className="w-full bg-[#8C6D58] hover:bg-[#725743] disabled:bg-[#444] disabled:opacity-60 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 active:scale-98"
          >
            <Shield size={14} />
            <span>
              {bloqueioSegundos > 0 ? `Bloqueado (${bloqueioSegundos}s)` : 'Acessar Painel'}
            </span>
          </button>
        </form>

        {/* Separator */}
        <div className="w-full flex items-center justify-center gap-3 my-6">
          <div className="h-[1px] bg-[#333] flex-1"></div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#555]">ou</span>
          <div className="h-[1px] bg-[#333] flex-1"></div>
        </div>

        {/* Botão de retorno ao agendamento */}
        <button
          onClick={() => setIsAdmin(false)}
          className="w-full bg-[#2A2A2A] hover:bg-[#333] text-[#CCC] py-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-[#3A3A3A]"
        >
          <Sparkles size={14} className="text-[#8C6D58]" />
          <span>Ir para o Agendamento de Clientes</span>
        </button>
      </div>

      {/* Footer Branding */}
      <footer className="mt-8 text-center text-xs text-[#555] flex items-center gap-1">
        <span>Sheila Santos Nails Designer © 2026</span>
        <Heart size={10} className="text-[#8C6D58] fill-current" />
      </footer>
    </div>
  );
};
