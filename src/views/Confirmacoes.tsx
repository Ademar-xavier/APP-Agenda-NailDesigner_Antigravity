import React, { useState } from 'react';
import { 
  BellRing, 
  UserCheck, 
  Users, 
  XCircle, 
  MessageCircle, 
  Send,
  CalendarDays,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AgendamentoDetalheModal } from '../components/AgendamentoDetalheModal';
import { Agendamento } from '../types';

type AbaConfirmacao = 'a_confirmar' | 'confirmados' | 'lista_espera' | 'cancelados';

export const Confirmacoes: React.FC = () => {
  const { 
    agendamentos, 
    clientes, 
    servicos, 
    listaEspera,
    configSalao,
    obterServicosDeAgendamento,
    updateListaEsperaStatus
  } = useAppState();

  const [activeTab, setActiveTab] = useState<AbaConfirmacao>('a_confirmar');
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null);

  const agora = new Date();

  // Filtrar agendamentos futuros
  const aConfirmar = agendamentos
    .filter(a => a.status === 'pendente' && new Date(a.inicio) > agora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const confirmados = agendamentos
    .filter(a => a.status === 'confirmado' && new Date(a.inicio) > agora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const cancelados = agendamentos
    .filter(a => a.status === 'cancelado')
    .sort((a, b) => b.inicio.localeCompare(a.inicio));

  const listaEsperaAtiva = listaEspera
    .filter(w => w.status === 'aguardando')
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarDataHora = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('pt-BR')} às ${isoStr.split('T')[1].substring(0, 5)}`;
  };

  // WhatsApp helpers
  const handleEnviarMensagemWhatsApp = (a: Agendamento, tipo: 'confirmacao' | 'lembrete') => {
    const client = clientes.find(c => c.id === a.cliente_id);
    if (!client) return;

    const fone = client.telefone.replace(/\D/g, '');
    const horaStr = a.inicio.split('T')[1].substring(0, 5);
    const servs = obterServicosDeAgendamento(a.id);
    const servText = servs.map(s => s.nome).join(' + ');
    
    let msg = '';
    if (tipo === 'confirmacao') {
      msg = configSalao.templates_whatsapp.confirmacao
        .replace('{cliente}', client.nome)
        .replace('{servico}', servText)
        .replace('{profissional}', 'Sheila')
        .replace('{data}', new Date(a.inicio).toLocaleDateString('pt-BR'))
        .replace('{hora}', horaStr)
        .replace('{sinal}', String(a.valor_sinal))
        .replace('{chave_pix}', configSalao.chave_pix)
        .replace('{link_reserva}', `https://agenda-sheila.com.br/reserva`);
    } else {
      msg = configSalao.templates_whatsapp.lembrete
        .replace('{cliente}', client.nome)
        .replace('{data}', new Date(a.inicio).toLocaleDateString('pt-BR'))
        .replace('{hora}', horaStr)
        .replace('{servico}', servText)
        .replace('{limite_horas}', String(configSalao.regras.cancelamento_limite_horas));
    }

    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleNotificarListaEspera = (item: any) => {
    const client = clientes.find(c => c.id === item.cliente_id);
    const serv = servicos.find(s => s.id === item.servico_id);
    if (!client || !serv) return;

    const fone = client.telefone.replace(/\D/g, '');
    const msg = configSalao.templates_whatsapp.lista_espera
      .replace('{cliente}', client.nome)
      .replace('{servico}', serv.nome)
      .replace('{data}', item.data_preferida)
      .replace('{periodo}', item.periodo_preferido);

    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    
    // Atualizar para atendido / notificado
    updateListaEsperaStatus(item.id, 'atendido');
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="border-b border-[#EFECE6] pb-4 mb-4">
        <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Confirmações e lista de espera</h2>
        <p className="text-xs text-[#8C7A6B]">Gerencie confirmações de agendamentos e contatos da lista de espera</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EFECE6] mb-5 overflow-x-auto gap-2">
        {[
          { id: 'a_confirmar', label: 'A confirmar', count: aConfirmar.length, icon: BellRing },
          { id: 'confirmados', label: 'Confirmados', count: confirmados.length, icon: UserCheck },
          { id: 'lista_espera', label: 'Lista de espera', count: listaEsperaAtiva.length, icon: Users },
          { id: 'cancelados', label: 'Cancelados', count: cancelados.length, icon: XCircle }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AbaConfirmacao)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                active 
                  ? 'border-[#8C6D58] text-[#8C6D58]' 
                  : 'border-transparent text-[#8C7A6B] hover:text-[#5A4535]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  active ? 'bg-[#8C6D58] text-white' : 'bg-[#EFECE6] text-[#8C7A6B]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-6">
        
        {/* ABA: A CONFIRMAR */}
        {activeTab === 'a_confirmar' && (
          <>
            {aConfirmar.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <BellRing size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nada pendente no momento</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Todos os agendamentos futuros estão confirmados.</p>
              </div>
            ) : (
              aConfirmar.map((a) => {
                const client = clientes.find(c => c.id === a.cliente_id);
                const initials = client?.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                
                return (
                  <div 
                    key={a.id} 
                    className="p-4 bg-white border border-[#EFECE6] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#8C6D58] transition-colors"
                  >
                    <button 
                      onClick={() => setSelectedAgendamentoId(a.id)}
                      className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FFF9E6] text-[#B78103] flex items-center justify-center font-bold text-xs">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#5A4535]">{client?.nome}</h4>
                        <p className="text-xs text-[#8C7A6B] mt-0.5">{formatarDataHora(a.inicio)}</p>
                      </div>
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEnviarMensagemWhatsApp(a, 'confirmacao')}
                        className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-semibold transition-colors"
                      >
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <span>Enviar lembrete</span>
                      </button>
                      <button
                        onClick={() => setSelectedAgendamentoId(a.id)}
                        className="px-3.5 py-2 bg-[#F6ECE8] hover:bg-[#ebdace] text-[#8C6D58] rounded-xl text-xs font-bold transition-all border border-[#F3ECE0]"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ABA: CONFIRMADOS */}
        {activeTab === 'confirmados' && (
          <>
            {confirmados.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <UserCheck size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nenhum agendamento confirmado</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Agendamentos confirmados aparecerão aqui.</p>
              </div>
            ) : (
              confirmados.map((a) => {
                const client = clientes.find(c => c.id === a.cliente_id);
                const initials = client?.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                
                return (
                  <div 
                    key={a.id} 
                    className="p-4 bg-white border border-[#EFECE6] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#8C6D58] transition-colors"
                  >
                    <button 
                      onClick={() => setSelectedAgendamentoId(a.id)}
                      className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#EBF7EE] text-[#2B7A4B] flex items-center justify-center font-bold text-xs">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#5A4535]">{client?.nome}</h4>
                        <p className="text-xs text-[#8C7A6B] mt-0.5">{formatarDataHora(a.inicio)}</p>
                      </div>
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEnviarMensagemWhatsApp(a, 'lembrete')}
                        className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-semibold transition-colors"
                      >
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <span>Lembrete</span>
                      </button>
                      <button
                        onClick={() => setSelectedAgendamentoId(a.id)}
                        className="px-3.5 py-2 bg-[#F6ECE8] hover:bg-[#ebdace] text-[#8C6D58] rounded-xl text-xs font-bold transition-all border border-[#F3ECE0]"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ABA: LISTA DE ESPERA */}
        {activeTab === 'lista_espera' && (
          <>
            {listaEsperaAtiva.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <Users size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Lista de espera vazia</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Clientes aguardando vagas aparecerão aqui.</p>
              </div>
            ) : (
              listaEsperaAtiva.map((w) => {
                const client = clientes.find(c => c.id === w.cliente_id);
                const serv = servicos.find(s => s.id === w.servico_id);
                const initials = client?.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                
                return (
                  <div 
                    key={w.id} 
                    className="p-4 bg-white border border-[#EFECE6] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#8C6D58] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FAF6F0] text-[#8C6D58] flex items-center justify-center font-bold text-xs border border-[#EFECE6]">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#5A4535]">{client?.nome}</h4>
                        <p className="text-xs text-[#8C7A6B] mt-0.5">
                          {serv?.nome} · Preferência: {w.data_preferida} ({w.periodo_preferido})
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <span className="bg-[#FFF9E6] text-[#B78103] border border-[#FFECB3] text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase">
                        Aguardando
                      </span>
                      <button
                        onClick={() => handleNotificarListaEspera(w)}
                        className="flex items-center gap-1 px-3 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <Send size={12} />
                        <span>Notificar vaga</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ABA: CANCELADOS */}
        {activeTab === 'cancelados' && (
          <>
            {cancelados.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <XCircle size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nenhum cancelamento registrado</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Histórico de cancelamentos aparecerá aqui.</p>
              </div>
            ) : (
              cancelados.map((a) => {
                const client = clientes.find(c => c.id === a.cliente_id);
                const initials = client?.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                
                return (
                  <div 
                    key={a.id} 
                    className="p-4 bg-white border border-[#EFECE6] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-red-200 transition-colors bg-opacity-75"
                  >
                    <button 
                      onClick={() => setSelectedAgendamentoId(a.id)}
                      className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs border border-red-100">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#5A4535]">{client?.nome}</h4>
                        <p className="text-xs text-[#8C7A6B] mt-0.5">
                          {formatarDataHora(a.inicio)} · <span className="font-semibold text-red-600">Motivo: {a.motivo_cancelamento || 'Não informado'}</span>
                        </p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setSelectedAgendamentoId(a.id)}
                      className="px-3.5 py-2 bg-[#F6ECE8] hover:bg-[#ebdace] text-[#8C6D58] rounded-xl text-xs font-bold transition-all border border-[#F3ECE0]"
                    >
                      Ver detalhes
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}

      </div>

      {/* Unified AgendamentoDetalheModal */}
      {selectedAgendamentoId && (
        <AgendamentoDetalheModal 
          agendamentoId={selectedAgendamentoId} 
          onClose={() => setSelectedAgendamentoId(null)} 
        />
      )}
    </div>
  );
};
