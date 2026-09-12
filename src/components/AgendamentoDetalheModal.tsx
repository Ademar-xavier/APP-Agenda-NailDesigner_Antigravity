import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  ShoppingBag,
  Crown,
  Plus,
  Trash2,
  Repeat,
  Lock
} from 'lucide-react';
import { useAppState, calcularFimAgendamento } from '../context/AppStateContext';
import { MetodoPagamento, AgendamentoStatus, REGRA_DEVOLUCAO_PADRAO, ItemComandaProduto } from '../types';
import { obterConfigMetaWhatsApp, enviarMensagemBotaoMeta } from '../services/metaWhatsApp';
import { getConfirmationUrl, getBookingUrl, gerarLinkWhatsApp, preencherTemplateWhatsApp } from '../utils/urlHelper';
import { 
  encontrarPlanoVip, 
  calcularIntervaloVip, 
  obterTextoFrequenciaVip,
  obterProfissionaisDoServicoOuPacote,
  obterTodasProfissionaisDosServicos
} from '../utils/planoVipHelper';

interface AgendamentoDetalheModalProps {
  agendamentoId: string;
  onClose: () => void;
  onOpenComanda?: () => void;
}

type Acao = null | 'cancelar' | 'concluir' | 'falta' | 'remarcar';

const MOTIVO_CANCELAMENTO_PADRAO = 'Imprevisto operacional no salão / necessidade de reagendamento';
const SUGESTOES_MOTIVOS = [
  'Imprevisto operacional no salão / necessidade de reagendamento',
  'A pedido da própria cliente',
  'Problema de saúde / emergência pessoal',
  'Horário indisponível na agenda'
];

export const AgendamentoDetalheModal: React.FC<AgendamentoDetalheModalProps> = ({ 
  agendamentoId, 
  onClose,
  onOpenComanda
}) => {
  const { 
    agendamentos, 
    clientes, 
    pagamentos, 
    equipe, 
    servicos,
    configSalao,
    updateAgendamentoStatus,
    remarcarAgendamento,
    atualizarValorSinalAgendamento,
    atualizarServicosEProfissionalAgendamento,
    cancelAgendamento,
    deleteAgendamento,
    checkConflitoHorario,
    confirmarSinal,
    concluirAtendimento,
    obterServicosDeAgendamento,
    confirmarAcao,
    mostrarAlerta,
    produtos,
    planosAssinatura,
    reservarRecorrenciaSemanalVip
  } = useAppState();

  const [acao, setAcao] = useState<Acao>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState(MOTIVO_CANCELAMENTO_PADRAO);
  const [metodoPgto, setMetodoPgto] = useState<MetodoPagamento>('pix');
  const [valorRecebido, setValorRecebido] = useState(0);

  const agendamento = agendamentos.find(a => a.id === agendamentoId);
  const isBloqueio = agendamento?.cliente_id === 'bloqueado';
  const cliente = isBloqueio ? null : clientes.find(c => c.id === agendamento?.cliente_id);
  const prof = equipe.find(u => u.id === agendamento?.profissional_id);
  const servs = (agendamento && !isBloqueio) ? obterServicosDeAgendamento(agendamento.id) : [];

  // Agendamentos simultâneos vinculados (atendimento em dupla / 2 profissionais)
  const coAgendamentosVinculados = useMemo(() => {
    if (!agendamento) return [];
    return agendamentos.filter(a => {
      if (a.id === agendamento.id) return false;
      if (agendamento.recorrencia_grupo_id && a.recorrencia_grupo_id === agendamento.recorrencia_grupo_id && a.inicio === agendamento.inicio && a.cliente_id === agendamento.cliente_id) return true;
      if (a.observacoes?.includes(`[AG_PRINCIPAL:${agendamento.id}]`)) return true;
      if (agendamento.observacoes?.includes(`[AG_PRINCIPAL:${a.id}]`)) return true;
      if (a.observacoes?.includes(`[AG_PAR:${agendamento.id}]`)) return true;
      if (agendamento.observacoes?.includes(`[AG_PAR:${a.id}]`)) return true;
      return false;
    });
  }, [agendamento, agendamentos]);

  // Todas as profissionais envolvidas no atendimento (Sheila, Lurdinha, etc.)
  const nomesProfissionaisCompletos = useMemo(() => {
    if (!agendamento) return [];
    const profsMap = new Map<string, string>();
    if (prof) profsMap.set(prof.id, prof.nome);

    coAgendamentosVinculados.forEach(c => {
      const coProf = equipe.find(u => u.id === c.profissional_id);
      if (coProf) profsMap.set(coProf.id, coProf.nome);
    });

    servs.forEach(s => {
      const procs = obterProfissionaisDoServicoOuPacote(s.id, servicos, equipe, agendamento.profissional_id);
      procs.forEach(p => {
        const pr = equipe.find(u => u.id === p.profissional_id);
        if (pr) profsMap.set(pr.id, pr.nome);
      });
    });

    return Array.from(profsMap.values());
  }, [agendamento, prof, coAgendamentosVinculados, servs, servicos, equipe]);

  const isVip = !!(
    agendamento?.pago_com_clube ||
    agendamento?.plano_id ||
    agendamento?.observacoes?.includes('Clube VIP') ||
    agendamento?.observacoes?.includes('👑')
  );

  const duracaoMinutosAgendamento = useMemo(() => {
    if (!agendamento?.inicio || !agendamento?.fim) return 60;
    try {
      const getMins = (str: string) => {
        const limpo = str.replace('Z', '').split('+')[0];
        const [, horaPart] = limpo.split('T');
        if (!horaPart) return 0;
        const [h, m] = horaPart.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const diff = getMins(agendamento.fim) - getMins(agendamento.inicio);
      return diff > 0 ? diff : 60;
    } catch {
      return 60;
    }
  }, [agendamento?.inicio, agendamento?.fim]);

  const [statusVisual, setStatusVisual] = useState<AgendamentoStatus>(agendamento?.status || 'confirmado');

  // Estados de Remarcação de Horário / Dia
  const [dataRemarcacao, setDataRemarcacao] = useState<string>(
    agendamento?.inicio ? agendamento.inicio.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [horaRemarcacao, setHoraRemarcacao] = useState<string>(
    agendamento?.inicio ? agendamento.inicio.split('T')[1]?.substring(0, 5) || '09:00' : '09:00'
  );
  const [profRemarcacaoId, setProfRemarcacaoId] = useState<string>(agendamento?.profissional_id || '');
  const [notificarWhatsAppRemarcacao, setNotificarWhatsAppRemarcacao] = useState<boolean>(true);
  const [errorRemarcacao, setErrorRemarcacao] = useState<string>('');
  const [remarcarAjustarFuturos, setRemarcarAjustarFuturos] = useState<boolean>(false);

  useEffect(() => {
    if (agendamento) {
      setDataRemarcacao(agendamento.inicio.split('T')[0]);
      setHoraRemarcacao(agendamento.inicio.split('T')[1]?.substring(0, 5) || '09:00');
      setProfRemarcacaoId(agendamento.profissional_id);
      setRemarcarAjustarFuturos(false);
    }
  }, [agendamento]);

  // Análise de horários disponíveis para a data e profissional selecionados
  const analiseHorariosRemarcacao = useMemo(() => {
    if (!dataRemarcacao || !profRemarcacaoId) return { livres: [], ocupados: [], fechado: false };

    const diaSemana = new Date(dataRemarcacao + 'T12:00:00').getDay();
    const expediente = configSalao?.horarios_trabalho?.[diaSemana];

    if (!expediente || !expediente.ativo) {
      return { livres: [], ocupados: [], fechado: true };
    }

    const [hIni, mIni] = (expediente.inicio || '08:00').split(':').map(Number);
    const [hFim, mFim] = (expediente.fim || '20:00').split(':').map(Number);
    const minInicio = hIni * 60 + mIni;
    const minFim = hFim * 60 + mFim;

    const duracao = duracaoMinutosAgendamento > 0 ? duracaoMinutosAgendamento : 60;
    const livres: string[] = [];
    const ocupados: string[] = [];

    for (let m = minInicio; m <= minFim - duracao; m += 30) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const mStr = String(m % 60).padStart(2, '0');
      const slot = `${hStr}:${mStr}`;

      const inicioAgend = `${dataRemarcacao}T${slot}:00`;
      const fimAgend = calcularFimAgendamento(inicioAgend, duracao);

      const conflito = checkConflitoHorario(inicioAgend, fimAgend, profRemarcacaoId, agendamento?.id);

      if (!conflito) {
        livres.push(slot);
      } else {
        ocupados.push(slot);
      }
    }

    return { livres, ocupados, fechado: false };
  }, [dataRemarcacao, profRemarcacaoId, duracaoMinutosAgendamento, configSalao, checkConflitoHorario, agendamento?.id]);

  useEffect(() => {
    if (analiseHorariosRemarcacao.livres.length > 0 && !analiseHorariosRemarcacao.livres.includes(horaRemarcacao)) {
      setHoraRemarcacao(analiseHorariosRemarcacao.livres[0]);
    }
  }, [analiseHorariosRemarcacao.livres]);

  const handleConfirmarRemarcacao = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!agendamento) return;
    setErrorRemarcacao('');

    if (!dataRemarcacao) {
      setErrorRemarcacao('Por favor, selecione uma data.');
      return;
    }
    if (!horaRemarcacao) {
      setErrorRemarcacao('Por favor, selecione um horário disponível.');
      return;
    }

    const novoInicio = `${dataRemarcacao}T${horaRemarcacao}:00`;
    const novoFim = calcularFimAgendamento(novoInicio, duracaoMinutosAgendamento);

    const res = remarcarAgendamento(agendamento.id, novoInicio, novoFim, profRemarcacaoId, remarcarAjustarFuturos);
    if (!res.success) {
      setErrorRemarcacao(res.error || 'Erro ao remarcar agendamento.');
      return;
    }

    if (notificarWhatsAppRemarcacao && cliente?.telefone) {
      const [ano, mes, dia] = dataRemarcacao.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const diaNome = diasSemana[new Date(`${dataRemarcacao}T12:00:00`).getDay()];
      const profNome = equipe.find(u => u.id === profRemarcacaoId)?.nome || prof?.nome || 'Sheila';
      const nomesServicos = servs.map(s => s.nome).join(' + ') || 'Atendimento';

      const textoWhats = `Olá, ${cliente.nome}! 💅\nSeu agendamento foi remarcado com sucesso.\n\n📅 *Nova Data:* ${dataFormatada} (${diaNome})\n⏰ *Novo Horário:* ${horaRemarcacao}\n👩‍🎨 *Profissional:* ${profNome}\n✨ *Procedimento:* ${nomesServicos}\n\nQualquer dúvida ou imprevisto, é só nos avisar por aqui! 🥰`;
      const urlWhats = gerarLinkWhatsApp(cliente.telefone, textoWhats);
      if (urlWhats) {
        window.open(urlWhats, '_blank');
      }
    }

    setAcao(null);
    onClose();
  };

  // Estados de Edição de Procedimentos e Profissional
  const [editandoServicosEProf, setEditandoServicosEProf] = useState(false);
  const [servicosEditadosIds, setServicosEditadosIds] = useState<string[]>([]);
  const [profissionalEditadaId, setProfissionalEditadaId] = useState<string>(agendamento?.profissional_id || '');
  const [aplicarEmFuturos, setAplicarEmFuturos] = useState(true);

  // Identifica agendamentos futuros da mesma recorrência/clube VIP
  const agendamentosFuturosRecorrencia = useMemo(() => {
    if (!agendamento) return [];
    const isVip = !!(
      agendamento.pago_com_clube ||
      agendamento.plano_id ||
      agendamento.observacoes?.includes('Clube VIP') ||
      agendamento.observacoes?.includes('👑')
    );

    return agendamentos.filter(a => {
      if (a.id === agendamento.id) return false;
      if (a.status === 'cancelado' || a.status === 'concluido') return false;
      if (new Date(a.inicio) <= new Date(agendamento.inicio)) return false;

      // Grupo de recorrência manual
      if (agendamento.recorrencia_grupo_id && a.recorrencia_grupo_id === agendamento.recorrencia_grupo_id) {
        return true;
      }

      // Sessão de Clube VIP da mesma cliente
      if (isVip && a.cliente_id === agendamento.cliente_id) {
        const aIsVip = !!(
          a.pago_com_clube ||
          a.plano_id ||
          a.observacoes?.includes('Clube VIP') ||
          a.observacoes?.includes('👑')
        );
        if (aIsVip) {
          if (!agendamento.plano_id || !a.plano_id || agendamento.plano_id === a.plano_id) {
            return true;
          }
        }
      }

      // Recorrência manual descrita nas observações
      if (agendamento.cliente_id === a.cliente_id && agendamento.observacoes?.includes('[🔁 Recorrência') && a.observacoes?.includes('[🔁 Recorrência')) {
        return true;
      }

      return false;
    });
  }, [agendamento, agendamentos]);

  // Estados de Desconto na Comanda (Fechamento)
  const [descontoValor, setDescontoValor] = useState<number>(agendamento?.desconto_valor || 0);
  const [descontoMotivo, setDescontoMotivo] = useState<string>(agendamento?.desconto_motivo || 'Desconto acordado');

  // Estados de Produtos na Comanda e Clube VIP
  const [produtosComanda, setProdutosComanda] = useState<ItemComandaProduto[]>(agendamento?.produtos || []);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [produtoQtd, setProdutoQtd] = useState(1);
  const isVipAgendamento = Boolean(
    agendamento?.pago_com_clube ||
    agendamento?.observacoes?.includes('Clube VIP') ||
    agendamento?.observacoes?.includes('👑') ||
    (cliente?.assinatura && cliente.assinatura.status === 'ativo')
  );
  const temAssinaturaAtiva = Boolean(
    (cliente?.assinatura && cliente.assinatura.status === 'ativo') ||
    isVipAgendamento
  );
  const sessaoNumRawCalculado = agendamento?.recorrencia_posicao || (agendamento?.observacoes?.match(/Sessão\s*(\d+)/i)?.[1]);
  const sessaoNumCalculado = sessaoNumRawCalculado ? Number(sessaoNumRawCalculado) : null;
  const isPrimeiraSessaoVip = Boolean(
    (sessaoNumCalculado === 1 || agendamento?.observacoes?.includes('Sessão 1')) &&
    isVipAgendamento
  );

  const [usarSaldoClube, setUsarSaldoClube] = useState(isVipAgendamento);
  const servicoCorrespondente = servs.find(s => 
    cliente?.assinatura?.itens_saldo?.some(item => item.servico_id === s.id && item.saldo_restante > 0)
  ) || servs[0];
  const [servicoAbaterId, setServicoAbaterId] = useState<string>(servicoCorrespondente?.id || '');

  // Valor a cobrar de sinal (se o agendamento já possuir valor_sinal > 0, usa ele; senão calcula dos serviços ou sugere 15)
  const [valorSinalCobrar, setValorSinalCobrar] = useState<number>(() => {
    if (agendamento && Number(agendamento.valor_sinal) > 0) return Number(agendamento.valor_sinal);
    if (servs && servs.length > 0) {
      const somaServs = servs.reduce((acc, s) => {
        if (s.sinal_tipo === 'fixo') return acc + (s.sinal_valor || 0);
        if (s.sinal_tipo === 'porcentagem') return acc + ((s.preco * (s.sinal_valor || 0)) / 100);
        return acc;
      }, 0);
      if (somaServs > 0) return somaServs;
    }
    return 15;
  });

  useEffect(() => {
    if (agendamento) {
      setProfissionalEditadaId(agendamento.profissional_id);
      setDescontoValor(agendamento.desconto_valor || 0);
      setDescontoMotivo(agendamento.desconto_motivo || 'Desconto acordado');
      if (Number(agendamento.valor_sinal) > 0) {
        setValorSinalCobrar(Number(agendamento.valor_sinal));
      } else if (servs && servs.length > 0) {
        const somaServs = servs.reduce((acc, s) => {
          if (s.sinal_tipo === 'fixo') return acc + (s.sinal_valor || 0);
          if (s.sinal_tipo === 'porcentagem') return acc + ((s.preco * (s.sinal_valor || 0)) / 100);
          return acc;
        }, 0);
        if (somaServs > 0) {
          setValorSinalCobrar(somaServs);
        }
      }
    }
  }, [agendamento?.id, agendamento?.valor_sinal, agendamento?.profissional_id, agendamento?.desconto_valor, servs.length]);

  useEffect(() => {
    if (servs && servs.length > 0) {
      setServicosEditadosIds(servs.map(s => s.id));
    }
  }, [servs.length, agendamento?.id]);

  useEffect(() => {
    setAcao(null);
    setEditandoServicosEProf(false);
    if (agendamento?.status) {
      setStatusVisual(agendamento.status);
    }
    if (agendamento?.produtos) {
      setProdutosComanda(agendamento.produtos);
    }
  }, [agendamento?.id, agendamento?.status]);

  useEffect(() => {
    if (agendamento) {
      // Calcula o valor total a receber considerando sinal, clube vip, desconto e produtos de balcão
      const jaPago = agendamento.status === 'confirmado' ? (Number(agendamento.valor_sinal) || 0) : 0;
      const totalProdutos = produtosComanda.reduce((acc, p) => acc + p.subtotal, 0);
      const descVal = Math.max(0, Number(descontoValor) || 0);
      const valorBase = Math.max(0, agendamento.valor_total - jaPago);
      const valorServicoComDesconto = Math.max(0, valorBase - descVal);

      // Na 1ª Sessão com valor_total > 0, o valor cobrado é a mensalidade do plano VIP (não é isenta)
      const isSessaoIsentaClube = usarSaldoClube && (!isPrimeiraSessaoVip || agendamento.valor_total === 0);
      const valorServico = isSessaoIsentaClube ? 0 : valorServicoComDesconto;
      setValorRecebido(valorServico + totalProdutos);
    }
  }, [agendamento, produtosComanda, usarSaldoClube, descontoValor, isPrimeiraSessaoVip]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleAndroidBack = (e: Event) => {
      if (e.cancelable) e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('nail_android_back', handleAndroidBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('nail_android_back', handleAndroidBack);
    };
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

    // Remove todas as tags técnicas internas e metadados de sistema da observação
    let limpo = obs
      .replace(/\s*\[PLANO_ID:[^\]]+\]/gi, '')
      .replace(/\s*\[AG_PAR:[^\]]+\]/gi, '')
      .replace(/\s*\[AG_PRINCIPAL:[^\]]+\]/gi, '')
      .replace(/\s*\[Co-atendimento:[^\]]+\]/gi, '')
      .replace(/\s*\[Simultâneo\]/gi, '')
      .replace(/\s*\[Atendente:[^\]]+\]/gi, '')
      .replace(/\s*\[👑\s*Adesão Clube VIP:[^\]]+\]/gi, '')
      .replace(/\s*\[\s*[^\]]*Recorrência[^\]]*\]/gi, '')
      .replace(/\s*\[Almoço[^\]]*\]/gi, '')
      .replace(/\s*\[Salão Completo\]/gi, '')
      .replace(/👑\s*Clube VIP\s*(\([^)]*\))?\s*-\s*Sessão\s*\d+\s*(\([^)]*\))?/gi, '')
      .replace(/\[Google Agenda Oficial\]/gi, '')
      .replace(/Sincronizado automaticamente da Google Agenda/gi, '')
      .replace(/ID:[a-zA-Z0-9_\-]+(\s*-\s*)?/gi, '')
      .replace(/g_gen_[a-zA-Z0-9_\-]+/gi, '')
      .trim();

    // Se após a limpeza sobrou apenas pontuação vazia ou o próprio nome da cliente
    if (limpo === '-' || limpo === '—' || limpo === '.') {
      limpo = '';
    }
    if (clienteNome && (limpo.toLowerCase() === clienteNome.toLowerCase() || limpo.toLowerCase() === `- ${clienteNome.toLowerCase()}`)) {
      limpo = '';
    }

    if (!isGoogle && !limpo) {
      return null;
    }

    return {
      isGoogle,
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
        const templateRegra = configSalao.regra_devolucao_sinal || REGRA_DEVOLUCAO_PADRAO;
        const regraDevolucaoTexto = templateRegra
          ? `\n\n📌 *Política de devolução/cancelamento:*\n${templateRegra.replace('{horas}', String(configSalao.regras?.cancelamento_limite_horas || 24))}`
          : '';

        const chavePixEfetiva = (prof?.usar_pix_proprio && prof?.chave_pix?.trim())
          ? prof.chave_pix.trim()
          : configSalao.chave_pix;

        msg = preencherTemplateWhatsApp(configSalao.templates_whatsapp.confirmacao, {
          cliente: cliente.nome,
          servico: servText,
          profissional: prof?.nome || 'Sheila',
          data: dataFormatada,
          hora: horaStr,
          sinal: String(agendamento.valor_sinal),
          chave_pix: chavePixEfetiva,
          link_reserva: linkConfirmacao,
          link_confirmacao: linkConfirmacao,
          salao: configSalao.nome || 'Sheila Santos Nails'
        });

        const valorSinalNum = Number(agendamento.valor_sinal || 0);
        const falaDeSinal = valorSinalNum > 0 && (msg.toLowerCase().includes('sinal') || msg.toLowerCase().includes('pix'));

        if (falaDeSinal && regraDevolucaoTexto && !msg.includes('Política de devolução')) {
          msg += regraDevolucaoTexto;
        }

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
    const metaConfig = obterConfigMetaWhatsApp(configSalao?.meta_whatsapp);
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
            ],
            configOverride: metaConfig
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

  // Cobrança ativa do Sinal Pix com gravação imediata do valor no agendamento
  const handleCobrarSinalWhatsApp = () => {
    if (!cliente) return;
    const valor = Number(valorSinalCobrar);
    if (!valor || valor <= 0) {
      mostrarAlerta({
        titulo: 'Valor Inválido',
        mensagem: 'Por favor, digite um valor de sinal válido (maior que zero) para enviar a cobrança via Pix.',
        tipo: 'aviso'
      });
      return;
    }

    // 1. Atualiza imediatamente o agendamento no Supabase e contexto para exigir sinal
    atualizarValorSinalAgendamento(agendamento.id, valor);

    // 2. Prepara e dispara a mensagem de cobrança do WhatsApp
    const horaStr = agendamento.inicio.split('T')[1].substring(0, 5);
    const servText = servs.map(s => s.nome).join(' + ');
    const dataFormatada = new Date(agendamento.inicio).toLocaleDateString('pt-BR');
    const linkConfirmacao = getConfirmationUrl(agendamento.id);

    const regraTextoBase = configSalao.regra_devolucao_sinal || REGRA_DEVOLUCAO_PADRAO;
    const regraDevolucaoTexto = `\n\n📌 *Política de devolução/cancelamento:*\n${regraTextoBase.replace('{horas}', String(configSalao.regras?.cancelamento_limite_horas || 24))}`;

    const chavePixEfetiva = (prof?.usar_pix_proprio && prof?.chave_pix?.trim())
      ? prof.chave_pix.trim()
      : configSalao.chave_pix;

    let msg = preencherTemplateWhatsApp(configSalao.templates_whatsapp.confirmacao, {
      cliente: cliente.nome,
      servico: servText,
      profissional: prof?.nome || 'Sheila',
      data: dataFormatada,
      hora: horaStr,
      sinal: String(valor),
      chave_pix: chavePixEfetiva,
      link_reserva: linkConfirmacao,
      link_confirmacao: linkConfirmacao,
      salao: configSalao.nome || 'Sheila Santos Nails'
    });

    const falaDeSinal = valor > 0 && (msg.toLowerCase().includes('sinal') || msg.toLowerCase().includes('pix'));

    if (falaDeSinal && regraDevolucaoTexto && !msg.includes('Política de devolução')) {
      msg += regraDevolucaoTexto;
    }

    if (!msg.includes(linkConfirmacao)) {
      msg += `\n\n👉 Envie o comprovante e acompanhe sua reserva:\n${linkConfirmacao}`;
    }

    const url = gerarLinkWhatsApp(cliente.telefone, msg);
    if (!url) {
      mostrarAlerta({
        titulo: 'Telefone Não Cadastrado',
        mensagem: `A cliente "${cliente.nome}" não possui um número de WhatsApp válido cadastrado no sistema.`,
        tipo: 'aviso'
      });
      return;
    }

    window.open(url, '_blank');
  };

  // Lógica de ações
  const handleConfirmar = () => {
    updateAgendamentoStatus(agendamento.id, 'confirmado');
    onClose();
  };

  const handleCancelar = () => {
    const motivoFinal = motivoCancelamento.trim() || MOTIVO_CANCELAMENTO_PADRAO;
    cancelAgendamento(agendamento.id, motivoFinal, 'admin');

    if (cliente?.telefone) {
      const fone = cliente.telefone.replace(/\D/g, '');
      const dataStr = new Date(agendamento.inicio).toLocaleDateString('pt-BR');
      const horaStr = agendamento.inicio.split('T')[1].substring(0, 5);
      const msg = `Olá, ${cliente.nome}! Informamos que o seu agendamento para ${dataStr} às ${horaStr} precisou ser cancelado. Motivo: ${motivoFinal}. Caso queira reagendar para outro dia ou horário, estamos à sua inteira disposição! 💕\n\n📅 Escolha um novo horário online:\n${getBookingUrl()}`;
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

  const handleAdicionarProdutoComanda = () => {
    if (!produtoSelecionadoId) return;
    const prod = produtos.find(p => p.id === produtoSelecionadoId);
    if (!prod) return;

    const qtd = Math.max(1, Number(produtoQtd) || 1);
    const subtotal = prod.preco_venda * qtd;

    setProdutosComanda(prev => {
      const existe = prev.find(item => item.produto_id === prod.id);
      if (existe) {
        return prev.map(item => item.produto_id === prod.id ? {
          ...item,
          quantidade: item.quantidade + qtd,
          subtotal: (item.quantidade + qtd) * item.preco_unitario
        } : item);
      }
      return [...prev, {
        id: 'item_' + Date.now(),
        produto_id: prod.id,
        nome_produto: prod.nome,
        quantidade: qtd,
        preco_unitario: prod.preco_venda,
        subtotal
      }];
    });

    setProdutoSelecionadoId('');
    setProdutoQtd(1);
  };

  const handleRemoverProdutoComanda = (produtoId: string) => {
    setProdutosComanda(prev => prev.filter(p => p.produto_id !== produtoId));
  };

  const handleSalvarEdicaoServicosEProf = () => {
    if (!agendamento) return;
    if (servicosEditadosIds.length === 0) {
      mostrarAlerta({
        titulo: 'Nenhum Serviço Selecionado',
        mensagem: 'Por favor, selecione ao menos um serviço para o atendimento.',
        tipo: 'aviso'
      });
      return;
    }

    const servsNovos = servicos.filter(s => servicosEditadosIds.includes(s.id));
    const durTotalNova = servsNovos.reduce((acc, s) => acc + (s.duracao_minutos || 60), 0) || 60;
    const fimFormatado = calcularFimAgendamento(agendamento.inicio, durTotalNova);
    const horaFmt = fimFormatado.split('T')[1]?.substring(0, 5) || '';

    const profAlvo = profissionalEditadaId || agendamento.profissional_id;

    // Verificar se o novo horário de término conflita com outro agendamento
    const temConflito = checkConflitoHorario(agendamento.inicio, fimFormatado, profAlvo, agendamento.id);
    if (temConflito) {
      mostrarAlerta({
        titulo: 'Conflito de Horário Detectado',
        mensagem: `A nova duração (${durTotalNova} min até às ${horaFmt}) conflita com outro agendamento ativo desta profissional. Por favor, selecione serviços com menor duração ou libere o horário antes de salvar.`,
        tipo: 'erro'
      });
      return;
    }

    atualizarServicosEProfissionalAgendamento(
      agendamento.id,
      servicosEditadosIds,
      profAlvo,
      agendamentosFuturosRecorrencia.length > 0 ? aplicarEmFuturos : false
    );
    setEditandoServicosEProf(false);
  };

  const handleConcluir = () => {
    concluirAtendimento(
      agendamento.id, 
      valorRecebido, 
      metodoPgto, 
      undefined, 
      produtosComanda.length > 0 ? produtosComanda : undefined, 
      usarSaldoClube,
      usarSaldoClube ? servicoAbaterId : undefined,
      descontoValor > 0 ? { valor: Number(descontoValor), motivo: descontoMotivo } : undefined
    );
    setAcao(null);
    onClose();
  };

  // Status Styles
  const statusStyles: { [key: string]: string } = {
    pendente: 'bg-[#FFF9E6] text-[#B78103] border-[#FFECB3]',
    confirmado: 'bg-[#EBF7EE] text-[#2B7A4B] border-[#C2EAD0]',
    concluido: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelado: 'bg-red-50 text-red-700 border-red-150',
    falta: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-150',
    bloqueado: 'bg-[#F4ECE3] text-[#786150] border-[#E8DEC9]'
  };

  const statusLabels: { [key: string]: string } = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    falta: 'Falta',
    bloqueado: 'Bloqueado'
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-[#EFECE6] my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Like Claude's UI) */}
        <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
          <div className="flex items-center gap-3">
            {isBloqueio ? (
              <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm border border-amber-200 shadow-2xs">
                <Lock size={18} className="text-[#8C6D58]" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#F6ECE8] text-[#8C6D58] flex items-center justify-center font-bold text-sm border border-[#EFECE6]">
                {initials}
              </div>
            )}
            <div>
              <h3 className="font-bold text-[#5A4535] text-sm leading-tight">
                {isBloqueio 
                  ? (agendamento?.observacoes?.includes('[Salão Completo]') ? 'Bloqueio do Salão Completo' : 'Bloqueio de Horário Pessoal')
                  : (cliente?.nome || 'Horário Reservado')}
              </h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">
                {isBloqueio 
                  ? `Profissional: ${prof?.nome || (agendamento?.observacoes?.includes('[Salão Completo]') ? 'Todas as Profissionais' : 'Salão')}`
                  : (cliente?.telefone || 'Sem telefone')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isBloqueio ? (
              <select
                value={acao === 'remarcar' ? 'remarcar' : statusVisual}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'remarcar') {
                    setAcao('remarcar');
                    setDataRemarcacao(agendamento.inicio.split('T')[0]);
                    setHoraRemarcacao(agendamento.inicio.split('T')[1]?.substring(0, 5) || '09:00');
                    setProfRemarcacaoId(agendamento.profissional_id);
                    return;
                  }
                  const novoStatus = val as AgendamentoStatus;
                  setStatusVisual(novoStatus);
                  updateAgendamentoStatus(agendamento.id, novoStatus);
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 ${acao === 'remarcar' ? 'bg-[#8C6D58] text-white border-[#8C6D58]' : (statusStyles[statusVisual] || '')}`}
                title="Alterar status deste bloqueio"
              >
                <option value="bloqueado">🔒 Bloqueado</option>
                <option value="remarcar">📅 Remarcar horário / dia</option>
                <option value="concluido">🎉 Concluído</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            ) : (
              <select
                value={acao === 'remarcar' ? 'remarcar' : statusVisual}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'remarcar') {
                    setAcao('remarcar');
                    setDataRemarcacao(agendamento.inicio.split('T')[0]);
                    setHoraRemarcacao(agendamento.inicio.split('T')[1]?.substring(0, 5) || '09:00');
                    setProfRemarcacaoId(agendamento.profissional_id);
                    return;
                  }
                  const novoStatus = val as AgendamentoStatus;
                  setStatusVisual(novoStatus);
                  if (novoStatus === 'cancelado') {
                    setAcao('cancelar');
                  } else if (novoStatus === 'falta') {
                    setAcao('falta');
                  } else if (novoStatus === 'concluido') {
                    setAcao('concluir');
                  } else {
                    // Ao mudar para 'pendente' ou 'confirmado', fecha imediatamente qualquer caixa de motivo/ação aberta
                    setAcao(null);
                    if (novoStatus !== agendamento.status) {
                      updateAgendamentoStatus(agendamento.id, novoStatus);
                    }
                  }
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 ${acao === 'remarcar' ? 'bg-[#8C6D58] text-white border-[#8C6D58]' : (statusStyles[statusVisual] || '')}`}
                title="Clique para alterar o status ou remarcar este agendamento"
              >
                <option value="pendente">⏳ Pendente (A Confirmar)</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="concluido">🎉 Concluído</option>
                <option value="falta">⚠️ Falta</option>
                <option value="remarcar">📅 Remarcar horário / dia</option>
                <option value="cancelado">❌ Cancelar</option>
              </select>
            )}
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-[#5A4535] mb-4">
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Código</p>
            <p className="font-mono font-bold text-xs mt-0.5 text-[#8C6D58]">#{agendamento.id}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">{isBloqueio ? 'Tipo' : 'Origem'}</p>
            <p className="font-semibold mt-0.5 capitalize">{isBloqueio ? 'Bloqueio de Agenda' : agendamento.origem}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Data</p>
            <p className="font-semibold mt-0.5">{formatarDataLonga(agendamento.inicio)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">Horário</p>
            <p className="font-semibold mt-0.5">
              {agendamento.inicio.split('T')[1].substring(0, 5)} - {agendamento.fim.split('T')[1].substring(0, 5)} 
              <span className="text-[#8C7A6B] font-normal"> ({
                Math.max(0, Math.floor((new Date(agendamento.fim).getTime() - new Date(agendamento.inicio).getTime()) / (60 * 1000)))
              }min)</span>
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-[#8C7A6B] uppercase font-bold">
              {nomesProfissionaisCompletos.length > 1 ? 'Profissionais (Atendimento em Dupla)' : 'Profissional'}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-[#5A4535]">
                {nomesProfissionaisCompletos.length > 1 
                  ? nomesProfissionaisCompletos.join(' e ') 
                  : (prof?.nome || (agendamento.observacoes?.includes('[Salão Completo]') ? 'Todas as Profissionais (Salão Completo)' : 'Não definido'))}
              </span>
              {nomesProfissionaisCompletos.length > 1 && (
                <span className="text-[9.5px] font-bold bg-[#FAF4ED] text-[#8C6D58] border border-[#E8DEC9] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                  <Sparkles size={11} /> 2 Profissionais Simultâneas
                </span>
              )}
            </div>
          </div>
        </div>

        {isBloqueio ? (
          <div className="space-y-4">
            {/* Motivo do Bloqueio */}
            <div className="p-3 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs text-[#5A4535]">
              <span className="block font-bold text-[10px] uppercase text-[#8C7A6B] mb-1">
                Motivo / Descrição do Bloqueio:
              </span>
              <p className="font-medium text-[#5A4535] whitespace-pre-line">
                {agendamento.observacoes || 'Bloqueio de Horário Pessoal'}
              </p>
            </div>

            {/* Aviso informativo de bloqueio */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Lock size={14} className="text-amber-700" />
                <span>Horário Indisponível para Clientes</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                {agendamento.observacoes?.includes('[Salão Completo]')
                  ? 'Este horário está bloqueado para todas as profissionais ativas no salão. Nenhuma cliente poderá agendar este período.'
                  : `Este horário está bloqueado na agenda de ${prof?.nome || 'esta profissional'}. Clientes não conseguirão agendar este período.`}
              </p>
            </div>

            {/* Ações de Bloqueio */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmarAcao({
                    titulo: 'Excluir Bloqueio de Horário?',
                    mensagem: 'Deseja realmente remover este bloqueio da agenda? O horário voltará a ficar disponível para atendimentos.',
                    tipo: 'aviso',
                    textoConfirmar: 'Sim, Excluir Bloqueio',
                    textoCancelar: 'Voltar',
                    onConfirm: () => {
                      deleteAgendamento(agendamento.id);
                      onClose();
                    }
                  });
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Trash2 size={14} />
                <span>Excluir este Bloqueio</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl border border-[#EFECE6] bg-white hover:bg-[#FAF9F6] text-[#8C7A6B] text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Services Box & Edição de Serviço / Profissional */}
            {!editandoServicosEProf ? (
              <div className="rounded-xl border border-[#EFECE6] p-3.5 mb-4 bg-[#FAF9F6]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">Serviços & Profissional</p>
              {agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setAcao('remarcar');
                      setDataRemarcacao(agendamento.inicio.split('T')[0]);
                      setHoraRemarcacao(agendamento.inicio.split('T')[1]?.substring(0, 5) || '09:00');
                      setProfRemarcacaoId(agendamento.profissional_id);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8C6D58] hover:text-[#5A4535] bg-white border border-[#EFECE6] px-2 py-0.5 rounded-lg transition-colors shadow-2xs hover:bg-[#FAF9F6]"
                    title="Remarcar dia, horário ou profissional"
                  >
                    <Calendar size={12} className="text-[#8C6D58]" />
                    <span>Remarcar Horário / Dia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      let initialIds = servs.map(s => s.id);
                      const combosPresentes = servs.filter(s => s.is_pacote && s.servicos_pacote);
                      if (combosPresentes.length > 0) {
                        const subIds = combosPresentes.flatMap(c => c.servicos_pacote || []);
                        initialIds = initialIds.filter(id => !subIds.includes(id));
                      }
                      setServicosEditadosIds(initialIds);
                      setProfissionalEditadaId(agendamento.profissional_id);
                      setEditandoServicosEProf(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8C6D58] hover:text-[#5A4535] bg-white border border-[#EFECE6] px-2 py-0.5 rounded-lg transition-colors shadow-2xs hover:bg-[#FAF9F6]"
                    title="Trocar procedimentos ou alterar a profissional responsável"
                  >
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Trocar Serviço / Profissional</span>
                  </button>
                </div>
              )}
            </div>

            {isVip && (
              <div className="mb-2.5 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 border border-amber-200 shrink-0">
                    <Crown size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      {agendamento.recorrencia_posicao 
                        ? `Sessão ${agendamento.recorrencia_posicao} • Clube VIP`
                        : (agendamento.observacoes?.match(/Sessão\s*(\d+)/i) 
                            ? `Sessão ${agendamento.observacoes.match(/Sessão\s*(\d+)/i)![1]} • Clube VIP`
                            : 'Atendimento Clube VIP')}
                    </span>
                    <span className="text-[10px] text-amber-800">
                      Procedimento(s) programado(s) para esta sessão
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-bold text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300 inline-block shadow-2xs">
                    ⏱️ {duracaoMinutosAgendamento} min
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-xs text-[#5A4535]">
              {servs.map((s) => (
                <div key={s.id} className="p-2.5 rounded-xl bg-white border border-[#EFECE6] shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                        {s.nome}
                        {isVip && <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-200">Sessão VIP</span>}
                      </span>
                      <span className="text-[10px] text-[#8C7A6B] block">Duração do procedimento: {s.duracao_minutos} min</span>
                    </div>
                    <div className="text-right">
                      {agendamento.pago_com_clube ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Incluso no VIP
                        </span>
                      ) : (
                        <span className="font-semibold text-stone-700">{formatarMoeda(s.preco)}</span>
                      )}
                    </div>
                  </div>

                  {/* Detalhe de Procedimentos e Profissionais Escaladas se for combo/dupla */}
                  {s.is_pacote && s.servicos_pacote_detalhes && s.servicos_pacote_detalhes.length > 0 && (
                    <div className="pt-1.5 border-t border-[#FAF9F6] space-y-1">
                      <span className="text-[9.5px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                        Procedimentos em Dupla:
                      </span>
                      {s.servicos_pacote_detalhes.map((det, dIdx) => {
                        const sub = servicos.find(item => item.id === det.servico_id);
                        const pIdEfetivo = det.profissional_id === 'u_yxnfmkow1' ? 'u2' : det.profissional_id;
                        const profDet = equipe.find(u => u.id === pIdEfetivo);
                        return (
                          <div key={dIdx} className="flex items-center justify-between text-[10.5px] bg-[#FAF9F6] px-2 py-1 rounded-md border border-[#EFECE6]">
                            <span className="font-medium text-[#5A4535]">• {sub?.nome || 'Procedimento'}</span>
                            <span className="font-bold text-[#8C6D58]">{profDet?.nome || 'Profissional'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex justify-between border-t border-[#EFECE6] pt-2 text-xs font-bold text-[#5A4535]">
              <span>{isVip ? 'Valor cobrado nesta sessão' : 'Total'}</span>
              <span>
                {isVip ? (
                  agendamento.valor_total > 0
                    ? `${formatarMoeda(agendamento.valor_total)} (Mensalidade VIP)`
                    : 'R$ 0,00 (Incluso no VIP)'
                ) : (
                  agendamento.pago_com_clube
                    ? (agendamento.valor_total > 0 ? `${formatarMoeda(agendamento.valor_total)} (Mensalidade VIP)` : 'R$ 0,00 (Plano VIP)')
                    : formatarMoeda(agendamento.valor_total)
                )}
              </span>
            </div>
            {agendamento.valor_sinal > 0 && (
              <div className="mt-1 flex justify-between text-[10px] text-[#8C7A6B]">
                <span>Sinal previsto</span>
                <span>{formatarMoeda(agendamento.valor_sinal)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[#8C6D58]/30 p-3.5 mb-4 bg-[#FAF6F0] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#8C6D58]/20 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-[#5A4535]">Alterar Serviço & Profissional</span>
              </div>
              <span className="text-[10px] text-[#8C7A6B]">Atualização de comanda</span>
            </div>

            {/* Seletor de Profissional */}
            <div>
              <label className="block text-[10px] font-bold text-[#8C6D58] uppercase mb-1">
                Profissional Responsável
              </label>
              <select
                value={profissionalEditadaId}
                onChange={(e) => setProfissionalEditadaId(e.target.value)}
                className="w-full bg-white border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#5A4535] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30"
              >
                {equipe.filter(m => m.ativo).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.especialidade || (m.perfil === 'admin' ? 'Proprietária' : 'Profissional')})
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Procedimentos / Serviços Disponíveis */}
            <div>
              <label className="block text-[10px] font-bold text-[#8C6D58] uppercase mb-1">
                Selecione os Serviços Realizados
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[#EFECE6] rounded-lg p-2 bg-white">
                {servicos.filter(s => s.ativo).map((s) => {
                  const isChecked = servicosEditadosIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-amber-50/70 border-amber-300 font-semibold text-[#5A4535]' 
                          : 'bg-white border-stone-100 hover:border-gray-200 text-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (s.is_pacote && s.servicos_pacote && s.servicos_pacote.length > 0) {
                                setServicosEditadosIds(prev => [
                                  ...prev.filter(id => !s.servicos_pacote!.includes(id)),
                                  s.id
                                ]);
                              } else {
                                const combosQueContem = servicos
                                  .filter(other => other.is_pacote && other.servicos_pacote?.includes(s.id))
                                  .map(c => c.id);
                                setServicosEditadosIds(prev => [
                                  ...prev.filter(id => !combosQueContem.includes(id)),
                                  s.id
                                ]);
                              }
                            } else {
                              setServicosEditadosIds(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded text-[#8C6D58] focus:ring-[#8C6D58]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{s.nome}</span>
                            {s.is_pacote && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded-xs">
                                Combo
                              </span>
                            )}
                          </div>
                          {s.is_pacote && s.servicos_pacote && s.servicos_pacote.length > 0 && (
                            <span className="text-[10px] text-[#8C7A6B] block">
                              Inclui: {servicos.filter(sub => s.servicos_pacote?.includes(sub.id)).map(sub => sub.nome).join(' + ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8C7A6B] block">{s.duracao_minutos} min</span>
                        <span className="font-bold text-[#5A4535]">{formatarMoeda(s.preco)}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Previsão recalculada de Duração e Término */}
            {(() => {
              const servsNovos = servicos.filter(s => servicosEditadosIds.includes(s.id));
              const durTotalNova = servsNovos.reduce((acc, s) => acc + (s.duracao_minutos || 60), 0) || 60;
              const dIni = new Date(agendamento.inicio);
              const dFim = new Date(dIni.getTime() + durTotalNova * 60000);
              const horaFim = `${String(dFim.getHours()).padStart(2, '0')}:${String(dFim.getMinutes()).padStart(2, '0')}`;
              const isVipIncluso = agendamento.pago_com_clube && agendamento.valor_total === 0;
              const novoTotalCalculado = isVipIncluso ? 0 : servsNovos.reduce((acc, s) => acc + (Number(s.preco) || 0), 0);

              return (
                <div className="p-2.5 bg-white rounded-lg border border-[#EFECE6] text-xs space-y-1">
                  <div className="flex justify-between text-[#8C7A6B]">
                    <span>Nova duração prevista:</span>
                    <span className="font-bold text-[#5A4535]">{durTotalNova} min (até às {horaFim})</span>
                  </div>
                  <div className="flex justify-between text-[#8C7A6B]">
                    <span>Novo valor total:</span>
                    <span className="font-bold text-[#8C6D58]">{formatarMoeda(novoTotalCalculado)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Opção de propagar para agendamentos futuros da recorrência */}
            {agendamentosFuturosRecorrencia.length > 0 && (
              <label className="flex items-center gap-2.5 p-2.5 bg-amber-50 border border-amber-200/90 rounded-xl cursor-pointer text-xs font-medium text-amber-950 transition-colors hover:bg-amber-100/70 shadow-2xs">
                <input
                  type="checkbox"
                  checked={aplicarEmFuturos}
                  onChange={(e) => setAplicarEmFuturos(e.target.checked)}
                  className="rounded text-[#8C6D58] focus:ring-[#8C6D58] w-4 h-4 cursor-pointer shrink-0"
                />
                <div className="flex-1">
                  <span className="font-bold flex items-center gap-1 text-[#5A4535]">
                    <Repeat size={13} className="text-[#8C6D58]" />
                    <span>Ajustar agendamentos futuros desta recorrência</span>
                  </span>
                  <span className="text-[10px] text-amber-800 block mt-0.5 leading-snug">
                    Aplica o novo procedimento/profissional também aos próximos {agendamentosFuturosRecorrencia.length} {agendamentosFuturosRecorrencia.length === 1 ? 'agendamento' : 'agendamentos'} da sequência
                  </span>
                </div>
              </label>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setEditandoServicosEProf(false)}
                className="px-3 py-1.5 text-[#8C7A6B] hover:bg-white rounded-lg font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEdicaoServicosEProf}
                className="px-4 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-lg font-semibold shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

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

        {/* Card Agendamento Recorrente (Google Agenda Style) */}
        {(agendamento.recorrencia_grupo_id || agendamento.recorrencia_posicao || agendamento.observacoes?.includes('Recorrência')) && (
          <div className="mb-4 p-3 bg-gradient-to-r from-stone-50 to-amber-50/50 border border-[#EFECE6] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Repeat size={14} className="text-[#8C6D58]" />
                <span className="text-xs font-bold text-[#5A4535]">
                  Agendamento Recorrente
                </span>
              </div>
              {agendamento.recorrencia_posicao && (
                <span className="text-[10px] font-bold bg-[#FAF9F6] text-[#8C6D58] border border-[#EFECE6] px-2 py-0.5 rounded-full">
                  Sessão {agendamento.recorrencia_posicao}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8C7A6B] leading-snug">
              Este atendimento faz parte de uma sequência periódica agendada no salão.
            </p>
          </div>
        )}

        {/* Card Clube VIP & Recorrência Dinâmica */}
        {temAssinaturaAtiva && (() => {
          const planoVipObj = encontrarPlanoVip(
            agendamento.plano_id || cliente?.assinatura?.plano_id,
            cliente?.assinatura,
            agendamento.observacoes,
            planosAssinatura
          );
          const intervaloDias = calcularIntervaloVip(planoVipObj, cliente?.assinatura);
          const { descricaoCompleta } = obterTextoFrequenciaVip(intervaloDias);

          const recPosStr = agendamento.recorrencia_posicao || '';
          const matchPos = recPosStr.match(/(\d+)\s+de\s+(\d+)/i);
          const sessaoNumFromPos = matchPos ? Number(matchPos[1]) : null;
          const totalFromPos = matchPos ? Number(matchPos[2]) : null;

          const sessaoNumRaw = sessaoNumFromPos || (agendamento.observacoes?.match(/Sessão\s*(\d+)/i)?.[1]);
          const sessaoNum = sessaoNumRaw ? Number(sessaoNumRaw) : null;

          // Determina o total real de sessões do ciclo
          let totalSessoesPlano = totalFromPos || 0;
          if (!totalSessoesPlano && planoVipObj?.distribuicao_sessoes && planoVipObj.distribuicao_sessoes.length > 0) {
            totalSessoesPlano = Math.max(...planoVipObj.distribuicao_sessoes.map(d => d.sessao_numero));
          }
          if (!totalSessoesPlano && planoVipObj?.itens_servicos) {
            const sessoesItens = planoVipObj.itens_servicos.flatMap(it => it.sessoes || []);
            if (sessoesItens.length > 0) {
              totalSessoesPlano = Math.max(...sessoesItens);
            }
          }
          // Maior sessão existente nos agendamentos desta cliente para este ciclo
          const sessoesDaCliente = agendamentos
            .filter(a => a.cliente_id === agendamento.cliente_id && a.status !== 'cancelado')
            .map(a => {
              const m = a.recorrencia_posicao?.match(/(\d+)\s+de\s+(\d+)/i);
              if (m) return Math.max(Number(m[1]), Number(m[2]));
              const sMatch = a.observacoes?.match(/Sessão\s*(\d+)/i);
              return sMatch ? Number(sMatch[1]) : 0;
            });
          const maiorSessaoExistente = sessoesDaCliente.length > 0 ? Math.max(...sessoesDaCliente) : 0;
          const totalBase = Number(planoVipObj?.qtd_procedimentos_mes || cliente?.assinatura?.total_mes || 4);
          totalSessoesPlano = Math.max(totalSessoesPlano, maiorSessaoExistente, totalBase, sessaoNum || 1);

          let badgeTexto = 'VIP';
          if (sessaoNum !== null && !isNaN(sessaoNum) && sessaoNum > 0) {
            if (agendamento.status === 'concluido') {
              const restApos = Math.max(0, totalSessoesPlano - sessaoNum);
              badgeTexto = restApos === 0 ? '0 sessões rest. (Finalizado)' : (restApos === 1 ? '1 sessão rest.' : `${restApos} sessões rest.`);
            } else {
              const restAtual = Math.max(1, totalSessoesPlano - (sessaoNum - 1));
              badgeTexto = restAtual === 1 ? '1 sessão rest. (última)' : `${restAtual} sessões rest.`;
            }
          } else if (cliente?.assinatura?.saldo_restante !== undefined) {
            const s = cliente.assinatura.saldo_restante;
            badgeTexto = s === 0 ? '0 sessões rest.' : (s === 1 ? '1 sessão rest.' : `${s} sessões rest.`);
          }

          return (
            <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown size={15} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">
                    Clube VIP: {planoVipObj?.nome || cliente?.assinatura?.nome_plano || 'Assinatura VIP'}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-full">
                  {badgeTexto}
                </span>
              </div>

              <p className="text-[11px] text-amber-900 leading-snug">
                Os atendimentos deste plano são {descricaoCompleta}.
              </p>
            </div>
          );
        })()}

        {/* Lembretes WhatsApp e Cobrança de Sinal */}
        {agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && agendamento.status !== 'falta' && (
          <div className="space-y-3 mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleEnviarMensagemWhatsApp('lembrete')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-bold transition-colors"
              >
                <MessageCircle size={14} className="text-[#25D366]" />
                <span>Enviar lembrete</span>
              </button>
              {agendamento.status === 'pendente' && (
                <button
                  type="button"
                  onClick={() => handleEnviarMensagemWhatsApp('confirmacao')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#FAF9F6] border border-[#EFECE6] text-[#8C7A6B] hover:text-[#5A4535] rounded-xl text-xs font-bold transition-colors"
                >
                  <MessageCircle size={14} className="text-[#25D366]" />
                  <span>Pedir confirmação</span>
                </button>
              )}
              {statusVisual === 'pendente' && (
                <button
                  type="button"
                  onClick={handleCobrarSinalWhatsApp}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4FA97A] hover:bg-[#419266] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  title="Enviar mensagem cobrando o sinal Pix da cliente e atualizar o agendamento"
                >
                  <MessageCircle size={14} />
                  <span>Cobrar Sinal Pix</span>
                </button>
              )}
            </div>

            {/* Campo para digitar o valor do sinal quando status for Pendente */}
            {statusVisual === 'pendente' && (
              <div className="p-3 bg-[#FAF6F0] border border-[#8C6D58]/25 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C6D58] uppercase tracking-wider">
                      Valor do Sinal Pix a Cobrar
                    </label>
                    <span className="text-[10px] text-[#8C7A6B]">
                      Exige envio de comprovante e bloqueia confirmação direta
                    </span>
                  </div>
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C6D58]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={valorSinalCobrar === 0 ? '' : valorSinalCobrar}
                      onChange={(e) => setValorSinalCobrar(Number(e.target.value))}
                      className="w-full pl-8 pr-2 py-1.5 border border-[#EFECE6] rounded-lg text-xs font-bold text-[#5A4535] bg-white focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30"
                      placeholder="30,00"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- INLINE ACTION BOXES --- */}
        
        {/* Remarcar inline */}
        {acao === 'remarcar' && (
          <div className="p-3.5 border border-[#8C6D58]/30 bg-[#FAF6F0] rounded-xl space-y-3.5 mb-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A4535]">
                <Calendar size={15} className="text-[#8C6D58]" />
                <span>Remarcar Horário / Dia</span>
              </div>
              <span className="text-[10.5px] font-bold text-[#8C6D58] bg-white px-2 py-0.5 rounded-md border border-[#EFECE6]">
                ⏱️ {duracaoMinutosAgendamento} min
              </span>
            </div>

            {errorRemarcacao && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{errorRemarcacao}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Nova Data
                </label>
                <div className="flex items-center gap-2 p-2 border border-[#EFECE6] rounded-xl bg-white">
                  <Calendar size={14} className="text-[#8C6D58] shrink-0" />
                  <input
                    type="date"
                    required
                    value={dataRemarcacao}
                    onChange={(e) => {
                      setDataRemarcacao(e.target.value);
                      setErrorRemarcacao('');
                    }}
                    className="text-xs font-bold text-[#5A4535] bg-transparent outline-none w-full border-none focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Profissional
                </label>
                <select
                  value={profRemarcacaoId}
                  onChange={(e) => {
                    setProfRemarcacaoId(e.target.value);
                    setErrorRemarcacao('');
                  }}
                  className="w-full border border-[#EFECE6] rounded-xl p-2 text-xs font-bold text-[#5A4535] bg-white focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30"
                >
                  {equipe.filter(u => u.ativo).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.especialidade || (u.perfil === 'admin' ? 'Proprietária' : 'Profissional')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vagas disponíveis */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">
                  Horários Disponíveis ({analiseHorariosRemarcacao.livres.length} livres)
                </label>
                <span className="text-[10px] text-[#8C7A6B]">
                  Duração: {duracaoMinutosAgendamento} min
                </span>
              </div>

              {analiseHorariosRemarcacao.fechado ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>O salão não abre neste dia da semana. Selecione outra data.</span>
                </div>
              ) : analiseHorariosRemarcacao.livres.length === 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>Nenhum horário disponível para esta duração nesta data. Tente outra data ou profissional.</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-[#EFECE6] rounded-xl">
                  {analiseHorariosRemarcacao.livres.map(h => {
                    const isSel = horaRemarcacao === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setHoraRemarcacao(h);
                          setErrorRemarcacao('');
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                          isSel
                            ? 'bg-[#8C6D58] text-white border-[#8C6D58] shadow-xs'
                            : 'bg-[#FAF9F6] text-[#5A4535] border-[#EFECE6] hover:bg-[#F2DFD5]/40 hover:border-[#8C6D58]/40'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Opções de Recorrência (se o agendamento for recorrente ou VIP) */}
            {agendamentosFuturosRecorrencia.length > 0 && (
              <div className="p-3 bg-[#FAF4ED]/70 border border-[#E8DEC9] rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#5A4535] flex items-center gap-1.5">
                    <Repeat size={13} className="text-[#8C6D58]" />
                    <span>Recorrência ({agendamentosFuturosRecorrencia.length} sessões futuras)</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#8C6D58] bg-white px-2 py-0.5 rounded-md border border-[#E8DEC9]">
                    {!remarcarAjustarFuturos ? 'Somente este dia' : 'Reagendar sequência'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setRemarcarAjustarFuturos(false)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      !remarcarAjustarFuturos
                        ? 'bg-white border-[#8C6D58] ring-1.5 ring-[#8C6D58] shadow-xs'
                        : 'bg-white/50 border-[#EFECE6] hover:bg-white text-[#8C7A6B]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        !remarcarAjustarFuturos ? 'border-[#8C6D58] bg-[#8C6D58]' : 'border-gray-300'
                      }`}>
                        {!remarcarAjustarFuturos && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`font-bold text-xs ${!remarcarAjustarFuturos ? 'text-[#5A4535]' : 'text-stone-600'}`}>
                        Apenas este dia
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#8C7A6B] leading-snug pl-5.5">
                      Não altera os agendamentos futuros. Remarca exclusivamente este atendimento.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemarcarAjustarFuturos(true)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      remarcarAjustarFuturos
                        ? 'bg-white border-[#8C6D58] ring-1.5 ring-[#8C6D58] shadow-xs'
                        : 'bg-white/50 border-[#EFECE6] hover:bg-white text-[#8C7A6B]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        remarcarAjustarFuturos ? 'border-[#8C6D58] bg-[#8C6D58]' : 'border-gray-300'
                      }`}>
                        {remarcarAjustarFuturos && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`font-bold text-xs ${remarcarAjustarFuturos ? 'text-[#5A4535]' : 'text-stone-600'}`}>
                        Este e todos os futuros
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#8C7A6B] leading-snug pl-5.5">
                      Reagenda este atendimento e projeta as próximas {agendamentosFuturosRecorrencia.length} sessões no novo dia/horário.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Checkbox avisar cliente via WhatsApp */}
            {cliente?.telefone && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#5A4535] select-none pt-1">
                <input
                  type="checkbox"
                  checked={notificarWhatsAppRemarcacao}
                  onChange={(e) => setNotificarWhatsAppRemarcacao(e.target.checked)}
                  className="rounded text-[#8C6D58] focus:ring-[#8C6D58]/30 w-4 h-4"
                />
                <span className="flex items-center gap-1 font-medium">
                  <MessageCircle size={14} className="text-emerald-600" />
                  Avisar {cliente.nome} pelo WhatsApp após remarcar
                </span>
              </label>
            )}

            {/* Botões de Ação do Painel de Remarcação */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EFECE6]">
              <button
                type="button"
                onClick={() => {
                  setAcao(null);
                  setErrorRemarcacao('');
                  setStatusVisual(agendamento.status);
                }}
                className="px-3.5 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-white transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRemarcacao}
                disabled={analiseHorariosRemarcacao.livres.length === 0 || !horaRemarcacao}
                className="px-4 py-2 bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <CalendarCheck size={14} />
                <span>Confirmar Remarcação</span>
              </button>
            </div>
          </div>
        )}

        {/* Cancelar inline */}
        {acao === 'cancelar' && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-xl space-y-3 mb-4 animate-in fade-in duration-150">
            {/* Aviso especial se for Clube VIP */}
            {temAssinaturaAtiva && (
              <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start gap-2">
                <Crown size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px] uppercase tracking-wider">Atenção - Assinatura Clube VIP</p>
                  <p className="text-[11px] text-amber-900 leading-snug">
                    Ao confirmar o cancelamento, todas as sessões em aberto deste ciclo na agenda serão excluídas automaticamente para liberar os horários.
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-red-700 uppercase">Motivo do cancelamento</label>
                <span className="text-[10px] text-red-600 italic">Texto pronto para edição rápida</span>
              </div>

              {/* Botões rápidos de sugestão */}
              <div className="flex flex-wrap gap-1 mb-2">
                {SUGESTOES_MOTIVOS.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMotivoCancelamento(sug)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                      motivoCancelamento === sug
                        ? 'bg-red-600 text-white border-red-600 font-bold shadow-xs'
                        : 'bg-white text-red-800 border-red-200 hover:bg-red-100/80'
                    }`}
                  >
                    {idx === 0 ? '⚡ Imprevisto no salão' : idx === 1 ? '👤 Pedido da cliente' : idx === 2 ? '🩺 Saúde/Emergência' : '📅 Horário indisponível'}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                required
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Digite ou edite o motivo..."
                className="w-full border border-red-200 rounded-lg p-2 text-xs text-red-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button 
                type="button" onClick={() => { setAcao(null); setStatusVisual(agendamento.status); }}
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
          <div className="p-3 border border-[#8C6D58]/25 bg-[#FAF6F0] rounded-xl space-y-3 mb-4 animate-in fade-in duration-200">
            {/* Banner Clube VIP (se tiver assinatura ativa) */}
            {temAssinaturaAtiva && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Crown size={15} className="text-amber-600" />
                    <span className="text-xs font-bold text-amber-900">
                      Clube VIP: {cliente?.assinatura?.nome_plano}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full">
                    {cliente?.assinatura?.saldo_restante} {cliente?.assinatura?.saldo_restante === 1 ? 'sessão restante' : 'sessões restantes'}
                  </span>
                </div>

                {/* Saldos específicos por serviço */}
                {cliente?.assinatura?.itens_saldo && cliente.assinatura.itens_saldo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {cliente.assinatura.itens_saldo.map(item => (
                      <span 
                        key={item.servico_id}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                          item.saldo_restante > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}
                      >
                        {item.nome_servico}: {item.saldo_restante}/{item.total_mes}
                      </span>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200/50">
                  <input
                    type="checkbox"
                    checked={usarSaldoClube}
                    onChange={(e) => setUsarSaldoClube(e.target.checked)}
                    className="rounded text-[#8C6D58] focus:ring-[#8C6D58]"
                  />
                  <span className="text-xs text-amber-950 font-medium">
                    {isPrimeiraSessaoVip && agendamento.valor_total > 0
                      ? '1ª Sessão: Cobrança da mensalidade do Clube VIP'
                      : 'Debitar atendimento do plano do Clube (Isenta cobrança do serviço)'}
                  </span>
                </label>

                {usarSaldoClube && cliente?.assinatura?.itens_saldo && cliente.assinatura.itens_saldo.length > 1 && (
                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">Qual serviço abater do saldo?</label>
                    <select
                      value={servicoAbaterId}
                      onChange={(e) => setServicoAbaterId(e.target.value)}
                      className="w-full text-xs bg-white border border-amber-300 rounded-lg p-1.5 text-amber-950 font-semibold"
                    >
                      {cliente.assinatura.itens_saldo.map(item => (
                        <option key={item.servico_id} value={item.servico_id} disabled={item.saldo_restante <= 0}>
                          {item.nome_servico} ({item.saldo_restante} restantes)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* PDV Balcão: Adicionar produtos à comanda */}
            <div className="p-3 bg-white border border-[#EFECE6] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-[#8C6D58]" />
                  <span className="text-[10px] font-bold text-[#8C6D58] uppercase tracking-wider">
                    Produtos de Balcão (PDV)
                  </span>
                </div>
                <span className="text-[10px] text-[#8C7A6B]">Home care e óleos</span>
              </div>

              {/* Seletor de produtos em 2 linhas para nunca cortar botões */}
              <div className="space-y-2">
                <select
                  value={produtoSelecionadoId}
                  onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs bg-[#FAF9F6] text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                >
                  <option value="">+ Selecionar produto em estoque...</option>
                  {produtos.filter(p => p.ativo !== false && p.estoque_atual > 0).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (R$ {p.preco_venda.toFixed(2)} - {p.estoque_atual} un)
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-[#8C7A6B] uppercase">Qtd:</span>
                    <input
                      type="number"
                      min="1"
                      value={produtoQtd}
                      onChange={(e) => setProdutoQtd(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-center font-bold bg-[#FAF9F6] text-[#5A4535]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAdicionarProdutoComanda}
                    disabled={!produtoSelecionadoId}
                    className="flex-1 py-1.5 px-3 bg-[#8C6D58] hover:bg-[#725743] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Adicionar à Comanda</span>
                  </button>
                </div>
              </div>

              {/* Itens adicionados à comanda */}
              {produtosComanda.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-[#FAF9F6]">
                  {produtosComanda.map(item => (
                    <div key={item.produto_id} className="flex items-center justify-between text-xs bg-[#FAF9F6] p-1.5 rounded-lg border border-[#EFECE6]/60">
                      <div>
                        <span className="font-semibold text-[#5A4535]">{item.quantidade}x {item.nome_produto}</span>
                        <span className="text-[10px] text-[#8C7A6B] block">R$ {item.preco_unitario.toFixed(2)} un</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#5A4535] font-serif">R$ {item.subtotal.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoverProdutoComanda(item.produto_id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remover produto da comanda"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campo de Desconto na Comanda (Negociação no Fechamento) */}
            <div className="p-3 bg-white border border-[#EFECE6] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-600" />
                  <label className="block text-[10px] font-bold text-[#8C6D58] uppercase">
                    Desconto no Fechamento
                  </label>
                </div>
                <span className="text-[10px] text-[#8C7A6B]">Negociação com a cliente</span>
              </div>

              {/* Botões rápidos de motivo */}
              <div className="flex flex-wrap gap-1">
                {['Negociado', 'Cortesia', 'Fidelidade', 'Promoção'].map(mot => (
                  <button
                    key={mot}
                    type="button"
                    onClick={() => setDescontoMotivo(mot)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                      descontoMotivo === mot
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-[#FAF9F6] text-[#5A4535] border-[#EFECE6] hover:bg-gray-100'
                    }`}
                  >
                    {mot}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={descontoValor === 0 ? '' : descontoValor}
                    onChange={(e) => setDescontoValor(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-2 py-1.5 border border-[#EFECE6] rounded-lg text-xs font-bold text-emerald-800 bg-[#FAF9F6] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Motivo (ex: Amiga da casa)"
                  value={descontoMotivo}
                  onChange={(e) => setDescontoMotivo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#EFECE6] rounded-lg text-xs text-[#5A4535] bg-[#FAF9F6] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>
            </div>

            {/* Resumo da Comanda */}
            <div className="bg-white/80 p-2.5 rounded-xl border border-[#EFECE6] space-y-1 text-xs">
              <div className="flex justify-between text-[#8C7A6B]">
                <span>{isPrimeiraSessaoVip && agendamento.valor_total > 0 ? 'Mensalidade do Clube VIP:' : 'Serviço realizado:'}</span>
                <span className={((!isPrimeiraSessaoVip || agendamento.valor_total === 0) && (usarSaldoClube || isVipAgendamento)) ? 'line-through text-gray-400' : 'font-semibold text-[#5A4535]'}>
                  {formatarMoeda(agendamento.valor_total)}
                </span>
              </div>
              {((!isPrimeiraSessaoVip || agendamento.valor_total === 0) && (usarSaldoClube || (agendamento.valor_total === 0 && isVipAgendamento))) && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Plano Clube VIP:</span>
                  <span>R$ 0,00 (Sessão inclusa no plano)</span>
                </div>
              )}
              {descontoValor > 0 && !usarSaldoClube && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Desconto concedido ({descontoMotivo}):</span>
                  <span>-{formatarMoeda(descontoValor)}</span>
                </div>
              )}
              {agendamento.status === 'confirmado' && agendamento.valor_sinal > 0 && !usarSaldoClube && (
                <div className="flex justify-between text-emerald-700">
                  <span>Sinal já pago:</span>
                  <span>-{formatarMoeda(agendamento.valor_sinal)}</span>
                </div>
              )}
              {produtosComanda.length > 0 && (
                <div className="flex justify-between text-[#8C6D58] font-semibold">
                  <span>Produtos na comanda:</span>
                  <span>+{formatarMoeda(produtosComanda.reduce((acc, p) => acc + p.subtotal, 0))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#EFECE6] pt-1.5 text-xs font-bold text-[#5A4535]">
                <span>Total a receber:</span>
                <span className="font-serif text-sm text-[#8C6D58]">{formatarMoeda(valorRecebido)}</span>
              </div>
            </div>

            {/* Forma de Pagamento e Valor Recebido */}
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
                <label className="block text-[10px] font-bold text-[#8C6D58] uppercase mb-1">Valor a receber (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valorRecebido === 0 ? '' : valorRecebido}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValorRecebido(v === '' ? 0 : Math.max(0, parseFloat(v) || 0));
                  }}
                  className="w-full border border-[#EFECE6] rounded-lg px-2 py-1.5 bg-white text-[#5A4535] font-bold font-serif"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button 
                type="button" onClick={() => { setAcao(null); setStatusVisual(agendamento.status); }}
                className="px-3 py-1.5 text-[#8C6D58] hover:bg-[#F3ECE0] rounded-lg font-semibold"
              >
                Voltar
              </button>
              <button 
                type="button" onClick={handleConcluir}
                className="px-4 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>Concluir e registrar</span>
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
                type="button" onClick={() => { setAcao(null); setStatusVisual(agendamento.status); }}
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
          </>
        )}

      </div>
    </div>
  );
};
