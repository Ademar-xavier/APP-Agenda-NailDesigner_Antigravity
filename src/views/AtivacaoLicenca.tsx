import React, { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  Crown, 
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { ativarChaveLicenca, LicencaInfo } from '../services/licencaService';

interface AtivacaoLicencaProps {
  onLicencaAtivada: (licenca: LicencaInfo) => void;
  onVoltarAgendamento?: () => void;
}

export const AtivacaoLicenca: React.FC<AtivacaoLicencaProps> = ({ 
  onLicencaAtivada,
  onVoltarAgendamento 
}) => {
  const [chave, setChave] = useState('');
  const [titular, setTitular] = useState('Sheila Santos');
  const [feedback, setFeedback] = useState<{ sucesso: boolean; mensagem: string } | null>(null);
  const [ativando, setAtivando] = useState(false);

  const handleAtivar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAtivando(true);
    setFeedback(null);

    try {
      const res = await ativarChaveLicenca(chave, titular);
      setAtivando(false);
      setFeedback(res);

      if (res.sucesso && res.licenca) {
        setTimeout(() => {
          onLicencaAtivada(res.licenca!);
        }, 1200);
      }
    } catch (err) {
      setAtivando(false);
      setFeedback({ sucesso: false, mensagem: 'Erro ao validar chave de ativação.' });
    }
  };

  const preencherChaveDemonstracao = (chaveExemplo: string) => {
    setChave(chaveExemplo);
    setFeedback(null);
  };

  const handleComprarWhatsApp = () => {
    const msg = encodeURIComponent(
      'Olá! Gostaria de comprar ou ativar uma Chave de Licença para o aplicativo Agenda Nail Designer.'
    );
    // WhatsApp comercial para venda de licenças
    window.open(`https://wa.me/5535997141856?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#111110] text-[#F3EFEA] flex flex-col justify-between p-4 sm:p-6 font-sans select-none">
      {/* Topo / Marca */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-4 border-b border-[#2A2622]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8C6D58] to-[#553E2F] flex items-center justify-center shadow-lg border border-[#8C6D58]/40">
            <Lock size={18} className="text-[#F9EFE6]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-sm tracking-wide text-white">Sheila Santos</h1>
            <p className="text-[10px] text-[#A69485] uppercase tracking-wider font-semibold">Sistema de Gestão & Agenda</p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-900/30 text-amber-300 border border-amber-700/50 flex items-center gap-1">
          <Key size={11} /> Bloqueado por Licença
        </span>
      </header>

      {/* Conteúdo Principal / Card de Ativação */}
      <main className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-[#1A1816] border border-[#2E2823] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Luz de fundo decorativa */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#8C6D58]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8C6D58]/20 border border-[#8C6D58]/40 mb-2 text-[#E8C9B5]">
              <ShieldCheck size={30} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight">Ativação Obrigatória</h2>
            <p className="text-xs text-[#A8988B] leading-relaxed">
              Para desbloquear o acesso completo ao aplicativo neste aparelho, insira sua chave de licença vitalícia ou assinatura mensal ativa.
            </p>
          </div>

          {/* Feedback de Ativação */}
          {feedback && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in ${
              feedback.sucesso 
                ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300' 
                : 'bg-red-950/60 border border-red-700/60 text-red-300'
            }`}>
              {feedback.sucesso ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{feedback.sucesso ? 'Licença Confirmada!' : 'Falha na Ativação'}</p>
                <p className="opacity-90">{feedback.mensagem}</p>
              </div>
            </div>
          )}

          {/* Formulário de Digitação de Chave */}
          <form onSubmit={handleAtivar} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A69485] mb-2">
                Chave de Licença ou Assinatura:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="EX: SHEILA-VIP-2026"
                  value={chave}
                  onChange={(e) => setChave(e.target.value.toUpperCase())}
                  className="w-full bg-[#11100F] border border-[#3E352E] focus:border-[#8C6D58] focus:ring-1 focus:ring-[#8C6D58] rounded-2xl px-4 py-3.5 text-sm font-mono tracking-widest text-center text-white placeholder:text-[#5A4F46] outline-none transition-all uppercase font-bold"
                />
                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7C6B5F]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A69485] mb-2">
                Nome do Salão / Profissional:
              </label>
              <input
                type="text"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Nome da titular da licença"
                className="w-full bg-[#11100F] border border-[#3E352E] focus:border-[#8C6D58] rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-[#5A4F46] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={ativando || !chave.trim()}
              className="w-full py-4 bg-gradient-to-r from-[#8C6D58] to-[#6F523E] hover:from-[#9D7C65] hover:to-[#7E5E4A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#8C6D58]/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer mt-2"
            >
              {ativando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando Chave...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Ativar Licença e Desbloquear App</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Atalho de Chave Oficial Sheila */}
          <div className="pt-2 border-t border-[#2E2823]">
            <p className="text-[11px] text-[#A69485] text-center mb-2">
              Chave oficial da Sheila Santos:
            </p>
            <button
              type="button"
              onClick={() => preencherChaveDemonstracao('SHEILA-VIP-2026')}
              className="w-full py-2 bg-[#25211E] hover:bg-[#2F2A26] border border-[#3E352E] rounded-xl text-xs font-mono font-bold text-[#E8C9B5] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              title="Clique para preencher a chave oficial da Sheila"
            >
              <Crown size={14} className="text-amber-400" />
              <span>SHEILA-VIP-2026 (Vitalício)</span>
            </button>
          </div>

          {/* Planos e Venda de Licenças */}
          <div className="bg-[#141211] border border-[#2A2420] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                <span>Modalidades Disponíveis:</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#1D1A17] p-2.5 rounded-xl border border-[#332A24] space-y-1">
                <span className="font-bold text-amber-300 block">👑 Vitalício</span>
                <span className="text-[#8C7A6B] block text-[10px]">Acesso definitivo sem cobranças mensais.</span>
              </div>
              <div className="bg-[#1D1A17] p-2.5 rounded-xl border border-[#332A24] space-y-1">
                <span className="font-bold text-emerald-300 block">📅 Mensalidade</span>
                <span className="text-[#8C7A6B] block text-[10px]">Ativação por ciclo de 30 dias.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleComprarWhatsApp}
              className="w-full py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <MessageCircle size={14} />
              <span>Solicitar Chave de Licença no WhatsApp</span>
            </button>
          </div>

          {/* Link para voltar ao agendamento de clientes se necessário */}
          {onVoltarAgendamento && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onVoltarAgendamento}
                className="text-[11px] text-[#8C7A6B] hover:text-white underline underline-offset-4 transition-colors"
              >
                Sou cliente e quero fazer um agendamento
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Rodapé */}
      <footer className="max-w-md mx-auto w-full text-center py-4 border-t border-[#2A2622] text-[10px] text-[#6E6258]">
        Proteção Antipirataria & Gestão de Licenças © 2026. Todos os direitos reservados.
      </footer>
    </div>
  );
};
