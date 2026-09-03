import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Download, 
  Lock, 
  Key, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  ExternalLink,
  AlertTriangle,
  Apple
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

interface InstalarAppProps {
  onEntrarAdmin: () => void;
  onIrAgendar: () => void;
}

type PlatformType = 'android' | 'windows' | 'ios' | 'outro';

export const InstalarApp: React.FC<InstalarAppProps> = ({ onEntrarAdmin, onIrAgendar }) => {
  const { mostrarAlerta } = useAppState();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [plataformaAtual, setPlataformaAtual] = useState<PlatformType>('outro');
  
  // Modal de bloqueio de plataforma incompatível
  const [modalIncompativel, setModalIncompativel] = useState<{
    aberta: boolean;
    titulo: string;
    mensagem: string;
    plataformaTentada: string;
    plataformaCorreta: PlatformType;
  } | null>(null);

  useEffect(() => {
    // Detectar plataforma do usuário
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) {
      setPlataformaAtual('android');
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      setPlataformaAtual('ios');
    } else if (/windows|win32/i.test(ua)) {
      setPlataformaAtual('windows');
    } else {
      setPlataformaAtual('outro');
    }

    // Se já está instalado como standalone, vai direto para o Login!
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

  // 1. Ação para Android
  const handleInstalarAndroid = async () => {
    if (plataformaAtual === 'windows') {
      setModalIncompativel({
        aberta: true,
        titulo: 'Instalação Não Permitida',
        mensagem: 'Você está acessando em um computador Windows. O instalador Android não roda no Windows. Por favor, baixe o instalador oficial para Windows Desktop abaixo.',
        plataformaTentada: 'Android',
        plataformaCorreta: 'windows'
      });
      return;
    }

    if (plataformaAtual === 'ios') {
      setModalIncompativel({
        aberta: true,
        titulo: 'Instalação Não Permitida',
        mensagem: 'O sistema iOS da Apple não suporta aplicativos Android. Para o seu iPhone, utilize a opção "Versão iPhone / iOS" abaixo.',
        plataformaTentada: 'Android',
        plataformaCorreta: 'ios'
      });
      return;
    }

    // Se for Android
    if (!deferredPrompt) {
      mostrarAlerta({
        titulo: 'Como instalar no Android',
        mensagem: '1. Toque nos 3 pontinhos (⋮) do Google Chrome no topo direito.\n2. Toque em "Instalar aplicativo" ou "Adicionar à tela inicial".\n3. O ícone oficial da Agenda Nails Designer será fixado na sua tela inicial!',
        tipo: 'info'
      });
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

  // 2. Ação para Windows
  const handleBaixarWindows = () => {
    if (plataformaAtual === 'android') {
      setModalIncompativel({
        aberta: true,
        titulo: 'Instalador Incompatível',
        mensagem: 'Você está navegando em um celular Android. O arquivo executável do Windows (.exe) não abre em celulares. Instale a versão própria para Android acima!',
        plataformaTentada: 'Windows (.exe)',
        plataformaCorreta: 'android'
      });
      return;
    }

    if (plataformaAtual === 'ios') {
      setModalIncompativel({
        aberta: true,
        titulo: 'Instalador Incompatível',
        mensagem: 'O instalador Windows (.exe) não roda em aparelhos iPhone/iPad. Siga as instruções da versão iOS abaixo.',
        plataformaTentada: 'Windows (.exe)',
        plataformaCorreta: 'ios'
      });
      return;
    }

    // Se estiver no Windows:
    mostrarAlerta({
      titulo: 'Instalação no Windows',
      mensagem: 'Para instalar o aplicativo no seu computador Windows:\n\n1. No Google Chrome ou Edge, clique no ícone de computador que aparece no lado direito da barra de endereços.\n2. Ou clique nos 3 pontinhos do navegador ➔ "Instalar aplicativo Agenda Nails Designer".\n3. Um ícone exclusivo na Área de Trabalho será criado com abertura ultrarrápida!',
      tipo: 'info'
    });
  };

  // 3. Ação para iPhone (iOS)
  const handleInstalarIOS = () => {
    if (plataformaAtual === 'android') {
      setModalIncompativel({
        aberta: true,
        titulo: 'Aparelho Incompatível',
        mensagem: 'Seu dispositivo é Android. As instruções do Safari são exclusivas para iPhone/iPad. Utilize o botão de instalação para Android acima.',
        plataformaTentada: 'iPhone / iOS',
        plataformaCorreta: 'android'
      });
      return;
    }

    if (plataformaAtual === 'windows') {
      setModalIncompativel({
        aberta: true,
        titulo: 'Aparelho Incompatível',
        mensagem: 'Você está no Windows. O atalho de Safari é exclusivo para iPhone. Utilize o instalador para Windows Desktop.',
        plataformaTentada: 'iPhone / iOS',
        plataformaCorreta: 'windows'
      });
      return;
    }

    mostrarAlerta({
      titulo: 'Como instalar no iPhone / iPad',
      mensagem: '1. Abra este link no navegador Safari do seu iPhone.\n2. Toque no botão Compartilhar (o quadradinho com uma seta para cima na barra inferior).\n3. Role um pouco para baixo e toque em "Adicionar à Tela de Início".\n4. Toque em "Adicionar" no topo direito. Pronto! O app aparecerá na sua tela de apps.',
      tipo: 'info'
    });
  };

  return (
    <div className="min-h-screen bg-[#141312] text-white flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-4 border-b border-[#2D2825]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8C6D58] via-[#A8866F] to-[#453427] flex items-center justify-center shadow-md border border-[#C5A880]/30">
            <Sparkles size={18} className="text-[#F5E6D8]" />
          </div>
          <div>
            <span className="font-serif font-bold text-sm tracking-wide block text-white">Agenda Nails Designer</span>
            <span className="text-[10px] text-[#A69485] block uppercase tracking-wider font-semibold">Instalação do Aplicativo</span>
          </div>
        </div>

        <span className="text-[10px] font-bold bg-[#8C6D58]/20 text-[#E8CDB5] border border-[#8C6D58]/40 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Lock size={10} />
          <span>Área Profissional</span>
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full my-auto py-6 space-y-5">
        {/* App Icon Card - Logo Padrão Comercial */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-block">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#8C6D58] via-[#604938] to-[#2E2018] p-3 shadow-2xl border-2 border-[#C5A880]/50 mx-auto flex flex-col items-center justify-center relative overflow-hidden group">
              {/* Efeito Glow Dourado de Fundo */}
              <div className="absolute inset-0 bg-radial from-[#C5A880]/20 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                <Sparkles size={28} className="text-[#F5E6D8] drop-shadow-md mb-0.5" />
                <span className="font-serif font-bold text-[11px] tracking-widest text-[#E8CDB5] uppercase scale-90">
                  NAILS
                </span>
                <span className="text-[8px] tracking-widest text-[#C5A880] uppercase font-semibold">
                  PRO
                </span>
              </div>
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-[#141312]">
              <ShieldCheck size={14} />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
              Agenda Nails Designer
            </h1>
            <p className="text-xs text-[#B8A89A] max-w-xs mx-auto leading-relaxed">
              Painel completo de gestão, agenda de clientes e controle financeiro para Nail Designers.
            </p>
          </div>

          {/* Badge do Dispositivo Detectado */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E1B19] border border-[#3D352F] text-[11px] text-[#D8C7B8]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Dispositivo detectado: <strong>
              {plataformaAtual === 'android' && 'Celular Android'}
              {plataformaAtual === 'windows' && 'Computador Windows'}
              {plataformaAtual === 'ios' && 'Apple iPhone / iOS'}
              {plataformaAtual === 'outro' && 'Navegador Web'}
            </strong></span>
          </div>
        </div>

        {/* Escolha da Versão com Bloqueio de Incompatibilidade */}
        <div className="space-y-2.5">
          {/* Card Android */}
          <button
            onClick={handleInstalarAndroid}
            className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between ${
              plataformaAtual === 'android'
                ? 'bg-gradient-to-r from-[#2A2420] to-[#1E1A18] border-[#8C6D58] shadow-lg ring-1 ring-[#8C6D58]/50'
                : 'bg-[#181615] border-[#2E2824] hover:border-[#4A3F38] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                <Smartphone size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white">Versão Celular Android</span>
                  {plataformaAtual === 'android' && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md">Recomendado</span>
                  )}
                </div>
                <span className="text-[11px] text-[#A69485] block">Aplicativo oficial para smartphones Android</span>
              </div>
            </div>
            <Download size={16} className="text-[#8C6D58] shrink-0" />
          </button>

          {/* Card Windows Desktop */}
          <button
            onClick={handleBaixarWindows}
            className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between ${
              plataformaAtual === 'windows'
                ? 'bg-gradient-to-r from-[#2A2420] to-[#1E1A18] border-[#8C6D58] shadow-lg ring-1 ring-[#8C6D58]/50'
                : 'bg-[#181615] border-[#2E2824] hover:border-[#4A3F38] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-700/50 flex items-center justify-center text-blue-400">
                <Monitor size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white">Versão Windows Desktop</span>
                  {plataformaAtual === 'windows' && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-md">Recomendado</span>
                  )}
                </div>
                <span className="text-[11px] text-[#A69485] block">Instalação para computadores e notebooks</span>
              </div>
            </div>
            <Download size={16} className="text-[#8C6D58] shrink-0" />
          </button>

          {/* Card iPhone iOS */}
          <button
            onClick={handleInstalarIOS}
            className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between ${
              plataformaAtual === 'ios'
                ? 'bg-gradient-to-r from-[#2A2420] to-[#1E1A18] border-[#8C6D58] shadow-lg ring-1 ring-[#8C6D58]/50'
                : 'bg-[#181615] border-[#2E2824] hover:border-[#4A3F38] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-center justify-center text-purple-400">
                <Apple size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-white">Versão iPhone (iOS)</span>
                  {plataformaAtual === 'ios' && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-md">Recomendado</span>
                  )}
                </div>
                <span className="text-[11px] text-[#A69485] block">Instalação via navegador Safari</span>
              </div>
            </div>
            <Download size={16} className="text-[#8C6D58] shrink-0" />
          </button>
        </div>

        {/* Informações Comerciais e de Licença */}
        <div className="bg-[#1D1A18] border border-[#3A332E] rounded-2xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E8CDB5]">
            <Key size={14} className="text-[#8C6D58]" />
            <span>Licença de Uso & Ativação Obrigatória</span>
          </div>
          <p className="text-[11px] text-[#A69485] leading-relaxed">
            Ao abrir o aplicativo pela primeira vez, será solicitada a sua <strong>Chave de Licença Vitalícia</strong> ou ativação da <strong>Assinatura Mensal</strong>.
          </p>
        </div>

        {/* Action Button: Entrar / Ativar */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onEntrarAdmin}
            className="w-full py-3.5 px-6 bg-[#26221F] hover:bg-[#332D28] border border-[#3D352F] text-[#E8CDB5] hover:text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Key size={15} className="text-[#8C6D58]" />
            <span>Já Possuo Chave / Entrar no Sistema</span>
            <ArrowRight size={14} />
          </button>

          <div className="text-center pt-1">
            <button
              onClick={onIrAgendar}
              className="text-[11px] text-[#A69485] hover:text-[#E8CDB5] transition-colors underline underline-offset-4 flex items-center justify-center gap-1 mx-auto"
            >
              <ExternalLink size={11} />
              <span>Você é uma cliente querendo agendar? Toque aqui</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#73655A] py-3 border-t border-[#2D2825]">
        <span>Agenda Nails Designer • Sistema Comercial de Gestão</span>
      </footer>

      {/* MODAL DE BLOQUEIO DE PLATAFORMA INCOMPATÍVEL */}
      {modalIncompativel?.aberta && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C1917] border border-amber-600/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-serif font-bold text-lg text-white">
                {modalIncompativel.titulo}
              </h3>
              <p className="text-xs text-[#B8A89A] leading-relaxed">
                {modalIncompativel.mensagem}
              </p>
            </div>

            <div className="bg-[#26221F] border border-[#38312B] p-3 rounded-2xl text-[11px] text-[#D8C7B8] text-center">
              <span>Seu aparelho atual: <strong>
                {plataformaAtual === 'android' && 'Celular Android'}
                {plataformaAtual === 'windows' && 'Computador Windows'}
                {plataformaAtual === 'ios' && 'iPhone (iOS)'}
                {plataformaAtual === 'outro' && 'Navegador Web'}
              </strong></span>
            </div>

            <button
              onClick={() => setModalIncompativel(null)}
              className="w-full py-3 bg-gradient-to-r from-[#8C6D58] to-[#705441] hover:from-[#785B46] hover:to-[#5E4433] text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-98"
            >
              Entendido, vou usar a versão correta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
