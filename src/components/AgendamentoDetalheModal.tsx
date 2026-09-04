import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageCircle, 
  Clock, 
  User, 
  Sparkles, 
  FileText,
  UserX,
  XCircle,
  CalendarCheck,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { MetodoPagamento } from '../types';
import { obterConfigMetaWhatsApp, enviarMensagemBotaoMeta } from '../services/metaWhatsApp';
import { getConfirmationUrl, getBookingUrl, gerarLinkWhatsApp, preencherTemplateWhatsApp } from '../utils/urlHelper';

interface AgendamentoDetalheModalProps {
  agendamentoId: string;
  onClose: () => void;
}

type Acao = null | 'cancelar' | 'concluir' | 'falta';

export const AgendamentoDetalheModal: React.FC<AgendamentoDetalheModalProps> = ({ 
  agendamentoId, 
  onClose 
}) => {
  const { 
    agendamentos, 
    clientes, 
    pagamentos, 
    equipe, 
    configSalao,
    updateAgendamentoStatus,
    cancelAgendamento,
    confirmarSinal,
    concluirAtendimento,
    obterServicosDeAgendamento,
    confirmarAcao,
    mostrarAlerta
  } = useAppState();

  const [acao, setAcao] = useState<Acao>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [metodoPgto, setMetodoPgto] = useState<MetodoPagamento>('pix');
  const [valorRecebido, setValorRecebido] = useState(0);

  const agendamento = agendamentos.find(a => a.id === agendamentoId);
  const cliente = clientes.find(c => c.id === agendamento?.cliente_id);
  const prof = equipe.find(u => u.id === agendamento?.profissional_id);
  const servs = agendamento ? obterServicosDeAgendamento(agendamento.id) : [];

  useEffect(() => {
    if (agendamento) {
      // Por padrão, sugere o valor total a receber na conclusão
      const jaPago = agendamento.status === 'confirmado' ? agendamento.valor_sinal : 0;
      setValorRecebido(agendamento.valor_total - jaPago);
    }
  }, [agendamento]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!agendamento) return null;

  const initials = cliente?.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarDataLonga = (dateStr: string) => {
    const date = new Date(dateStr);
    const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    return `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const formatarObservacoesModal = (obs?: string, clienteNome?: string) => {
    if (!obs || !obs.trim()) return null;

    const isGoogle = 
      obs.includes('[Google Agenda Oficial]') || 
      obs.includes('Google Agenda') || 
      obs.includes('g_gen_');

    if (!isGoogle) {
      return {
        isGoogle: false,
        nota: obs.trim()
      };
    }

    // Limpa tags técnicas do Google e identificadores hash
    let limpo = obs
      .replace(/\[Google Agenda Oficial\]/gi, '')
      .replace(/Sincronizado automaticamente da Google Agenda/gi, '')
      .replace(/ID:[a-zA-Z0-9_\-]+(\s*-\s*)?/gi, '')
      .replace(/g_gen_[a-zA-Z0-9_\-]+/gi, '')
      .trim();

    // Se após a limpeza sobrou apenas hífen ou o próprio nome da cliente
    if (limpo === '-' || limpo === '—') {
      limpo = '';
    }
    if (clienteNome && (limpo.toLowerCase() === clienteNome.toLowerCase() || limpo.toLowerCase() === `- ${clienteNome.toLowerCase()}`)) {
      limpo = '';
    }

    return {
      isGoogle: true,
      nota: limpo
    };
  };

  // WhatsApp helper
  const handleEnviarMensagemWhatsApp = async (tipo: 'confirmacao' | 'lembrete') => {
    if (!cliente) return;
    const fone = cliente.telefone.replace(/\D/g, '');
    const horaStr = agendamento.inicio.split('T')[1].substring(0, 5);
    const servText = servs.map(s => s.nome).join(' + ');
    const dataFormatada = new Date(agendamento.inicio).toLocaleDateString('pt-BR');

    const formatarDiaRelativo = (dataInicioStr: string): string => {
      const hojeStr = new Date().toLocaleDateString('en-CA');
      const dataApenas = dataInicioStr.split('T')[0];
      if (dataApenas === hojeStr) return 'hoje';
      const dHoje = new Date(hojeStr + 'T00:00:00');
      const dAgend = new Date(dataApenas + 'T00:00:00');
      const diffDias = Math.round((dAgend.getTime() - dHoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias === 1) return 'amanhã';
      if (diffDias === -1) return 'ontem';
      return `no dia ${dataApenas.split('-').reverse().join('/')}`;
    };
    const diaRelativo = formatarDiaRelativo(agendamento.inicio);

    const linkConfirmacao = getConfirmationUrl(agendamento.id);

    const enviarWhatsAppConvencional = () => {
      let msg = '';
      if (tipo === 'confirmacao') {
        msg = preencherTemplateWhatsApp(configSalao.templates_whatsapp.confirmacao, {
          cliente: cliente.nome,
          servico: servText,
          profissional: prof?.nome || 'Sheila',
          data: dataFormatada,
          hora: horaStr,
          sinal: String(agendamento.valor_sinal),
          chave_pix: configSalao.chave_pix,
          link_reserva: linkConfirmacao,
          link_confirmacao: linkConfirmacao,
          salao: configSalao.nome || 'Sheila Santos Nails'
        });

        if (!msg.includes(linkConfirmacao)) {
          msg += `\n\n👉 Confirme sua presença em 1 toque:\n${linkConfirmacao}`;
        }
      } else {
        let templateLembrete = configSalao.templates_whatsapp.lembrete
          .replace(/amanhã\s*\(\{data\}\)/gi, `${diaRelativo} ({data})`)
          .replace(/\bamanhã\b/gi, diaRelativo);

        msg = preencherTemplateWhatsApp(templateLembrete, {
          cliente: cliente.nome,
          servico: servText,
          dia_relativo: diaRelativo,
          data: dataFormatada,
          hora: horaStr,
          profissional: prof?.nome || 'Sheila',
          limite_horas: String(configSalao.regras.cancelamento_limite_horas),
          link_confirmacao: linkConfirmacao,
          link_reserva: linkConfirmacao,
          salao: configSalao.nome || 'Sheila Santos Nails'
        });

        if (!msg.includes(linkConfirmacao)) {
          msg += `\n\n👉 Confirme sua presença em 1 toque:\n${linkConfirmacao}`;
        }
      }

      const url = gerarLinkWhatsApp(cliente.telefone, msg);
      if (!url) {
        mostrarAlerta({
          titulo: 'Telefone Não Cadastrado',
          mensagem: `A cliente "${cliente.nome}" não possui um número de telefone com DDD válido cadastrado no sistema. Por favor, acesse a aba "Clientes" e adicione o número com DDD (ex: 35 99999-9999).`,
          tipo: 'aviso'
        });
        return;
      }
      window.open(url, '_blank');
    };

    // Se a Meta Cloud API estiver ativa, oferece envio oficial com botões clicáveis
    const metaConfig = obterConfigMetaWhatsApp();
    if (metaConfig.ativo && metaConfig.phoneNumberId && metaConfig.accessToken) {
      confirmarAcao({
        titulo: 'Enviar com Botões Oficiais do WhatsApp?',
        mensagem: 'A cliente receberá uma mensagem interativa com os botões [✅ Confirmar Horário] e [❌ Cancelar]. Se preferir abrir no aplicativo do WhatsApp, escolha "Abrir no WhatsApp".',
        tipo: 'info',
        textoConfirmar: 'Enviar Botões Oficiais',
        textoCancelar: 'Abrir no WhatsApp',
        onConfirm: async () => {
          const textoCorpo = tipo === 'confirmacao'
            ? `Olá ${cliente.nome}! ✨ Seu agendamento de ${servText} está reservado para ${dataFormatada} às ${horaStr}.\n\nPor favor, confirme sua presença tocando em um dos botões abaixo ou pelo link:\n${linkConfirmacao}`
            : `Olá ${cliente.nome}! ⏰ Lembrando do seu horário de ${servText} ${diaRelativo} (${dataFormatada}) às ${horaStr}.\n\nConfirma seu comparecimento?\n👉 ${linkConfirmacao}`;

          const res = await enviarMensagemBotaoMeta({
            destinatario: fone,
            headerText: '✨ Sheila Santos Nails',
            textoCorpo,
            botoes: [
              { id: `confirmar_${agendamento.id}`, title: '✅ Confirmar Horário' },
              { id: `cancelar_${agendamento.id}`, title: '❌ Cancelar / Remarcar' }
            ]
          });

          mostrarAlerta({
            titulo: res.sucesso ? 'Mensagem Enviada' : 'Aviso no Envio',
            mensagem: res.mensagem,
            tipo: res.sucesso ? 'sucesso' : 'erro'
          });
          if (!res.sucesso) {
            enviarWhatsAppConvencional();
          }
        },
        onCancel: () => {
          enviarWhatsAppConvencional();
        }
      });
      return;
    }

    enviarWhatsAppConvencional();
  };

  // Lógica de ações
  const handleConfirmar = () => {
    updateAgendamentoStatus(agendamento.id, 'confirmado');
    onClose();
  };

  const handleCancelar = () => {
    if (!motivoCancelamento.trim()) return;
    cancelAgendamento(agendamento.id, motivoCancelamento, 'admin');

    if (cliente?.telefone) {
      const fone = cliente.telefone.replace(/\D/g, '');
      const dataStr = new Date(agendamento.inicio).toLocaleDateString('pt-BR');
      const horaStr = agendamento.inicio.split('T')[1].substring(0, 5);
      const msg = `Olá, ${cliente.nome}! Informamos que o seu agendamento para ${dataStr} às ${horaStr} precisou ser cancelado. Motivo: ${motivoCancelamento}. Caso queira reagendar para outro dia ou horário, estamos à sua inteira disposição! 💕\n\n📅 Escolha um novo horário online:\n${getBookingUrl()}`;
      const url = gerarLinkWhatsApp(cliente.telefone, msg);
      if (url) window.open(url, '_blank');
    }

    setAcao(null);
    onClose();
  };

  const handleFalta = () => {
    updateAgendamentoStatus(agendamento.id, 'falta');
    setAcao(null);
    onClose();
  };

  const handleConcluir = () => {
    concluirAtendimento(agendamento.id, valorRecebido, metodoPgto);
    setAcao(null);
    onClose();
  };

  // Status Styles
  const statusStyles: { [key: string]: string } = {
    pendente: 'bg-[#FFF9E6] text-[#B78103] border-[#FFECB3]',
    confirmado: 'bg-[#EBF7EE] text-[#2B7A4B] border-[#C2EAD0]',
    concluido: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelado: 'bg-red-50 text-red-700 border-red-150',
    falta: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-150'
  };

  const statusLabels: { [key: string]: string } = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    falta: 'Falta'
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EFECE6] my-8 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Like Claude's UI) */}
        <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#F6ECE8] text-[#8C6D58] flex items-center justify-center font-bold text-sm border border-[#EFECE6]">
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-[#5A4535] text-sm leading-tight">{cliente?.nome || 'Horário Reservado'}</h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">{cliente?.telefone}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase ${statusStyles[agendamento.status] || ''}`}>
            {statusLabels[agendamento.status] || agendamento.status}
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B] ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-[#5A4535] mb-4">
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Data</p>
            <p className="font-semibold mt-0.5">{formatarDataLonga(agendamento.inicio)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Horário</p>
            <p className="font-semibold mt-0.5">
              {agendamento.inicio.split('T')[1].substring(0, 5)} - {agendamento.fim.split('T')[1].substring(0, 5)} 
              <span className="text-[#8C7A6B] font-normal"> ({
                Math.floor((new Date(agendamento.fim).getTime() - new Date(agendamento.inicio).getTime()) / (60 * 1000))
              }min)</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Profissional</p>
            <p className="font-semibold mt-0.5">{prof?.nome || 'Não definido'}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Origem</p>
            <p className="font-semibold mt-0.5 capitalize">{agendamento.origem}</p>
          </div>
        </div>

        {/* Services Box */}
        <div className="rounded-xl border border-[#EFECE6] p-3.5 mb-4 bg-[#FAF9F6]">
          <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-2">Serviços</p>
          <div className="space-y-1.5 text-xs text-[#5A4535]">
            {servs.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.nome}</span>
                <span className="font-semibold">{formatarMoeda(s.preco)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-between border-t border-[#EFECE6] pt-2 text-xs font-bold text-[#5A4535]">
            <span>Total</span>
            <span>{formatarMoeda(agendamento.valor_total)}</span>
          </div>
          {agendamento.valor_sinal > 0 && (
            <div className="mt-1 flex justify-between text-[10px] text-[#8C7A6B]">
              <span>Sinal previsto</span>
              <span>{formatarMoeda(agendamento.valor_sinal)}</span>
            </div>
          )}
        </div>

        {/* Observações / Origem */}
        {(() => {
          const infoObs = formatarObservacoesModal(agendamento.observacoes, cliente?.nome);
          if (!infoObs) return null;

          return (
            <div className="mb-4 space-y-2">
              {infoObs.isGoogle && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#F0F7FF] border border-[#D0E3F8] rounded-xl text-xs text-[#1E429F] shadow-sm">
                  <Calendar size={16} className="text-[#3B82F6] shrink-0" />
                  <div>
                    <span className="font-semibold text-xs block">Sincronizado com Google Agenda Oficial</span>
                    <span className="text-[10px] text-[#4B5563]">Importado e mantido em sincronia com seu calendário</span>
                  </div>
                </div>
              )}

              {infoObs.nota ? (
                <div className="p-3 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs text-[#5A4535]">
                  <span className="block font-bold text-[10px] uppercase text-[#8C7A6B] mb-1">
                    Observações:
                  </span>
                  <p className="italic text-[#786150] whitespace-pre-line">{infoObs.nota}</p>
                </div>
              ) : null}
            </div>
          );
        })()}

        {/* Lembretes WhatsApp */}
        {agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && agendamento.status !== 'falta' && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => handleEnviarMensagemWhatsApp('lembrete')}
              className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-bold transition-colors"
            >
              <MessageCircle size={14} className="text-[#25D366]" />
              <span>Enviar lembrete</span>
            </button>
            {agendamento.status === 'pendente' && (
              <button
                onClick={() => handleEnviarMensagemWhatsApp('confirmacao')}
                className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-bold transition-colors"
              >
                <MessageCircle size={14} className="text-[#25D366]" />
                <span>Pedir confirmação</span>
              </button>
            )}
          </div>
        )}

        {/* --- INLINE ACTION BOXES --- */}
        
        {/* Cancelar inline */}
        {acao === 'cancelar' && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-xl space-y-3 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Motivo do cancelamento</label>
              <textarea
                rows={2}
                required
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: pedido da cliente, imprevisto pessoal..."
                className="w-full border border-red-200 rounded-lg px-2 py-1 text-xs text-red-900 bg-white focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" onClick={() => setAcao(null)}
                className="px-3 py-1.5 text-red-700 hover:bg-red-100 rounded-lg font-semibold"
              >
                Voltar
              </button>
              <button 
                type="button" onClick={handleCancelar}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        )}

        {/* Concluir inline */}
        {acao === 'concluir' && (
          <div className="p-3 border border-[#8C6D58]/20 bg-[#FAF6F0] rounded-xl space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#8C6D58] uppercase mb-1">Forma de pagamento</label>
                <select
                  value={metodoPgto}
                  onChange={(e) => setMetodoPgto(e.target.value as MetodoPagamento)}
                  className="w-full border border-[#EFECE6] rounded-lg px-2 py-1.5 bg-white text-[#5A4535]"
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8C6D58] uppercase mb-1">Valor recebido</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(Number(e.target.value))}
                  className="w-full border border-[#EFECE6] rounded-lg px-2 py-1.5 bg-white text-[#5A4535]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" onClick={() => setAcao(null)}
                className="px-3 py-1.5 text-[#8C6D58] hover:bg-[#F3ECE0] rounded-lg font-semibold"
              >
                Voltar
              </button>
              <button 
                type="button" onClick={handleConcluir}
                className="px-3 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-lg font-semibold shadow-sm"
              >
                Concluir e registrar
              </button>
            </div>
          </div>
        )}

        {/* Falta inline */}
        {acao === 'falta' && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-xl space-y-3 mb-4">
            <p className="text-xs text-red-700">
              Confirmar falta? Isso ficará registrado no histórico de visitas da cliente.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" onClick={() => setAcao(null)}
                className="px-3 py-1.5 text-red-700 hover:bg-red-100 rounded-lg font-semibold"
              >
                Voltar
              </button>
              <button 
                type="button" onClick={handleFalta}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm"
              >
                Registrar falta
              </button>
            </div>
          </div>
        )}

        {/* Action Row at the very bottom (Only visible when no action is active) */}
        {!acao && agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && agendamento.status !== 'falta' && (
          <div className="flex flex-wrap gap-2 border-t border-[#EFECE6] pt-4 justify-end">
            
            {/* Confirmar (Purple) */}
            {agendamento.status === 'pendente' && (
              <button
                onClick={handleConfirmar}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <CalendarCheck size={14} />
                <span>Confirmar</span>
              </button>
            )}

            {/* Concluir (Pink) */}
            <button
              onClick={() => setAcao('concluir')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F6ECE8] hover:bg-[#ebdace] text-[#8C6D58] rounded-xl text-xs font-bold transition-all border border-[#F3ECE0]"
            >
              <CheckCircle size={14} />
              <span>Concluir</span>
            </button>

            {/* Marcar Falta */}
            <button
              onClick={() => setAcao('falta')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-red-50 border border-[#EFECE6] hover:border-red-200 text-[#8C7A6B] hover:text-red-700 rounded-xl text-xs font-semibold transition-all"
            >
              <UserX size={14} />
              <span>Marcar falta</span>
            </button>

            {/* Cancelar */}
            <button
              onClick={() => setAcao('cancelar')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-red-50 border border-[#EFECE6] hover:border-red-200 text-[#8C7A6B] hover:text-red-700 rounded-xl text-xs font-semibold transition-all"
            >
              <XCircle size={14} />
              <span>Cancelar</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
