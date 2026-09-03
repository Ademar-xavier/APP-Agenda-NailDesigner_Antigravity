import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Lock, Key, ShieldCheck, ArrowRight, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';

interface InstalarAppProps {
  onEntrarAdmin: () => void;
  onIrAgendar: () => void;
}

export const InstalarApp: React.FC<InstalarAppProps> = ({ onEntrarAdmin, onIrAgendar }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    // Se já está instalado, não deve ficar na tela de instalação: vai direto para o Login!
    const isRunningStandalone = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone;
    if (isRunningStandalone) {
      setIsInstalled(true);
      onEntrarAdmin();
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'Como instalar no seu celular:\n\n' +
        '1. Toque nos 3 pontinhos (⋮) do seu navegador (Google Chrome) no topo direito.\n' +
        '2. Toque em "Instalar aplicativo" ou "Adicionar à tela inicial".\n' +
        '3. O ícone oficial da Sheila Santos será fixado no seu celular!'
      );
      return;
    }

    setInstalando(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setTimeout(() => {
        onEntrarAdmin();
      }, 1000);
    }
    setInstalando(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-[#141312] text-white flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-4 border-b border-[#2D2825]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8C6D58] to-[#604938] flex items-center justify-center shadow-md">
            <Sparkles size={18} className="text-[#F5E6D8]" />
          </div>
          <div>
            <span className="font-serif font-bold text-sm tracking-wide block text-white">Sheila Santos</span>
            <span className="text-[10px] text-[#A69485] block uppercase tracking-wider font-semibold">Área da Profissional</span>
          </div>
        </div>

        <span className="text-[10px] font-bold bg-[#8C6D58]/20 text-[#E8CDB5] border border-[#8C6D58]/40 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Lock size={10} />
          <span>Acesso Restrito</span>
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full my-auto py-8 space-y-6">
        {/* App Icon Card */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-b from-[#8C6D58] to-[#453427] p-1.5 shadow-2xl border border-[#A3826B]/40 mx-auto flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Logo Sheila Santos" 
                className="w-full h-full object-contain rounded-2xl drop-shadow-md"
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-2 border-[#141312]">
              <ShieldCheck size={16} />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Instalação do Aplicativo
            </h1>
            <p className="text-xs sm:text-sm text-[#B8A89A] max-w-xs mx-auto leading-relaxed">
              Painel completo de gestão, agenda de clientes e controle financeiro para Nail Designers.
            </p>
          </div>
        </div>

        {/* Informações Comerciais e de Segurança */}
        <div className="bg-[#1D1A18] border border-[#3A332E] rounded-2xl p-4.5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E8CDB5]">
            <Key size={14} className="text-[#8C6D58]" />
            <span>Licença de Uso & Ativação</span>
          </div>
          <p className="text-[11px] text-[#A69485] leading-relaxed">
            Este aplicativo requer ativação por <strong>chave de licença vitalícia</strong> ou <strong>assinatura mensal ativa</strong>. O acesso é exclusivo para a profissional e sua equipe autorizada.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-[#CFC2B6]">
            <div className="bg-[#26221F] p-2 rounded-xl flex items-center gap-1.5 border border-[#332D28]">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span>Agenda em Tempo Real</span>
            </div>
            <div className="bg-[#26221F] p-2 rounded-xl flex items-center gap-1.5 border border-[#332D28]">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span>Fotos Antes e Depois</span>
            </div>
            <div className="bg-[#26221F] p-2 rounded-xl flex items-center gap-1.5 border border-[#332D28]">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span>Financeiro & Pix</span>
            </div>
            <div className="bg-[#26221F] p-2 rounded-xl flex items-center gap-1.5 border border-[#332D28]">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span>WhatsApp Meta Bot</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {!isInstalled ? (
            <button
              onClick={handleInstallClick}
              disabled={instalando}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#8C6D58] via-[#A8866F] to-[#8C6D58] hover:from-[#785B46] hover:to-[#785B46] text-white rounded-2xl font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-98"
            >
              <Download size={18} className={instalando ? 'animate-bounce' : ''} />
              <span>{instalando ? 'Abrindo Instalador...' : 'Instalar Aplicativo no Celular'}</span>
            </button>
          ) : (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center space-y-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 size={14} />
                <span>Aplicativo Já Instalado no Dispositivo!</span>
              </span>
              <p className="text-[11px] text-emerald-300/80">
                Você pode abrir pelo ícone na tela inicial ou entrar diretamente abaixo.
              </p>
            </div>
          )}

          <button
            onClick={onEntrarAdmin}
            className="w-full py-3.5 px-6 bg-[#26221F] hover:bg-[#332D28] border border-[#3D352F] text-[#E8CDB5] hover:text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Key size={15} className="text-[#8C6D58]" />
            <span>Ativar Chave de Licença / Entrar</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Link para Clientes (Prevenção) */}
        <div className="text-center pt-2">
          <button
            onClick={onIrAgendar}
            className="text-[11px] text-[#A69485] hover:text-[#E8CDB5] transition-colors underline underline-offset-4 flex items-center justify-center gap-1 mx-auto"
          >
            <ExternalLink size={11} />
            <span>Você é uma cliente querendo agendar? Toque aqui</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#73655A] py-4 border-t border-[#2D2825]">
        <span>Sheila Santos Nails Designer • Sistema Comercial de Gestão</span>
      </footer>
    </div>
  );
};
