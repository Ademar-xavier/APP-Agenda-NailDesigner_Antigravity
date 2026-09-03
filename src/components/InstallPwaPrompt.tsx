import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';

interface InstallPwaPromptProps {
  isAdmin?: boolean;
}

export const InstallPwaPrompt: React.FC<InstallPwaPromptProps> = ({ isAdmin = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está rodando como PWA instalado
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. REGRA DE SEGURANÇA COMERCIAL:
    // NUNCA exibe o prompt para clientes no link de agendamento!
    // Apenas exibe na área administrativa ou acessando #instalar
    const hash = window.location.hash.toLowerCase();
    const isPermitido = isAdmin || hash.includes('instalar') || hash.includes('admin');
    if (!isPermitido) {
      return;
    }

    // Escuta evento nativo do navegador para instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <aside aria-label="Instalação do Aplicativo" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#1C1A18] text-white p-4 rounded-2xl border border-[#8C6D58]/40 shadow-2xl flex items-center justify-between gap-3.5 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-[#8C6D58] text-white flex items-center justify-center shrink-0 shadow-md">
          <Smartphone size={22} className="animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
            <span>Instalar no Celular</span>
            <span className="text-[10px] bg-[#8C6D58]/40 text-[#E2BA8E] px-1.5 py-0.2 rounded-full font-semibold">1 Toque</span>
          </h4>
          <p className="text-[11px] text-[#B8A89A] truncate mt-0.5">
            Abra direto da tela inicial, sem Play Store!
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-gradient-to-r from-[#8C6D58] to-[#A3826B] hover:from-[#7A5D49] hover:to-[#8C6D58] text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <Download size={13} />
            <span>Instalar</span>
          </button>

          <button
            onClick={() => setShowPrompt(false)}
            className="p-1 text-[#8C7A6B] hover:text-white rounded-lg transition-colors"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
