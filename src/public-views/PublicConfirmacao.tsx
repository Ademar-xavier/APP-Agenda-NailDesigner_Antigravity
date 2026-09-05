import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin, 
  Sparkles, 
  Phone, 
  AlertCircle, 
  CalendarPlus, 
  MessageCircle, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Heart,
  Copy,
  Check
} from 'lucide-react';
import { supabase, atualizarStatusAgendamentoSupabase } from '../services/supabase';
import { useAppState } from '../context/AppStateContext';
import { REGRA_DEVOLUCAO_PADRAO } from '../types';
import { enviarMensagemTextoMeta } from '../services/metaWhatsApp';
import { gerarLinkGoogleCalendar, getBookingUrl, gerarLinkWhatsApp } from '../utils/urlHelper';

interface AgendamentoPublico {
  id: string;
  cliente_id: string;
  profissional_id: string;
  inicio: string;
  fim: string;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'falta' | 'bloqueado';
  valor_total: number;
  valor_sinal: number;
  observacoes?: string;
  itens_servicos?: string[];
  motivo_cancelamento?: string;
  cancelado_por?: string;
}

interface ClientePublico {
  id: string;
  nome: string;
  telefone: string;
}

interface ServicoPublico {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
}

export const PublicConfirmacao: React.FC = () => {
  const { 
    agendamentos: agendamentosContext,
    clientes: clientesContext,
    servicos: servicosContext,
    obterServicosDeAgendamento,
    updateAgendamentoStatus, 
    cancelAgendamento, 
    configSalao: configSalaoContext, 
    equipe: equipeContext 
  } = useAppState();

  const [loading, setLoading] = useState<boolean>(true);
  const [agendamentoId, setAgendamentoId] = useState<string>('');
  const [agendamento, setAgendamento] = useState<AgendamentoPublico | null>(null);
  const [cliente, setCliente] = useState<ClientePublico | null>(null);
  const [servicos, setServicos] = useState<ServicoPublico[]>([]);
  const [profissionalNome, setProfissionalNome] = useState<string>('Sheila Santos');
  const [dadosSalao, setDadosSalao] = useState({
    nome: 'Sheila Santos Nails',
    proprietaria: 'Sheila Santos',
    telefone: '3597141856',
    endereco: 'Rua Coronel Gabriel Penha de Paiva, 699 - Vila Paiva, Varginha - MG',
    instagram: '@sheilasantos_nails',
    chave_pix: '',
    instrucoes_pix: '',
    regra_devolucao_sinal: REGRA_DEVOLUCAO_PADRAO,
    cancelamento_limite_horas: 24,
    meta_whatsapp: undefined as { phoneNumberId: string; accessToken: string; ativo: boolean } | undefined
  });
  const [dadosProfissional, setDadosProfissional] = useState<{
    id?: string;
    nome?: string;
    telefone?: string;
    chave_pix?: string;
    usar_pix_proprio?: boolean;
  } | null>(null);
  const [pixCopiado, setPixCopiado] = useState<boolean>(false);

  const [processandoAcao, setProcessandoAcao] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Modal de Cancelamento
  const [modalCancelarAberto, setModalCancelarAberto] = useState<boolean>(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('Imprevisto pessoal ou profissional');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState<string>('');

  // 1. Extração do ID do Agendamento da URL (com suporte a hashchange em tempo real)
  useEffect(() => {
    const extrairId = (): string => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;

        const searchParams = new URLSearchParams(search);
        if (searchParams.get('id')) return searchParams.get('id')!.trim();
        if (searchParams.get('confirmar')) return searchParams.get('confirmar')!.trim();

        if (hash.includes('?')) {
          const hashQuery = hash.substring(hash.indexOf('?') + 1);
          const hashParams = new URLSearchParams(hashQuery);
          if (hashParams.get('id')) return hashParams.get('id')!.trim();
          if (hashParams.get('confirmar')) return hashParams.get('confirmar')!.trim();
        }

        if (hash.includes('=')) {
          const parts = hash.split('=');
          if (parts[1]) return parts[1].split('&')[0].trim();
        }

        if (hash.includes('/')) {
          const parts = hash.split('/');
          if (parts[1]) return parts[1].split('?')[0].split('&')[0].trim();
        }
      } catch (e) {
        console.error('Erro ao ler URL:', e);
      }
      return '';
    };

    const atualizar = () => {
      const id = extrairId();
      setAgendamentoId(id);
    };

    atualizar();
    window.addEventListener('hashchange', atualizar);
    window.addEventListener('popstate', atualizar);
    return () => {
      window.removeEventListener('hashchange', atualizar);
      window.removeEventListener('popstate', atualizar);
    };
  }, []);

  // 2. Busca dos dados completos no Supabase (com busca flexível e fallback)
  useEffect(() => {
    if (!agendamentoId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const carregarDados = async () => {
      setLoading(true);
      try {
        // A. Buscar agendamento: primeiro por ID exato, depois case-insensitive, depois fallback local
        let agendamentoData: any = null;

        const { data: resExato } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .maybeSingle();

        if (resExato) {
          agendamentoData = resExato;
        } else {
          const { data: resIlike } = await supabase
            .from('agendamentos')
            .select('*')
            .ilike('id', agendamentoId)
            .maybeSingle();
          if (resIlike) {
            agendamentoData = resIlike;
          } else {
            const localAg = (agendamentosContext || []).find(a => a.id.toLowerCase() === agendamentoId.toLowerCase());
            if (localAg) {
              const servs = obterServicosDeAgendamento ? obterServicosDeAgendamento(localAg.id) : [];
              agendamentoData = {
                ...localAg,
                itens_servicos: servs.map(s => s.id)
              };
            }
          }
        }

        if (!agendamentoData) {
          console.warn('Agendamento não encontrado para ID:', agendamentoId);
          if (isMounted) setLoading(false);
          return;
        }

        if (!isMounted) return;
        setAgendamento(agendamentoData);

        // B. Buscar cliente
        if (agendamentoData.cliente_id) {
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('id, nome, telefone')
            .eq('id', agendamentoData.cliente_id)
            .maybeSingle();
          if (clienteData && isMounted) {
            setCliente(clienteData);
          } else {
            const localCli = (clientesContext || []).find(c => c.id === agendamentoData.cliente_id);
            if (localCli && isMounted) {
              setCliente(localCli);
            }
          }
        }

        // C. Buscar serviços
        const servicosIds = Array.isArray(agendamentoData.itens_servicos) 
          ? agendamentoData.itens_servicos 
          : [];

        if (servicosIds.length > 0) {
          const { data: servicosData } = await supabase
            .from('servicos')
            .select('id, nome, duracao_minutos, preco')
            .in('id', servicosIds);
          if (servicosData && servicosData.length > 0 && isMounted) {
            setServicos(servicosData);
          } else {
            const localServs = (servicosContext || []).filter(s => servicosIds.includes(s.id));
            if (localServs.length > 0 && isMounted) {
              setServicos(localServs);
            }
          }
        }

        // D. Buscar profissional responsável
        if (agendamentoData.profissional_id) {
          const profLocal = (equipeContext || []).find(e => e.id === agendamentoData.profissional_id);
          if (profLocal) {
            setProfissionalNome(profLocal.nome);
            setDadosProfissional({
              id: profLocal.id,
              nome: profLocal.nome,
              telefone: profLocal.telefone,
              chave_pix: profLocal.chave_pix,
              usar_pix_proprio: profLocal.usar_pix_proprio
            });
          } else {
            const { data: profData } = await supabase
              .from('usuarios')
              .select('id, nome, telefone, chave_pix, usar_pix_proprio')
              .eq('id', agendamentoData.profissional_id)
              .maybeSingle();
            if (profData && isMounted) {
              if (profData.nome) setProfissionalNome(profData.nome);
              setDadosProfissional({
                id: profData.id,
                nome: profData.nome,
                telefone: profData.telefone,
                chave_pix: profData.chave_pix,
                usar_pix_proprio: profData.usar_pix_proprio
              });
            }
          }
        }

        // E. Dados de contato do Salão
        if (configSalaoContext?.nome) {
          setDadosSalao({
            nome: configSalaoContext.nome || 'Sheila Santos Nails',
            proprietaria: configSalaoContext.proprietaria || 'Sheila Santos',
            telefone: (configSalaoContext.telefone || '3597141856').replace(/\D/g, ''),
            endereco: configSalaoContext.endereco || 'Rua Coronel Gabriel Penha de Paiva, 699 - Vila Paiva, Varginha - MG',
            instagram: configSalaoContext.instagram || '@sheilasantos_nails',
            chave_pix: configSalaoContext.chave_pix || '',
            instrucoes_pix: configSalaoContext.instrucoes_pix || '',
            regra_devolucao_sinal: configSalaoContext.regra_devolucao_sinal || REGRA_DEVOLUCAO_PADRAO,
            cancelamento_limite_horas: configSalaoContext.regras?.cancelamento_limite_horas || 24,
            meta_whatsapp: configSalaoContext.meta_whatsapp
          });
        } else {
          const { data: configData } = await supabase
            .from('configuracoes')
            .select('config_salao, equipe')
            .eq('id', 'salao_principal')
            .maybeSingle();
          if (configData?.config_salao && isMounted) {
            const cs = configData.config_salao;
            setDadosSalao({
              nome: cs.nome || 'Sheila Santos Nails',
              proprietaria: cs.proprietaria || 'Sheila Santos',
              telefone: (cs.telefone || '3597141856').replace(/\D/g, ''),
              endereco: cs.endereco || 'Rua Coronel Gabriel Penha de Paiva, 699 - Vila Paiva, Varginha - MG',
              instagram: cs.instagram || '@sheilasantos_nails',
              chave_pix: cs.chave_pix || '',
              instrucoes_pix: cs.instrucoes_pix || '',
              regra_devolucao_sinal: cs.regra_devolucao_sinal || REGRA_DEVOLUCAO_PADRAO,
              cancelamento_limite_horas: cs.regras?.cancelamento_limite_horas || 24,
              meta_whatsapp: cs.meta_whatsapp
            });

            // Fallback para dados da equipe salvos em configuracoes
            const equipeSalva = cs.equipe || (configData as any).equipe;
            if (Array.isArray(equipeSalva) && agendamentoData.profissional_id) {
              const profSalvo = equipeSalva.find((item: any) => item.id === agendamentoData.profissional_id);
              if (profSalvo) {
                if (profSalvo.nome) setProfissionalNome(profSalvo.nome);
                setDadosProfissional({
                  id: profSalvo.id,
                  nome: profSalvo.nome,
                  telefone: profSalvo.telefone,
                  chave_pix: profSalvo.chave_pix,
                  usar_pix_proprio: profSalvo.usar_pix_proprio
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar confirmação:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    carregarDados();

    // 1. Inscrição Realtime no Supabase para refletir alterações instantaneamente
    const canal = supabase
      .channel(`public_agendamento_${agendamentoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'agendamentos',
        filter: `id=eq.${agendamentoId}`
      }, (payload: any) => {
        if (payload.new && isMounted) {
          setAgendamento(prev => prev ? { ...prev, ...payload.new } : payload.new);
        }
      })
      .subscribe();

    // 2. Ouvinte BroadcastChannel entre abas (comunicação instantânea 0ms)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('nail_agenda_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'STATUS_UPDATED') {
            const { id, status, canceladoPor, motivo } = event.data;
            if (id && id.toLowerCase() === agendamentoId.toLowerCase()) {
              setAgendamento(prev => prev ? {
                ...prev,
                status: status as any,
                ...(canceladoPor ? { cancelado_por: canceladoPor } : {}),
                ...(motivo ? { motivo_cancelamento: motivo } : {})
              } : null);
            }
          }
        };
      }
    } catch (err) {}

    // 3. Ouvinte de retorno do usuário para a aba (re-sincroniza do banco na nuvem)
    const handleReSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .maybeSingle()
          .then(({ data }) => {
            if (data && isMounted) {
              setAgendamento(prev => prev ? { ...prev, ...data } : data);
            }
          });
      }
    };
    window.addEventListener('focus', handleReSync);
    document.addEventListener('visibilitychange', handleReSync);

    // 4. Polling contínuo leve a cada 10 segundos enquanto aguarda
    const pollInterval = setInterval(() => {
      supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && isMounted) {
            setAgendamento(prev => prev ? { ...prev, ...data } : data);
          }
        });
    }, 10000);

    return () => {
      isMounted = false;
      supabase.removeChannel(canal);
      bc?.close();
      window.removeEventListener('focus', handleReSync);
      document.removeEventListener('visibilitychange', handleReSync);
      clearInterval(pollInterval);
    };
  }, [agendamentoId]);

  // Ação: Confirmar Presença
  const handleConfirmarPresenca = async () => {
    if (!agendamento) return;
    setProcessandoAcao(true);

    try {
      await atualizarStatusAgendamentoSupabase(agendamento.id, 'confirmado', undefined, undefined, 'cliente');
      
      // Atualiza estado local no contexto caso esteja aberto no mesmo app
      if (updateAgendamentoStatus) {
        updateAgendamentoStatus(agendamento.id, 'confirmado', undefined, undefined, 'cliente');
      }

      setAgendamento(prev => prev ? { ...prev, status: 'confirmado' } : null);
      setMensagemSucesso('🎉 Presença confirmada com sucesso! Seu horário está 100% garantido.');

      // Notifica a profissional via WhatsApp (Meta Cloud API) e BroadcastChannel
      try {
        const telDest = dadosProfissional?.telefone ? dadosProfissional.telefone.replace(/\D/g, '') : dadosSalao.telefone;
        const dataFormatada = new Date(agendamento.inicio).toLocaleDateString('pt-BR');
        const horaFormatada = agendamento.inicio.split('T')[1].substring(0, 5);
        const textoNotif = `🔔 *Notificação do App Sheila Nails*\n\n✅ A cliente *${cliente?.nome || 'Cliente'}* confirmou presença no agendamento #${agendamento.id} para *${dataFormatada} às ${horaFormatada}*!\n\n👉 O status foi atualizado para "Confirmado" no sistema.`;
        if (telDest) {
          enviarMensagemTextoMeta(telDest, textoNotif, dadosSalao.meta_whatsapp).catch(() => {});
        }
      } catch (err) {}

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('nail_agenda_sync');
          bc.postMessage({
            type: 'CLIENTE_ACAO',
            notificacao: {
              tipo: 'confirmacao',
              titulo: 'Presença Confirmada! ✅',
              mensagem: `A cliente ${cliente?.nome || 'Cliente'} confirmou presença para o dia ${new Date(agendamento.inicio).toLocaleDateString('pt-BR')}.`,
              detalhes: `Horário #${agendamento.id}`,
              agendamentoId: agendamento.id
            }
          });
          bc.close();
        }
      } catch (err) {}
    } catch (e) {
      console.error('Erro ao confirmar:', e);
      alert('Não foi possível confirmar no momento. Por favor, tente novamente ou entre em contato pelo WhatsApp.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Ação: Cancelar Presença
  const handleConfirmarCancelamento = async () => {
    if (!agendamento) return;
    setProcessandoAcao(true);

    const motivoFinal = motivoSelecionado === 'Outro' && motivoPersonalizado.trim()
      ? motivoPersonalizado.trim()
      : motivoSelecionado;

    try {
      await atualizarStatusAgendamentoSupabase(agendamento.id, 'cancelado', 'cliente', motivoFinal);

      if (cancelAgendamento) {
        cancelAgendamento(agendamento.id, motivoFinal, 'cliente');
      }

      setAgendamento(prev => prev ? { 
        ...prev, 
        status: 'cancelado', 
        cancelado_por: 'cliente',
        motivo_cancelamento: motivoFinal 
      } : null);

      setModalCancelarAberto(false);
      setMensagemSucesso('Seu cancelamento foi registrado com sucesso. Agradecemos pelo aviso!');

      // Notifica a profissional via WhatsApp (Meta Cloud API) e BroadcastChannel
      try {
        const telDest = dadosProfissional?.telefone ? dadosProfissional.telefone.replace(/\D/g, '') : dadosSalao.telefone;
        const dataFormatada = new Date(agendamento.inicio).toLocaleDateString('pt-BR');
        const horaFormatada = agendamento.inicio.split('T')[1].substring(0, 5);
        const textoNotif = `🔔 *Notificação do App Sheila Nails*\n\n❌ A cliente *${cliente?.nome || 'Cliente'}* cancelou o agendamento #${agendamento.id} do dia *${dataFormatada} às ${horaFormatada}*.\nMotivo: ${motivoFinal}\n\n👉 O horário foi liberado no app.`;
        if (telDest) {
          enviarMensagemTextoMeta(telDest, textoNotif, dadosSalao.meta_whatsapp).catch(() => {});
        }
      } catch (err) {}

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('nail_agenda_sync');
          bc.postMessage({
            type: 'CLIENTE_ACAO',
            notificacao: {
              tipo: 'cancelamento',
              titulo: 'Horário Cancelado ❌',
              mensagem: `A cliente ${cliente?.nome || 'Cliente'} cancelou o agendamento #${agendamento.id}.`,
              detalhes: `Motivo: ${motivoFinal}`,
              agendamentoId: agendamento.id
            }
          });
          bc.close();
        }
      } catch (err) {}
    } catch (e) {
      console.error('Erro ao cancelar:', e);
      alert('Não foi possível registrar o cancelamento. Por favor, avise-nos pelo WhatsApp.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Formatadores de data e hora
  const formatarDataCompleta = (dataIso?: string) => {
    if (!dataIso) return '';
    const d = new Date(dataIso);
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    return `${diasSemana[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const formatarHorario = (dataIso?: string) => {
    if (!dataIso) return '';
    const partes = dataIso.split('T');
    if (partes[1]) {
      return partes[1].substring(0, 5);
    }
    const d = new Date(dataIso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const servicosTexto = servicos.map(s => s.nome).join(' + ') || 'Atendimento Personalizado de Unhas';
  const duracaoTotal = servicos.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) || 60;
  const valorTotalExibicao = agendamento?.valor_total || servicos.reduce((acc, s) => acc + (s.preco || 0), 0);

  // Link do Google Agenda
  const linkGoogleCalendar = agendamento ? gerarLinkGoogleCalendar({
    titulo: `✨ Unhas no ${dadosSalao.nome}`,
    dataInicioIso: agendamento.inicio,
    duracaoMinutos: duracaoTotal,
    descricao: `Procedimento: ${servicosTexto}\nProfissional: ${profissionalNome}\nSalão: ${dadosSalao.nome}\nTelefone: ${dadosSalao.telefone}`,
    local: dadosSalao.endereco
  }) : '#';

  // Chave Pix e destinatário dinâmicos
  const usarPixProf = !!(dadosProfissional?.usar_pix_proprio && dadosProfissional?.chave_pix?.trim());
  const chavePixParaPagamento = usarPixProf
    ? dadosProfissional!.chave_pix!.trim()
    : (dadosSalao.chave_pix || dadosSalao.telefone);
  const titularPixParaPagamento = usarPixProf
    ? (dadosProfissional!.nome || profissionalNome || 'Profissional')
    : (dadosSalao.proprietaria || 'Sheila Santos');
  const telefoneDestinatario = (usarPixProf && dadosProfissional?.telefone)
    ? dadosProfissional.telefone.replace(/\D/g, '')
    : dadosSalao.telefone;
  const nomeDestinatario = usarPixProf
    ? (dadosProfissional!.nome || profissionalNome || 'Sheila')
    : (dadosSalao.proprietaria || 'Sheila');

  // Link do WhatsApp com mensagem pronta
  const linkWhatsAppSalao = agendamento ? gerarLinkWhatsApp(
    telefoneDestinatario,
    `Olá, ${nomeDestinatario}! Meu nome é ${cliente?.nome || 'Cliente'} (Agendamento #${agendamento.id}). Gostaria de tirar uma dúvida sobre meu horário de ${formatarDataCompleta(agendamento.inicio)} às ${formatarHorario(agendamento.inicio)}.`
  ) : gerarLinkWhatsApp(dadosSalao.telefone, 'Olá! Gostaria de tirar uma dúvida sobre atendimento.');

  const handleCopiarPix = () => {
    if (!chavePixParaPagamento) return;
    try {
      navigator.clipboard.writeText(chavePixParaPagamento);
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2500);
    } catch (e) {
      console.error('Falha ao copiar Pix:', e);
    }
  };

  // Link para envio de comprovante via WhatsApp quando houver sinal
  const linkComprovanteWhatsApp = agendamento ? gerarLinkWhatsApp(
    telefoneDestinatario,
    `Olá, ${nomeDestinatario}! ✨ Segue o comprovante do sinal de ${formatarMoeda(agendamento.valor_sinal)} referente ao meu agendamento #${agendamento.id} para ${formatarDataCompleta(agendamento.inicio)} às ${formatarHorario(agendamento.inicio)}.`
  ) : '#';

  // Link para Google Maps
  const linkGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dadosSalao.endereco)}`;

  // TELA DE CARREGAMENTO
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-3 border-2 border-[#FCE4EC] overflow-hidden shadow-md p-0.5 animate-pulse">
          <img 
            src="./logo.png?v=3" 
            alt="Sheila Santos Nails" 
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <h2 className="text-base font-serif font-bold text-[#5A4535]">Carregando agendamento...</h2>
        <p className="text-xs text-[#8C7A6B] mt-1">Conectando ao sistema Sheila Santos Nails</p>
      </div>
    );
  }

  // TELA DE AGENDAMENTO NÃO ENCONTRADO
  if (!agendamento) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#EFECE6] shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto border-2 border-[#FCE4EC] overflow-hidden shadow-sm p-0.5">
            <img 
              src="./logo.png?v=3" 
              alt="Sheila Santos Nails" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#5A4535]">Agendamento não encontrado</h2>
            <p className="text-xs text-[#8C7A6B] mt-2 leading-relaxed">
              O link de confirmação pode estar incorreto, expirado ou o agendamento não consta mais em nossa base.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <a 
              href={getBookingUrl()}
              className="w-full py-3 px-4 rounded-xl bg-[#8C6D58] hover:bg-[#725743] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <CalendarIcon size={15} />
              <span>Ver Horários Disponíveis para Agendar</span>
            </a>
            <a 
              href={linkWhatsAppSalao}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-white border border-[#EFECE6] hover:border-[#8C6D58] text-[#5A4535] font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} className="text-emerald-600" />
              <span>Falar no WhatsApp do Salão</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmado = agendamento.status === 'confirmado';
  const isCancelado = agendamento.status === 'cancelado';
  const isPendente = agendamento.status === 'pendente';
  const isConcluido = agendamento.status === 'concluido';
  const temSinal = (agendamento.valor_sinal || 0) > 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2D] py-6 sm:py-10 px-4 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-4">
        
        {/* CABEÇALHO DO SALÃO */}
        <div className="text-center space-y-1.5 pb-2">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-2 border-2 border-[#FCE4EC] overflow-hidden shadow-md p-0.5">
            <img 
              src="./logo.png?v=3" 
              alt={dadosSalao.nome || "Sheila Santos Nails Designer"} 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-2xl font-serif text-[#D48B70] font-bold';
                  span.innerText = 'SS';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#5A4535] tracking-tight">
            {dadosSalao.nome}
          </h1>
          <p className="text-xs text-[#8C7A6B] font-medium">
            Confirmação de Atendimento Exclusivo
          </p>
        </div>

        {/* FEEDBACK DE SUCESSO TEMPORÁRIO */}
        {mensagemSucesso && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{mensagemSucesso}</span>
            </div>
          </div>
        )}

        {/* CARD PRINCIPAL COM STATUS */}
        <div className="bg-white rounded-3xl p-6 border border-[#EFECE6] shadow-sm space-y-5">
          
          {/* BADGE DE STATUS */}
          <div className="flex items-center justify-between border-b border-[#FAF9F6] pb-4">
            <div>
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                Agendamento #{agendamento.id}
              </span>
              <h2 className="text-sm font-bold text-[#5A4535] mt-0.5">
                Olá, {cliente?.nome ? cliente.nome.split(' ')[0] : 'Cliente'}! ✨
              </h2>
            </div>

            <div>
              {isConfirmado && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Presença Confirmada
                </span>
              )}
              {isPendente && (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                  <Clock size={14} className="text-amber-600" />
                  {temSinal ? 'Aguardando Pagamento do Sinal' : 'Aguardando Confirmação'}
                </span>
              )}
              {isCancelado && (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-full text-xs font-bold">
                  <XCircle size={14} className="text-rose-600" />
                  Horário Cancelado
                </span>
              )}
              {isConcluido && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full text-xs font-bold">
                  <ShieldCheck size={14} className="text-blue-600" />
                  Atendimento Concluído
                </span>
              )}
            </div>
          </div>

          {/* DETALHES DE DATA E HORA EM DESTAQUE */}
          <div className="bg-gradient-to-br from-[#FAF8F5] to-[#F5ECE5] border border-[#E8DEC9] rounded-2xl p-4.5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EFECE6] flex items-center justify-center text-[#8C6D58] shrink-0 shadow-2xs">
                <CalendarIcon size={20} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wide">Data Marcada</span>
                <p className="text-sm font-bold text-[#5A4535] capitalize">
                  {formatarDataCompleta(agendamento.inicio)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-[#E8DEC9]/50">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EFECE6] flex items-center justify-center text-[#8C6D58] shrink-0 shadow-2xs">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wide">Horário de Início</span>
                <p className="text-sm font-bold text-[#5A4535]">
                  {formatarHorario(agendamento.inicio)} <span className="text-xs font-normal text-[#8C7A6B]">({duracaoTotal} minutos estimados)</span>
                </p>
              </div>
            </div>
          </div>

          {/* SERVIÇOS E PROFISSIONAL */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start justify-between text-xs">
              <span className="text-[#8C7A6B] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#8C6D58]" />
                Procedimento(s):
              </span>
              <span className="font-bold text-[#5A4535] text-right max-w-[65%]">
                {servicosTexto}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8C7A6B] flex items-center gap-1.5">
                <User size={14} className="text-[#8C6D58]" />
                Profissional:
              </span>
              <span className="font-bold text-[#5A4535]">
                {profissionalNome}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#FAF9F6]">
              <span className="text-[#8C7A6B]">Valor Estimado:</span>
              <span className="font-bold text-sm text-[#5A4535]">
                {formatarMoeda(valorTotalExibicao)}
              </span>
            </div>

            {agendamento.valor_sinal > 0 && (
              <div className="flex items-center justify-between text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                <span className="font-semibold">Sinal de Reserva:</span>
                <span className="font-bold">
                  {formatarMoeda(agendamento.valor_sinal)}
                  {isConfirmado && <span className="ml-1.5 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Pago</span>}
                </span>
              </div>
            )}
          </div>

          {/* BOTÕES PRINCIPAIS DE AÇÃO */}
          <div className="pt-3 space-y-3">
            {isPendente && (
              <>
                {temSinal ? (
                  /* FLUXO COM SINAL: O CLIENTE NÃO CONFIRMA DIRETAMENTE; PAGA O SINAL E ENVIA O COMPROVANTE */
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <Clock size={16} className="text-amber-600 shrink-0" />
                        <span>Para garantir seu horário, efetue o sinal</span>
                      </div>
                      
                      <p className="text-[11px] text-amber-900/90 leading-relaxed">
                        Faça a transferência do sinal de <strong className="text-amber-950 font-bold">{formatarMoeda(agendamento.valor_sinal)}</strong> via Pix e envie o comprovante pelo botão abaixo para confirmarmos sua vaga no sistema:
                      </p>

                      {chavePixParaPagamento && (
                        <div className="bg-white p-3 rounded-xl border border-amber-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">Chave Pix:</span>
                            <span className="text-[10px] font-semibold text-[#8C6D58]">
                              {titularPixParaPagamento} {usarPixProf ? '(Profissional)' : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 bg-[#FAF8F5] p-2 rounded-lg border border-[#EFECE6]">
                            <code className="text-xs font-mono font-bold text-[#5A4535] select-all break-all">
                              {chavePixParaPagamento}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopiarPix}
                              className="shrink-0 px-2.5 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                              title="Copiar Chave Pix"
                            >
                              {pixCopiado ? (
                                <>
                                  <Check size={13} className="text-emerald-300" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                          {dadosSalao.instrucoes_pix && (
                            <p className="text-[10px] text-[#8C7A6B] italic">
                              {dadosSalao.instrucoes_pix}
                            </p>
                          )}
                          <div className="pt-2 border-t border-amber-200/60 text-[10px] text-amber-900 leading-relaxed">
                            <span className="font-bold text-amber-950 block mb-0.5">📌 Política de Devolução do Sinal:</span>
                            {(dadosSalao.regra_devolucao_sinal || REGRA_DEVOLUCAO_PADRAO).replace('{horas}', String(dadosSalao.cancelamento_limite_horas || 24))}
                          </div>
                        </div>
                      )}

                      <a
                        href={linkComprovanteWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          try {
                            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                              const bc = new BroadcastChannel('nail_agenda_sync');
                              bc.postMessage({
                                type: 'CLIENTE_ACAO',
                                notificacao: {
                                  tipo: 'pagamento_sinal',
                                  titulo: 'Comprovante Pix Informado! 💵',
                                  mensagem: `A cliente ${cliente?.nome || 'Cliente'} enviou o comprovante do sinal de R$ ${agendamento.valor_sinal}.`,
                                  detalhes: `Agendamento #${agendamento.id}`,
                                  agendamentoId: agendamento.id
                                }
                              });
                              bc.close();
                            }
                          } catch (err) {}
                        }}
                        className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        <span>Enviar Comprovante pelo WhatsApp</span>
                      </a>

                      <p className="text-[10px] text-center text-amber-800/80">
                        Após você enviar o comprovante, Sheila confirmará seu horário e este painel será atualizado automaticamente! ✨
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalCancelarAberto(true)}
                      disabled={processandoAcao}
                      className="w-full py-2.5 px-4 bg-white hover:bg-rose-50 border border-[#EFECE6] hover:border-rose-300 text-[#8C7A6B] hover:text-rose-700 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} />
                      <span>Não Poderei Comparecer (Liberar Vaga)</span>
                    </button>
                  </div>
                ) : (
                  /* FLUXO SEM SINAL: O CLIENTE CONFIRMA DIRETAMENTE EM 1 TOQUE */
                  <>
                    <button
                      type="button"
                      onClick={handleConfirmarPresenca}
                      disabled={processandoAcao}
                      className="w-full py-3.5 px-4 bg-[#8C6D58] hover:bg-[#725743] active:scale-[0.99] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-[#8C6D58]/20 flex items-center justify-center gap-2"
                    >
                      {processandoAcao ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          <span>Confirmando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>✅ Confirmar Minha Presença</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalCancelarAberto(true)}
                      disabled={processandoAcao}
                      className="w-full py-2.5 px-4 bg-white hover:bg-rose-50 border border-[#EFECE6] hover:border-rose-300 text-[#8C7A6B] hover:text-rose-700 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} />
                      <span>Não Poderei Comparecer</span>
                    </button>
                  </>
                )}
              </>
            )}

            {isConfirmado && (
              <div className="space-y-2.5 animate-in fade-in duration-300">
                <a
                  href={linkGoogleCalendar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-white border border-[#EFECE6] hover:border-[#8C6D58] text-[#5A4535] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
                >
                  <CalendarPlus size={16} className="text-[#8C6D58]" />
                  <span>Adicionar à Minha Agenda (Google / Celular)</span>
                </a>

                <button
                  type="button"
                  onClick={() => setModalCancelarAberto(true)}
                  className="w-full py-2 px-4 text-[#8C7A6B] hover:text-rose-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <span>Precisa cancelar ou remarcar? Toque aqui</span>
                </button>
              </div>
            )}

            {isCancelado && (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-300">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed">
                  <p className="font-bold mb-0.5">Seu horário foi liberado com sucesso.</p>
                  <p className="text-[11px] text-rose-800">
                    Quando desejar um novo momento de autocuidado, estaremos de portas abertas para te receber!
                  </p>
                </div>

                <a
                  href={getBookingUrl()}
                  className="w-full py-3 px-4 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CalendarIcon size={15} />
                  <span>Escolher Novo Horário Online</span>
                </a>
              </div>
            )}
          </div>

          {/* LOCALIZAÇÃO E CONTATO DO SALÃO */}
          <div className="pt-4 border-t border-[#EFECE6] space-y-2.5 text-xs text-[#8C7A6B]">
            <a 
              href={linkGoogleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors border border-transparent hover:border-[#EFECE6] group"
            >
              <MapPin size={16} className="text-[#8C6D58] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-[#5A4535] group-hover:text-[#8C6D58] transition-colors block">
                  Endereço do Salão
                </span>
                <span className="text-[11px] leading-snug block">
                  {dadosSalao.endereco}
                </span>
                <span className="text-[10px] text-[#8C6D58] font-semibold mt-0.5 inline-flex items-center gap-1">
                  Abrir no Google Maps <ExternalLink size={10} />
                </span>
              </div>
            </a>

            <a 
              href={linkWhatsAppSalao}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 text-emerald-900 transition-colors"
            >
              <span className="flex items-center gap-2 font-bold text-xs">
                <MessageCircle size={16} className="text-emerald-600" />
                Dúvidas? Fale com Sheila no WhatsApp
              </span>
              <ChevronRight size={14} className="text-emerald-600" />
            </a>
          </div>

        </div>

        {/* RODAPÉ DISCRETO */}
        <div className="text-center pt-2 pb-6 space-y-2">
          <p className="text-[11px] text-[#8C7A6B] flex items-center justify-center gap-1">
            <span>Desenvolvido com carinho para clientes</span>
            <Heart size={12} className="text-[#8C6D58] fill-[#8C6D58]" />
          </p>
          <div>
            <a 
              href="#admin" 
              className="text-[10px] text-[#A69B91] hover:text-[#5A4535] transition-colors"
            >
              Acesso Profissional / Área da Equipe
            </a>
          </div>
        </div>

      </div>

      {/* MODAL DE CANCELAMENTO COM MOTIVO AMIGÁVEL */}
      {modalCancelarAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#EFECE6]">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 mb-2">
                <XCircle size={24} />
              </div>
              <h3 className="font-serif font-bold text-base text-[#5A4535]">
                Deseja cancelar o horário?
              </h3>
              <p className="text-xs text-[#8C7A6B]">
                Compreendemos que imprevistos acontecem. Se puder, nos conte o motivo para podermos melhorar nosso atendimento:
              </p>
            </div>

            <div className="space-y-2">
              {[
                'Imprevisto pessoal ou profissional',
                'Problema de saúde ou indisposição',
                'Desejo remarcar para outra data',
                'Outro'
              ].map((motivo) => (
                <label 
                  key={motivo}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    motivoSelecionado === motivo 
                      ? 'border-[#8C6D58] bg-[#F6ECE8]/50 text-[#5A4535] font-bold' 
                      : 'border-[#EFECE6] bg-white text-[#8C7A6B] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo_cancelamento_opcao"
                    checked={motivoSelecionado === motivo}
                    onChange={() => setMotivoSelecionado(motivo)}
                    className="accent-[#8C6D58]"
                  />
                  <span>{motivo}</span>
                </label>
              ))}

              {motivoSelecionado === 'Outro' && (
                <textarea
                  rows={2}
                  value={motivoPersonalizado}
                  onChange={(e) => setMotivoPersonalizado(e.target.value)}
                  placeholder="Conte brevemente o motivo..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[#EFECE6] focus:border-[#8C6D58] outline-none resize-none text-[#5A4535]"
                />
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmarCancelamento}
                disabled={processandoAcao}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {processandoAcao ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <span>Sim, Confirmar Cancelamento</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalCancelarAberto(false)}
                disabled={processandoAcao}
                className="w-full py-2 px-4 bg-white border border-[#EFECE6] hover:bg-[#FAF9F6] text-[#8C7A6B] font-semibold text-xs rounded-xl transition-colors"
              >
                Voltar (Manter Meu Horário)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
