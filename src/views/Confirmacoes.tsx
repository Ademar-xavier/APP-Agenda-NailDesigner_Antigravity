import React, { useState, useEffect, useMemo } from 'react';
import { 
  BellRing, 
  UserCheck, 
  Users, 
  XCircle,
  MessageCircle,
  Send,
  Calendar as CalendarIcon,
  Clock,
  X,
  AlertTriangle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Agendamento, ListaEspera, Cliente, Servico } from '../types';
import { AgendamentoDetalheModal } from '../components/AgendamentoDetalheModal';

type AbaConfirmacao = 'a_confirmar' | 'confirmados' | 'manutencao' | 'lista_espera' | 'cancelados';

export const Confirmacoes: React.FC = () => {
  const { 
    agendamentos, 
    clientes, 
    servicos, 
    listaEspera,
    updateListaEsperaStatus, 
    deleteAgendamento,
    configSalao, 
    obterServicosDeAgendamento,
    addAgendamento,
    equipe,
    currentUser,
    obterRecomendacoesManutencao
  } = useAppState();

  const [activeTab, setActiveTab] = useState<AbaConfirmacao>('a_confirmar');
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null);

  // Lote disparo states
  const [loteItens, setLoteItens] = useState<{
    id: string;
    agendamento: Agendamento;
    tipo: 'confirmacao' | 'lembrete';
    clienteNome: string;
    clienteTelefone: string;
    mensagem: string;
  }[]>([]);
  const [loteModalOpen, setLoteModalOpen] = useState(false);
  const [loteIndex, setLoteIndex] = useState(0);

  // Função auxiliar para identificar se o agendamento é hoje, amanhã ou em outra data
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

  const handleIniciarDisparosLote = () => {
    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() + 7);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0] + 'T23:59:59';
    
    const filtrados = agendamentos.filter(a => {
      if (currentUser?.perfil === 'profissional' && a.profissional_id !== currentUser.id) return false;
      return a.inicio >= hoje && a.inicio <= dataLimiteStr && (a.status === 'pendente' || a.status === 'confirmado');
    });

    const itens = filtrados.map(a => {
      const client = clientes.find(c => c.id === a.cliente_id);
      const tipo = a.status === 'pendente' ? 'confirmacao' : 'lembrete';
      const clientName = client?.nome || 'Cliente';
      const clientPhone = client?.telefone || '';
      
      const horaStr = a.inicio.split('T')[1].substring(0, 5);
      const servs = obterServicosDeAgendamento(a.id);
      const servText = servs.map(s => s.nome).join(' + ');
      const diaRelativo = formatarDiaRelativo(a.inicio);

      let msg = '';
      if (tipo === 'confirmacao') {
        msg = configSalao.templates_whatsapp.confirmacao
          .replace('{cliente}', clientName)
          .replace('{servico}', servText)
          .replace('{profissional}', 'Sheila')
          .replace('{data}', new Date(a.inicio).toLocaleDateString('pt-BR'))
          .replace('{hora}', horaStr)
          .replace('{sinal}', String(a.valor_sinal))
          .replace('{chave_pix}', configSalao.chave_pix)
          .replace('{link_reserva}', `https://agenda-sheila.com.br/reserva`);
      } else {
        msg = configSalao.templates_whatsapp.lembrete
          .replace(/amanhã\s*\(\{data\}\)/gi, `${diaRelativo} ({data})`)
          .replace(/\bamanhã\b/gi, diaRelativo)
          .replace('{dia_relativo}', diaRelativo)
          .replace('{cliente}', clientName)
          .replace('{data}', new Date(a.inicio).toLocaleDateString('pt-BR'))
          .replace('{hora}', horaStr)
          .replace('{servico}', servText)
          .replace('{limite_horas}', String(configSalao.regras.cancelamento_limite_horas));
      }

      return {
        id: a.id,
        agendamento: a,
        tipo: tipo as 'confirmacao' | 'lembrete',
        clienteNome: clientName,
        clienteTelefone: clientPhone,
        mensagem: msg
      };
    });

    if (itens.length === 0) {
      alert('Nenhum agendamento pendente de confirmação ou lembrete para os próximos 7 dias.');
      return;
    }

    setLoteItens(itens);
    setLoteIndex(0);
    setLoteModalOpen(true);
  };

  const handleEnviarLoteItem = (idx: number) => {
    const item = loteItens[idx];
    if (!item) return;

    const fone = item.clienteTelefone.replace(/\D/g, '');
    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(item.mensagem)}`;
    window.open(url, '_blank');

    if (idx < loteItens.length - 1) {
      setLoteIndex(idx + 1);
    } else {
      alert('Todos os disparos em lote da semana foram concluídos!');
      setLoteModalOpen(false);
    }
  };

  const handleUpdateMensagemItem = (idx: number, novaMsg: string) => {
    setLoteItens(prev => prev.map((item, i) => i === idx ? { ...item, mensagem: novaMsg } : item));
  };

  // States para confirmar vaga da Lista de Espera
  const [confirmarVagaItem, setConfirmarVagaItem] = useState<ListaEspera | null>(null);
  const [vagaData, setVagaData] = useState('');
  const [vagaHora, setVagaHora] = useState('09:00');
  const [vagaProfissionalId, setVagaProfissionalId] = useState('u1');
  const [errorVaga, setErrorVaga] = useState('');

  // Sincronizar data e profissional padrão ao abrir a vaga
  const handleOpenConfirmarVaga = (item: ListaEspera) => {
    setConfirmarVagaItem(item);
    setVagaData(item.data_preferida);
    setVagaHora('09:00');
    setVagaProfissionalId(currentUser?.id || 'u1');
    setErrorVaga('');
  };

  const handleConfirmarVagaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmarVagaItem) return;

    const client = clientes.find(c => c.id === confirmarVagaItem.cliente_id);
    const serv = servicos.find(s => s.id === confirmarVagaItem.servico_id);
    if (!client || !serv) return;

    // Calcular valores do agendamento
    const total = serv.preco;
    let sinal = 0;
    if (serv.sinal_tipo === 'fixo') sinal = serv.sinal_valor;
    else if (serv.sinal_tipo === 'porcentagem') sinal = (serv.preco * serv.sinal_valor) / 100;

    const dataInicioStr = `${vagaData}T${vagaHora}:00`;

    // Criar agendamento
    const res = addAgendamento({
      cliente_id: client.id,
      profissional_id: vagaProfissionalId,
      inicio: dataInicioStr,
      status: 'confirmado', // Confirma o horário direto
      valor_total: total,
      valor_sinal: sinal,
      observacoes: `Convertido da lista de espera. Período preferido: ${confirmarVagaItem.periodo_preferido}`,
      origem: 'admin'
    }, [serv.id]);

    if (res.success) {
      // 1. Atualizar status na lista de espera para atendido
      updateListaEsperaStatus(confirmarVagaItem.id, 'atendido');

      // 2. Abrir WhatsApp notificando a cliente do horário agendado!
      const fone = client.telefone.replace(/\D/g, '');
      const prof = equipe.find(u => u.id === vagaProfissionalId);
      
      const msg = `Olá, ${client.nome}! O horário que você aguardava ficou disponível! Agendamos você para o dia ${new Date(dataInicioStr).toLocaleDateString('pt-BR')} às ${vagaHora} com a profissional ${prof?.nome || 'Sheila'} para realizar o serviço ${serv.nome}. Confirmado? Te esperamos!`;
      
      const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');

      // 3. Fechar modal
      setConfirmarVagaItem(null);
    } else {
      setErrorVaga(res.error || 'Erro ao agendar horário');
    }
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarDataHora = (dateStr: string) => {
    if (!dateStr) return '';
    const partes = dateStr.split('T');
    const dataParte = partes[0] ? partes[0].split('-').reverse().join('/') : '';
    const horaParte = partes[1] ? partes[1].substring(0, 5) : '';
    return `${dataParte} às ${horaParte}`;
  };

  const formatarDataBrasileira = (dataStr: string) => {
    if (!dataStr) return '';
    if (dataStr.includes('-')) {
      const partes = dataStr.split('T')[0].split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }
    const d = new Date(dataStr);
    return isNaN(d.getTime()) ? dataStr : d.toLocaleDateString('pt-BR');
  };

  // Keyboard Escape listener to close details and modals in Confirmacoes.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmarVagaItem) {
          setConfirmarVagaItem(null);
        } else if (loteModalOpen) {
          setLoteModalOpen(false);
        } else if (selectedAgendamentoId) {
          setSelectedAgendamentoId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmarVagaItem, loteModalOpen, selectedAgendamentoId]);

  // Filtragem de dados com base nas abas
  const hoje = new Date().toLocaleDateString('en-CA');
  
  // A confirmar: pendentes e futuros (ordenados por data e hora do menor para o maior)
  const aConfirmar = agendamentos
    .filter(a => {
      if (currentUser?.perfil === 'profissional' && a.profissional_id !== currentUser.id) return false;
      return a.status === 'pendente' && a.inicio >= hoje;
    })
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  // Confirmados: futuros confirmados (ordenados por data e hora do menor para o maior)
  const confirmados = agendamentos
    .filter(a => {
      if (currentUser?.perfil === 'profissional' && a.profissional_id !== currentUser.id) return false;
      return a.status === 'confirmado' && a.inicio >= hoje;
    })
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  // Lista de espera: ativa (aguardando) (ordenada por data preferida e hora do menor para o maior)
  const listaEsperaAtiva = listaEspera
    .filter(w => w.status === 'aguardando')
    .sort((a, b) => {
      const cmp = a.data_preferida.localeCompare(b.data_preferida);
      if (cmp !== 0) return cmp;
      return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
    });

  // Cancelados: histórico de cancelamentos (ordenados por data e hora do menor para o maior)
  const cancelados = agendamentos
    .filter(a => {
      if (currentUser?.perfil === 'profissional' && a.profissional_id !== currentUser.id) return false;
      return a.status === 'cancelado';
    })
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  // Lista de retornos dispensados localmente
  const [dispensadosManutencao, setDispensadosManutencao] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nail_dispensados_manutencao');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Manutenções a Confirmar (ordenadas por data sugerida do menor para o maior)
  const manutencoesAConfirmar = useMemo(() => {
    const recs = obterRecomendacoesManutencao();
    return recs
      .filter(r => !dispensadosManutencao.includes(`${r.cliente.id}_${r.servico.id}`))
      .sort((a, b) => a.dataSugerida.localeCompare(b.dataSugerida));
  }, [obterRecomendacoesManutencao, dispensadosManutencao]);

  const [confirmarManutencaoItem, setConfirmarManutencaoItem] = useState<{
    cliente: Cliente;
    servico: Servico;
    dataSugerida: string;
    diasAtraso: number;
  } | null>(null);

  const [manutData, setManutData] = useState<string>('');
  const [manutHora, setManutHora] = useState<string>('14:00');
  const [manutProfissionalId, setManutProfissionalId] = useState<string>('u1');
  const [errorManut, setErrorManut] = useState<string>('');

  const handleDispensarManutencao = (key: string) => {
    const next = [...dispensadosManutencao, key];
    setDispensadosManutencao(next);
    try {
      localStorage.setItem('nail_dispensados_manutencao', JSON.stringify(next));
    } catch (e) {}
  };

  const handleOpenConfirmarManutencao = (rec: { cliente: Cliente; servico: Servico; dataSugerida: string; diasAtraso: number }) => {
    setConfirmarManutencaoItem(rec);
    setManutData(rec.dataSugerida || new Date().toLocaleDateString('en-CA'));
    setManutHora('14:00');
    setManutProfissionalId(equipe[0]?.id || 'u1');
    setErrorManut('');
  };

  const handleConfirmarManutencaoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmarManutencaoItem) return;

    const dataInicioStr = `${manutData}T${manutHora}:00`;
    const res = addAgendamento({
      cliente_id: confirmarManutencaoItem.cliente.id,
      profissional_id: manutProfissionalId,
      inicio: dataInicioStr,
      status: 'confirmado',
      valor_total: confirmarManutencaoItem.servico.preco,
      valor_sinal: 0,
      observacoes: `Retorno de Manutenção agendado via Confirmações: ${confirmarManutencaoItem.servico.nome}`,
      origem: 'admin'
    }, [confirmarManutencaoItem.servico.id]);

    if (res.success) {
      handleDispensarManutencao(`${confirmarManutencaoItem.cliente.id}_${confirmarManutencaoItem.servico.id}`);
      setConfirmarManutencaoItem(null);
      setActiveTab('confirmados');
    } else {
      setErrorManut(res.error || 'Erro ao agendar retorno.');
    }
  };

  const handleEnviarWhatsAppManutencao = (rec: { cliente: Cliente; servico: Servico; dataSugerida: string; diasAtraso: number }) => {
    const fone = rec.cliente.telefone?.replace(/\D/g, '');
    if (!fone) return;

    const linkAgendamento = `${window.location.origin}${window.location.pathname}?booking=true`;
    const dataFormatada = formatarDataBrasileira(rec.dataSugerida);
    const diasTexto = rec.diasAtraso > 0 ? `${rec.servico.intervalo_manutencao_dias + rec.diasAtraso}` : `${rec.servico.intervalo_manutencao_dias}`;

    let msg = configSalao.templates_whatsapp.retorno_manutencao
      .replace('{cliente}', rec.cliente.nome)
      .replace('{servico}', rec.servico.nome)
      .replace('{dias_visita}', diasTexto)
      .replace('{link_agendamento}', linkAgendamento);

    if (!msg.includes(dataFormatada)) {
      msg += `\n📅 Sugestão de data para seu retorno: ${dataFormatada}`;
    }

    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // WhatsApp manual para confirmação rápida
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
      const diaRelativo = formatarDiaRelativo(a.inicio);
      msg = configSalao.templates_whatsapp.lembrete
        .replace(/amanhã\s*\(\{data\}\)/gi, `${diaRelativo} ({data})`)
        .replace(/\bamanhã\b/gi, diaRelativo)
        .replace('{dia_relativo}', diaRelativo)
        .replace('{cliente}', client.nome)
        .replace('{data}', new Date(a.inicio).toLocaleDateString('pt-BR'))
        .replace('{hora}', horaStr)
        .replace('{servico}', servText)
        .replace('{limite_horas}', String(configSalao.regras.cancelamento_limite_horas));
    }

    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleRemoverListaEspera = (w: ListaEspera) => {
    const client = clientes.find(c => c.id === w.cliente_id);
    
    if (!client) {
      if (confirm('Esta solicitação de lista de espera não possui um cliente associado no sistema (provavelmente foi excluído). Deseja remover este item da lista de espera mesmo assim?')) {
        updateListaEsperaStatus(w.id, 'cancelado');
      }
      return;
    }

    if (confirm(`Deseja realmente remover ${client.nome} da lista de espera e enviar o aviso de impossibilidade de encaixe por WhatsApp?`)) {
      updateListaEsperaStatus(w.id, 'cancelado');
      
      const fone = client.telefone.replace(/\D/g, '');
      const dataFormatada = w.data_preferida.split('-').reverse().join('/');
      const periodoLabel = w.periodo_preferido === 'manha' ? 'Manhã' : 
                           w.periodo_preferido === 'tarde' ? 'Tarde' : 
                           w.periodo_preferido === 'noite' ? 'Noite' : 'Qualquer Período';
      
      const msg = `Olá, ${client.nome}! Infelizmente não conseguimos uma vaga para encaixe no dia ${dataFormatada} (${periodoLabel}) como solicitado. Havendo novas oportunidades e desistências futuras, entraremos em contato. Agradecemos muito a sua compreensão! 💕`;
      
      window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // Horários disponíveis para seleção na lista de espera (das 08:00 às 20:00)
  const horasExpediente = Array.from({ length: 25 }, (_, i) => {
    const hora = 8 + Math.floor(i / 2);
    const min = (i % 2) * 30;
    return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  });

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Confirmações e lista de espera</h2>
          <p className="text-xs text-[#8C7A6B]">Gerencie confirmações de agendamentos e contatos da lista de espera</p>
        </div>
        <button
          onClick={handleIniciarDisparosLote}
          className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
        >
          <Send size={16} />
          <span>Disparo em Lote da Semana</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EFECE6] mb-5 overflow-x-auto gap-2">
        {[
          { id: 'a_confirmar', label: 'A confirmar', count: aConfirmar.length, icon: BellRing },
          { id: 'confirmados', label: 'Confirmados', count: confirmados.length, icon: UserCheck },
          { id: 'manutencao', label: 'Manutenção a confirmar', count: manutencoesAConfirmar.length, icon: RotateCcw },
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

        {/* ABA: MANUTENÇÃO A CONFIRMAR */}
        {activeTab === 'manutencao' && (
          <>
            {manutencoesAConfirmar.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <RotateCcw size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nenhuma manutenção pendente</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Clientes com sugestão de retorno aparecerão aqui.</p>
              </div>
            ) : (
              manutencoesAConfirmar.map((rec) => {
                const key = `${rec.cliente.id}_${rec.servico.id}`;
                const initials = rec.cliente.nome.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                
                return (
                  <div 
                    key={key} 
                    className="p-4 bg-white border border-[#EFECE6] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#8C6D58] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FFF0F4] text-[#DB7093] flex items-center justify-center font-bold text-xs border border-[#FAD0DC]">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#5A4535]">{rec.cliente.nome}</h4>
                        <p className="text-xs text-[#8C7A6B] mt-0.5">
                          {rec.servico.nome} · Previsão de Retorno: <strong>{formatarDataBrasileira(rec.dataSugerida)}</strong>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                        rec.diasAtraso === 0 
                          ? 'bg-[#FFF9E6] text-[#B78103] border border-[#FFECB3]' 
                          : 'bg-[#FDF2F2] text-[#D32F2F] border border-[#FFCDD2]'
                      }`}>
                        {rec.diasAtraso === 0 ? 'Vence hoje' : `Atrasada há ${rec.diasAtraso}d`}
                      </span>

                      <button
                        onClick={() => handleEnviarWhatsAppManutencao(rec)}
                        className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-semibold transition-colors"
                        title="Enviar convite de retorno no WhatsApp"
                      >
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <span>Avisar</span>
                      </button>

                      <button
                        onClick={() => handleOpenConfirmarManutencao(rec)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <CalendarIcon size={12} />
                        <span>Agendar retorno</span>
                      </button>

                      <button
                        onClick={() => handleDispensarManutencao(key)}
                        className="p-2 text-[#8C7A6B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                        title="Dispensar / Cancelar este aviso de retorno"
                      >
                        <Trash2 size={14} />
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
                          {serv?.nome} · Preferência: {formatarDataBrasileira(w.data_preferida)} ({w.periodo_preferido})
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FFF9E6] text-[#B78103] border border-[#FFECB3] text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase mr-1.5">
                        Aguardando
                      </span>
                      <button
                        onClick={() => handleOpenConfirmarVaga(w)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <Send size={12} />
                        <span>Definir horário e agendar</span>
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
                <h4 className="font-semibold text-sm">Nenhum cancelamento</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Histórico de cancelamentos aparecerá aqui.</p>
              </div>
            ) : (
              cancelados.map((a) => {
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
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAgendamentoId(a.id)}
                        className="px-3.5 py-2 bg-[#F6ECE8] hover:bg-[#ebdace] text-[#8C6D58] rounded-xl text-xs font-bold transition-all border border-[#F3ECE0]"
                      >
                        Ver detalhes
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza de que deseja excluir permanentemente este registro de cancelamento?')) {
                            deleteAgendamento(a.id);
                          }
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl transition-colors"
                        title="Excluir histórico de cancelamento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

      </div>

      {/* --- MODAL DEFINIR HORÁRIO DA VAGA (LISTA DE ESPERA) --- */}
      {confirmarVagaItem && (() => {
        const client = clientes.find(c => c.id === confirmarVagaItem.cliente_id);
        const serv = servicos.find(s => s.id === confirmarVagaItem.servico_id);
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setConfirmarVagaItem(null)}
          >
            <div 
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#5A4535]">Definir Horário da Vaga</h3>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">Converta a lista de espera em agendamento</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setConfirmarVagaItem(null)}
                  className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmarVagaSubmit} className="space-y-4">
                {errorVaga && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{errorVaga}</span>
                  </div>
                )}

                <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6] text-xs space-y-1">
                  <p className="text-[#8C7A6B]">Cliente: <strong className="text-[#5A4535]">{client ? `${client.nome} (${client.telefone})` : 'Cliente não cadastrado'}</strong></p>
                  <p className="text-[#8C7A6B]">Serviço: <strong className="text-[#5A4535]">{serv?.nome} ({formatarMoeda(serv?.preco || 0)})</strong></p>
                  <p className="text-[#8C7A6B]">Data de preferência: <strong className="text-[#5A4535]">{formatarDataBrasileira(confirmarVagaItem.data_preferida)} ({confirmarVagaItem.periodo_preferido})</strong></p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Escolher Data</label>
                  <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6]">
                    <CalendarIcon size={14} className="text-[#8C6D58]" />
                    <input 
                      type="date" required
                      value={vagaData}
                      onChange={(e) => setVagaData(e.target.value)}
                      className="text-xs font-bold text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Horário</label>
                    <select
                      value={vagaHora}
                      onChange={(e) => setVagaHora(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl p-2.5 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                    >
                      {horasExpediente.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Profissional</label>
                    <select
                      value={vagaProfissionalId}
                      onChange={(e) => setVagaProfissionalId(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl p-2.5 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                    >
                      {equipe.filter(u => u.ativo).map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-between pt-4 border-t border-[#EFECE6] w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmarVagaItem(null);
                      handleRemoverListaEspera(confirmarVagaItem);
                    }}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancelar Solicitação
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmarVagaItem(null)}
                      className="px-3 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                    >
                      Confirmar e Agendar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL CONFIRMAR HORÁRIO DE RETORNO / MANUTENÇÃO --- */}
      {confirmarManutencaoItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setConfirmarManutencaoItem(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Agendar Retorno de Manutenção</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Defina data e horário para confirmar o atendimento</p>
              </div>
              <button 
                type="button"
                onClick={() => setConfirmarManutencaoItem(null)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmarManutencaoSubmit} className="space-y-4">
              {errorManut && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{errorManut}</span>
                </div>
              )}

              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6] text-xs space-y-1">
                <p className="text-[#8C7A6B]">Cliente: <strong className="text-[#5A4535]">{confirmarManutencaoItem.cliente.nome} ({confirmarManutencaoItem.cliente.telefone})</strong></p>
                <p className="text-[#8C7A6B]">Serviço: <strong className="text-[#5A4535]">{confirmarManutencaoItem.servico.nome} ({formatarMoeda(confirmarManutencaoItem.servico.preco)})</strong></p>
                <p className="text-[#8C7A6B]">Previsão de Retorno: <strong className="text-[#5A4535]">{formatarDataBrasileira(confirmarManutencaoItem.dataSugerida)}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Data do Atendimento</label>
                <div className="flex items-center gap-2 p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6]">
                  <CalendarIcon size={14} className="text-[#8C6D58]" />
                  <input 
                    type="date" required
                    value={manutData}
                    onChange={(e) => setManutData(e.target.value)}
                    className="text-xs font-bold text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Horário</label>
                  <select
                    value={manutHora}
                    onChange={(e) => setManutHora(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl p-2.5 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                  >
                    {horasExpediente.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Profissional</label>
                  <select
                    value={manutProfissionalId}
                    onChange={(e) => setManutProfissionalId(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl p-2.5 text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none"
                  >
                    {equipe.filter(u => u.ativo).map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-between pt-4 border-t border-[#EFECE6] w-full">
                <button
                  type="button"
                  onClick={() => {
                    const key = `${confirmarManutencaoItem.cliente.id}_${confirmarManutencaoItem.servico.id}`;
                    handleDispensarManutencao(key);
                    setConfirmarManutencaoItem(null);
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-xl transition-all"
                >
                  Dispensar Retorno
                </button>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmarManutencaoItem(null)}
                    className="px-3 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    Confirmar e Agendar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL WIZARD DISPARO EM LOTE --- */}
      {loteModalOpen && loteItens.length > 0 && (() => {
        const item = loteItens[loteIndex];
        const dateFormatted = new Date(item.agendamento.inicio).toLocaleDateString('pt-BR');
        const hourStr = item.agendamento.inicio.split('T')[1].substring(0, 5);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-[#EFECE6] p-6 pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#5A4535]">Envio Assistido em Lote</h3>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">Dispare lembretes e confirmações sequenciais da semana</p>
                </div>
                <button 
                  onClick={() => setLoteModalOpen(false)}
                  className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress & Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#8C7A6B]">
                    <span>Progresso dos Disparos</span>
                    <span>{loteIndex + 1} de {loteItens.length} ({Math.round(((loteIndex + 1) / loteItens.length) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-[#EFECE6] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#8C6D58] h-full transition-all duration-300"
                      style={{ width: `${((loteIndex + 1) / loteItens.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Card do Cliente Atual */}
                <div className="bg-[#FAF9F6] border border-[#EFECE6] p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={`inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md mb-1.5 ${
                        item.tipo === 'confirmacao' ? 'bg-[#FFF9E6] text-[#B78103] border border-[#FFECB3]' : 'bg-[#EBF7EE] text-[#2B7A4B] border border-[#C2EAD0]'
                      }`}>
                        {item.tipo === 'confirmacao' ? 'Confirmação de Horário' : 'Lembrete de Agendamento'}
                      </span>
                      <h4 className="font-bold text-sm text-[#5A4535]">{item.clienteNome}</h4>
                      <p className="text-xs text-[#8C7A6B] mt-0.5">WhatsApp: {item.clienteTelefone}</p>
                    </div>
                    <div className="text-right text-xs text-[#8C7A6B]">
                      <span className="font-bold text-[#5A4535] block">{dateFormatted}</span>
                      <span>às {hourStr}</span>
                    </div>
                  </div>
                </div>

                {/* Mensagem Preview / Editor */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase">Mensagem que será enviada</label>
                  <textarea
                    rows={6}
                    value={item.mensagem}
                    onChange={(e) => handleUpdateMensagemItem(loteIndex, e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl p-3 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6] resize-none"
                  />
                  <p className="text-[9px] text-[#8C7A6B]">Você pode editar o text acima antes de disparar para este cliente específico.</p>
                </div>

                {/* Lista Completa Horizontal / Badges para navegação rápida */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase">Lista da Semana</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {loteItens.map((li, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLoteIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all ${
                          idx === loteIndex
                            ? 'bg-[#8C6D58] border-[#8C6D58] text-white shadow-sm'
                            : 'bg-white border-[#EFECE6] text-[#8C7A6B] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        {idx + 1}. {li.clienteNome}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-between pt-4 border-t border-[#EFECE6] p-6 bg-white rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (loteIndex > 0) setLoteIndex(loteIndex - 1);
                  }}
                  disabled={loteIndex === 0}
                  className="px-4 py-2.5 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6] disabled:opacity-50"
                >
                  Anterior
                </button>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (loteIndex < loteItens.length - 1) {
                        setLoteIndex(loteIndex + 1);
                      } else {
                        setLoteModalOpen(false);
                      }
                    }}
                    className="px-4 py-2.5 border border-transparent text-[#8C7A6B] hover:text-[#5A4535] hover:bg-[#FAF9F6] text-xs font-bold rounded-xl"
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnviarLoteItem(loteIndex)}
                    className="px-5 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Enviar e Avançar</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

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
