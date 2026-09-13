import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  DollarSign, 
  Copy,
  Heart,
  Users,
  RotateCcw,
  MessageCircle,
  Crown
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico, Cliente } from '../types';
import { enviarMensagemTextoMeta } from '../services/metaWhatsApp';
import { enviarMensagemWhatsAppQrCode } from '../services/qrCodeWhatsApp';
import { gerarLinkWhatsApp, getConfirmationUrl } from '../utils/urlHelper';
import { 
  detectarGeneroPorNome, 
  obterGeneroEfetivo, 
  formatarTratamentoGenero 
} from '../utils/generoHelper';
import { 
  enviarNotificacaoRealtimeMultiDispositivos,
  salvarClienteSupabase,
  salvarAgendamentoSupabase,
  salvarListaEsperaSupabase
} from '../services/supabase';
import { dispararNotificacaoBarraStatus } from '../services/notificacoesMobile';
import { 
  obterServicosIdsSessaoVip, 
  calcularDuracaoSessaoVip, 
  obterTextoResumoSessoesVip, 
  obterTodasProfissionaisDosServicos,
  obterConfiguracaoSessaoVip,
  obterProfissionaisDoPlanoVip
} from '../utils/planoVipHelper';

interface PublicBookingProps {
  setIsAdmin: (isAdmin: boolean) => void;
  clientePreselecionado?: { id: string; nome: string; telefone: string } | null;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ setIsAdmin, clientePreselecionado }) => {
  const { 
    servicos, 
    addAgendamento, 
    addCliente, 
    updateCliente,
    addListaEspera,
    clientes, 
    configSalao,
    obterProximoHorarioLivre,
    checkConflitoHorario,
    equipe,
    logout,
    planosAssinatura,
    vincularAssinaturaCliente
  } = useAppState();

  const [step, setStep] = useState<number>(1);
  const stepRef = useRef<number>(1);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Navegação protegida que sincroniza com o histórico do navegador móvel
  const irParaStep = (novoStep: number) => {
    setStep(novoStep);
    try {
      window.history.pushState({ nailStep: novoStep }, '');
    } catch (e) {}
  };
  
  // Responde ao botão voltar físico / virtual do Android e gestos nativos
  useEffect(() => {
    const recuarStep = (e?: Event) => {
      const cur = stepRef.current;
      if (cur > 1) {
        if (e && e.cancelable) {
          e.preventDefault(); // Informa ao App.tsx que a ação de voltar foi consumida e NÃO deve minimizar
        }
        if (cur === 5 || cur === 7) setStep(1);
        else if (cur === 6) setStep(3); // Fecha a lista de espera e retorna para o calendário (Etapa 3)
        else if (cur === 4) setStep(3); // Retorna da confirmação para a escolha de horário
        else if (cur === 3) setStep(2); // Retorna do horário para os serviços
        else if (cur === 2) setStep(1); // Retorna dos serviços para os dados da cliente
        else setStep(1);
      }
    };

    const handleAndroidBack = (e: Event) => {
      recuarStep(e);
    };

    const handlePopState = () => {
      recuarStep();
    };

    window.addEventListener('nail_android_back', handleAndroidBack);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('nail_android_back', handleAndroidBack);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  
  // Agendamento State
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>(() => {
    try {
      const fullUrl = (typeof window !== 'undefined') ? (window.location.hash + window.location.search) : '';
      const match = fullUrl.match(/[?&]servico=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1])
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }
    } catch (e) {}
    return [];
  });
  const [dataSelecionada, setDataSelecionada] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');

  // Seleção de Plano VIP pelo Cliente
  const [planoVipEscolhidoId, setPlanoVipEscolhidoId] = useState<string>(() => {
    try {
      const fullUrl = (typeof window !== 'undefined') ? (window.location.hash + window.location.search) : '';
      const match = fullUrl.match(/[?&](?:plano_vip|plano)=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim();
      }
    } catch (e) {}
    return '';
  });
  const [subTabStep2, setSubTabStep2] = useState<'servicos' | 'planos_vip'>(() => {
    try {
      const fullUrl = (typeof window !== 'undefined') ? (window.location.hash + window.location.search) : '';
      if (fullUrl.includes('plano_vip=') || fullUrl.includes('plano=')) {
        return 'planos_vip';
      }
    } catch (e) {}
    return 'servicos';
  });

  const planoVipEscolhido = useMemo(() => {
    if (!planoVipEscolhidoId) return null;
    return (planosAssinatura || []).find(p => p.id === planoVipEscolhidoId) || null;
  }, [planoVipEscolhidoId, planosAssinatura]);

  // Se o cliente acessou diretamente com um Plano VIP pré-selecionado, sincroniza os serviços da 1ª sessão se vazio
  useEffect(() => {
    if (planoVipEscolhido && servicosSelecionados.length === 0) {
      const sIds = obterServicosIdsSessaoVip(planoVipEscolhido, 1, servicos);
      if (sIds.length > 0) {
        setServicosSelecionados(sIds);
      } else if (servicos.length > 0) {
        setServicosSelecionados([servicos[0].id]);
      }
    }
  }, [planoVipEscolhido, servicos, servicosSelecionados.length]);

  // Reage a alterações dinâmicas de hash enquanto o agendamento já estiver ativo
  useEffect(() => {
    const handleSyncHash = () => {
      try {
        const fullUrl = (typeof window !== 'undefined') ? (window.location.hash + window.location.search) : '';
        const matchServico = fullUrl.match(/[?&]servico=([^&]+)/);
        if (matchServico && matchServico[1]) {
          const sIds = decodeURIComponent(matchServico[1]).split(',').map(s => s.trim()).filter(Boolean);
          if (sIds.length > 0) {
            setServicosSelecionados(sIds);
            setSubTabStep2('servicos');
          }
        }
        const matchPlano = fullUrl.match(/[?&](?:plano_vip|plano)=([^&]+)/);
        if (matchPlano && matchPlano[1]) {
          const pId = decodeURIComponent(matchPlano[1]).trim();
          if (pId) {
            setPlanoVipEscolhidoId(pId);
            setSubTabStep2('planos_vip');
          }
        }
      } catch (e) {}
    };
    window.addEventListener('hashchange', handleSyncHash);
    return () => window.removeEventListener('hashchange', handleSyncHash);
  }, []);

  // Profissional Selecionada
  const [profissionalId, setProfissionalId] = useState<string>(''); // Vazio = Qualquer profissional disponível
  const profissionaisAtivas = (equipe || []).filter(e => e.ativo !== false);
  const profissionaisAptas = useMemo(() => {
    if (planoVipEscolhido) {
      const profsDoPlano = obterProfissionaisDoPlanoVip(planoVipEscolhido, equipe);
      const aptasVip = profissionaisAtivas.filter(p => profsDoPlano.includes(p.id));
      if (aptasVip.length > 0) return aptasVip;
    }
    if (servicosSelecionados.length === 0) return profissionaisAtivas;
    const aptas = profissionaisAtivas.filter(p => {
      if (p.perfil === 'admin') return true;
      if (!p.servicos_habilitados || p.servicos_habilitados.length === 0) return true;
      return servicosSelecionados.every(sId => p.servicos_habilitados!.includes(sId));
    });
    return aptas.length > 0 ? aptas : profissionaisAtivas;
  }, [profissionaisAtivas, servicosSelecionados, planoVipEscolhido, equipe]);

  const profissionaisParaSelecaoStep1 = useMemo(() => {
    if (!planoVipEscolhido) return profissionaisAtivas;
    const profsDoPlano = obterProfissionaisDoPlanoVip(planoVipEscolhido, equipe);
    const filtradas = profissionaisAtivas.filter(p => profsDoPlano.includes(p.id));
    return filtradas.length > 0 ? filtradas : profissionaisAtivas;
  }, [planoVipEscolhido, profissionaisAtivas, equipe]);
  
  // Cliente State
  const [nome, setNome] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [sexo, setSexo] = useState<'feminino' | 'masculino'>('feminino');
  const [sexoModificadoManualmente, setSexoModificadoManualmente] = useState<boolean>(false);
  const [clienteIdentificado, setClienteIdentificado] = useState<Cliente | null>(null);
  const [observacoes, setObservacoes] = useState<string>('');

  // Sincroniza cliente pré-selecionado se fornecido por props
  useEffect(() => {
    if (clientePreselecionado) {
      if (clientePreselecionado.nome) setNome(clientePreselecionado.nome);
      if (clientePreselecionado.telefone) setTelefone(clientePreselecionado.telefone);
      const telDigits = (clientePreselecionado.telefone || '').replace(/\D/g, '');
      const cli = clientes.find(c => c.id === clientePreselecionado.id || (telDigits.length >= 8 && c.telefone.replace(/\D/g, '').endsWith(telDigits.slice(-8))));
      if (cli) {
        setClienteIdentificado(cli);
        const cliSexo = cli.sexo || cli.preferencias?.sexo;
        if (cliSexo === 'masculino' || cliSexo === 'feminino') {
          setSexo(cliSexo);
        } else {
          const gen = detectarGeneroPorNome(cli.nome || clientePreselecionado.nome);
          if (gen) setSexo(gen);
        }
      } else {
        const gen = detectarGeneroPorNome(clientePreselecionado.nome);
        if (gen) setSexo(gen);
      }
    }
  }, [clientePreselecionado, clientes]);
  
  // Lista de Espera State
  const [periodoPreferido, setPeriodoPreferido] = useState<'manha' | 'tarde' | 'noite' | 'qualquer'>('qualquer');
  const [errorWaitlist, setErrorWaitlist] = useState<string>('');
  
  // Tela Final
  const [codigoReserva, setCodigoReserva] = useState<string>('');
  const [valorSinal, setValorSinal] = useState<number>(0);
  const [valorTotal, setValorTotal] = useState<number>(0);
  const [profissionalConfirmadaId, setProfissionalConfirmadaId] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const profEfetiva = (equipe || []).find(e => e.id === (profissionalConfirmadaId || profissionalId));
  const usarPixProfissional = !!(profEfetiva?.usar_pix_proprio && profEfetiva?.chave_pix?.trim());
  const chavePixAtiva = usarPixProfissional ? profEfetiva!.chave_pix!.trim() : configSalao.chave_pix;
  const titularPixAtivo = usarPixProfissional ? profEfetiva!.nome : (configSalao.proprietaria || 'Sheila Santos');
  const telefoneWhatsAppAtivo = (usarPixProfissional && profEfetiva?.telefone) ? profEfetiva.telefone.replace(/\D/g, '') : configSalao.telefone;

  const profSelecionada = equipe.find(e => e.id === profissionalId);
  const servsDisponiveis = useMemo(() => {
    return servicos.filter(s => {
      if (!s.ativo) return false;
      if (!profSelecionada) return true;
      if (profSelecionada.perfil === 'admin') return true;
      if (!profSelecionada.servicos_habilitados || profSelecionada.servicos_habilitados.length === 0) {
        return true;
      }
      return profSelecionada.servicos_habilitados.includes(s.id);
    });
  }, [servicos, profSelecionada]);

  // Planos VIP disponíveis para a profissional selecionada (ou todos se nenhuma estiver selecionada)
  const planosDisponiveis = useMemo(() => {
    return (planosAssinatura || []).filter(p => {
      if (p.ativo === false) return false;
      if (!profSelecionada) return true;
      const profsDoPlano = obterProfissionaisDoPlanoVip(p, equipe);
      return profsDoPlano.includes(profSelecionada.id);
    });
  }, [planosAssinatura, profSelecionada, equipe]);

  // Se a profissional selecionada não atender a planos VIP, garante que a aba permaneça em 'servicos'
  useEffect(() => {
    if (subTabStep2 === 'planos_vip' && planosDisponiveis.length === 0) {
      setSubTabStep2('servicos');
      setPlanoVipEscolhidoId('');
    }
  }, [subTabStep2, planosDisponiveis.length]);

  // Duração e Preço Totais
  const duracaoTotal = useMemo(() => {
    if (planoVipEscolhido) {
      const durS1 = calcularDuracaoSessaoVip(planoVipEscolhido, 1, servicos);
      if (durS1 > 0) return durS1;
      return 60;
    }
    return servicosSelecionados.reduce((acc, id) => {
      const s = servicos.find(item => item.id === id);
      return acc + (s?.duracao_minutos || 0);
    }, 0);
  }, [planoVipEscolhido, servicosSelecionados, servicos]);

  const precoTotal = useMemo(() => {
    if (planoVipEscolhido) {
      return planoVipEscolhido.preco_mensal;
    }
    return servicosSelecionados.reduce((acc, id) => {
      const s = servicos.find(item => item.id === id);
      return acc + (s?.preco || 0);
    }, 0);
  }, [planoVipEscolhido, servicosSelecionados, servicos]);

  // Sinal Exigido (se for Plano VIP, o sinal é isento)
  const sinalTotal = useMemo(() => {
    if (planoVipEscolhido) return 0;
    return servicosSelecionados.reduce((acc, id) => {
      const s = servicos.find(item => item.id === id);
      if (!s) return acc;
      if (s.sinal_tipo === 'fixo') return acc + s.sinal_valor;
      if (s.sinal_tipo === 'porcentagem') return acc + (s.preco * s.sinal_valor / 100);
      return acc;
    }, 0);
  }, [planoVipEscolhido, servicosSelecionados, servicos]);

  // Formatação amigável de minutos para exibição (ex: "2h (120 min)", "1h 30min (90 min)")
  const formatarDuracaoMinutos = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min (${min} min)`;
    if (h > 0) return `${h}h (${min} min)`;
    return `${min} min`;
  };

  const calcularHorarioFinal = (inicioStr: string, duracaoMin: number) => {
    if (!inicioStr) return '';
    const [h, m] = inicioStr.split(':').map(Number);
    const totalM = (h || 0) * 60 + (m || 0) + duracaoMin;
    const hF = String(Math.floor(totalM / 60)).padStart(2, '0');
    const mF = String(totalM % 60).padStart(2, '0');
    return `${hF}:${mF}`;
  };

  // Detalhamento discriminado das sessões do Plano VIP (1ª sessão e próximas sessões)
  const detalhesSessoesPlano = useMemo(() => {
    if (!planoVipEscolhido) return null;
    const totalSessoes = planoVipEscolhido.qtd_procedimentos_mes || 4;
    const listaSessoes: {
      sessao: number;
      procedimentos: string;
      duracao: number;
    }[] = [];

    for (let s = 1; s <= totalSessoes; s++) {
      const procs = obterConfiguracaoSessaoVip(planoVipEscolhido, s, servicos);
      const dur = calcularDuracaoSessaoVip(planoVipEscolhido, s, servicos);
      const nomes = procs.map(p => p.nome_servico).join(' + ') || 'Procedimento VIP';
      listaSessoes.push({
        sessao: s,
        procedimentos: nomes,
        duracao: dur > 0 ? dur : 60
      });
    }

    const sessao1 = listaSessoes[0] || { sessao: 1, procedimentos: 'Atendimento VIP', duracao: 60 };
    const proximasSessoes = listaSessoes.slice(1);

    // Agrupamento inteligente das próximas sessões por procedimento e duração idênticos
    const mapa = new Map<string, { sessoes: number[]; procedimentos: string; duracao: number }>();
    proximasSessoes.forEach(s => {
      const chave = `${s.procedimentos}___${s.duracao}`;
      if (!mapa.has(chave)) {
        mapa.set(chave, { sessoes: [s.sessao], procedimentos: s.procedimentos, duracao: s.duracao });
      } else {
        mapa.get(chave)!.sessoes.push(s.sessao);
      }
    });

    const gruposProximas = Array.from(mapa.values()).map(g => {
      const sessoesTexto = g.sessoes.length === 1
        ? `Sessão ${g.sessoes[0]}`
        : `Sessões ${g.sessoes.slice(0, -1).join(', ')} e ${g.sessoes[g.sessoes.length - 1]}`;
      return {
        titulo: sessoesTexto,
        sessoes: g.sessoes,
        procedimentos: g.procedimentos,
        duracao: g.duracao
      };
    });

    return {
      sessao1,
      proximasSessoes,
      gruposProximas,
      totalSessoes
    };
  }, [planoVipEscolhido, servicos]);

  // Cálculo inteligente de horários disponíveis para o dia selecionado
  const obterHorariosDisponiveis = (): string[] => {
    const diaSemana = new Date(dataSelecionada + 'T12:00:00').getDay();
    const expediente = configSalao.horarios_trabalho[diaSemana];

    if (!expediente || !expediente.ativo) return [];

    const [hInicio, mInicio] = expediente.inicio.split(':').map(Number);
    const [hFim, mFim] = expediente.fim.split(':').map(Number);
    
    const inicioMinutos = hInicio * 60 + mInicio;
    const fimMinutos = hFim * 60 + mFim;
    
    const slots: string[] = [];

    const agora = new Date();
    const anoH = agora.getFullYear();
    const mesH = String(agora.getMonth() + 1).padStart(2, '0');
    const diaH = String(agora.getDate()).padStart(2, '0');
    const hojeStr = `${anoH}-${mesH}-${diaH}`;
    const isHoje = dataSelecionada === hojeStr;
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
    const antecedenciaMinutos = configSalao.regras?.antecedencia_minima_minutos ?? 30;
    const corteMinutos = agoraMinutos + antecedenciaMinutos;

    for (let min = inicioMinutos; min <= fimMinutos - duracaoTotal; min += 30) {
      if (isHoje && min < corteMinutos) {
        continue; // Não disponibiliza horários que já passaram ou dentro da margem de antecedência
      }

      const hStr = String(Math.floor(min / 60)).padStart(2, '0');
      const mStr = String(min % 60).padStart(2, '0');
      const slot = `${hStr}:${mStr}`;
      
      const inicioAgend = `${dataSelecionada}T${hStr}:${mStr}:00`;
      const dateInicio = new Date(inicioAgend);
      const dateFim = new Date(dateInicio.getTime() + duracaoTotal * 60 * 1000);
      const anoF = dateFim.getFullYear();
      const mesF = String(dateFim.getMonth() + 1).padStart(2, '0');
      const diaF = String(dateFim.getDate()).padStart(2, '0');
      const horaF = String(dateFim.getHours()).padStart(2, '0');
      const minF = String(dateFim.getMinutes()).padStart(2, '0');
      const segF = String(dateFim.getSeconds()).padStart(2, '0');
      const fimAgend = `${anoF}-${mesF}-${diaF}T${horaF}:${minF}:${segF}`;

      // Verifica se o serviço requer múltiplas profissionais (ex: Manicure + Pedicure 2 Profissionais)
      const todasProfsNecessarias = obterTodasProfissionaisDosServicos(
        servicosSelecionados,
        servicos,
        equipe,
        profissionalId || undefined
      );

      // Verifica se há vaga para a profissional selecionada ou se todas as profissionais necessárias estão livres
      let temVaga = false;
      if (todasProfsNecessarias.length > 1) {
        temVaga = todasProfsNecessarias.every(pId => !checkConflitoHorario(inicioAgend, fimAgend, pId));
      } else if (profissionalId) {
        if (planoVipEscolhido && !profissionaisAptas.some(p => p.id === profissionalId)) {
          temVaga = profissionaisAptas.some(p => !checkConflitoHorario(inicioAgend, fimAgend, p.id));
        } else {
          temVaga = !checkConflitoHorario(inicioAgend, fimAgend, profissionalId);
        }
      } else {
        temVaga = profissionaisAptas.length === 0 
          ? !checkConflitoHorario(inicioAgend, fimAgend, 'u1')
          : profissionaisAptas.some(p => !checkConflitoHorario(inicioAgend, fimAgend, p.id));
      }

      if (temVaga) {
        slots.push(slot);
      }
    }

    return slots;
  };

  const horariosDisponiveis = obterHorariosDisponiveis();

  // Finalizar Agendamento
  const handleFinalizarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) return;

    // 1. Identificar ou Cadastrar Cliente
    const telDigits = telefone.replace(/\D/g, '');
    const cliExistente = clientes.find(c => {
      const cDigits = c.telefone.replace(/\D/g, '');
      return cDigits === telDigits || (telDigits.length >= 8 && cDigits.endsWith(telDigits.slice(-8)));
    });
    const isClienteNovo = !cliExistente;

    const sexoFinal = obterGeneroEfetivo({
      sexoInformado: sexo,
      sexoClienteExistente: cliExistente?.sexo || cliExistente?.preferencias?.sexo,
      sexoModificadoManualmente,
      nome,
      fallback: 'feminino'
    });

    let cId = '';
    let clienteParaSalvar: any = undefined;
    if (cliExistente) {
      cId = cliExistente.id;
      if (cliExistente.sexo !== sexoFinal) {
        cliExistente.sexo = sexoFinal;
        updateCliente(cId, { sexo: sexoFinal, preferencias: { ...(cliExistente.preferencias || {}), sexo: sexoFinal } });
      }
      clienteParaSalvar = cliExistente;
    } else {
      const novoCli = addCliente({
        nome,
        telefone,
        sexo: sexoFinal,
        preferencias: { sexo: sexoFinal },
        consentimento_imagem: true
      });
      cId = novoCli.id;
      clienteParaSalvar = novoCli;
      // Garante persistência imediata do cliente no Supabase antes de criar agendamento
      await salvarClienteSupabase(novoCli);
    }

    // Distinção clara: contratação de novo Plano VIP vs cliente assinante VIP agendando serviço avulso
    const isContratandoVip = !!planoVipEscolhido;
    const isAssinanteVip = !!(cliExistente?.assinatura && cliExistente.assinatura.status === 'ativo');

    // Se o cliente escolheu um plano VIP nesta sessão:
    if (isContratandoVip && planoVipEscolhido) {
      vincularAssinaturaCliente(cId, planoVipEscolhido.id);
    }

    // Regras de Cobrança do Sinal:
    const cobrarTodos = !!configSalao.regras?.sinal_obrigatorio_todos;
    const cobrarNovos = !!(configSalao.regras?.sinal_obrigatorio_novos ?? configSalao.regras?.sinal_obrigatorio_geral ?? true);

    let deveCobrarSinal = false;
    if (isContratandoVip || isAssinanteVip) {
      // Clientes do Clube VIP ou novas contratações VIP são isentas de sinal Pix online
      deveCobrarSinal = false;
    } else if (cobrarTodos) {
      deveCobrarSinal = true;
    } else if (cobrarNovos && isClienteNovo) {
      deveCobrarSinal = true;
    }

    // Cálculo do valor do sinal
    let valorSinalFinal = 0;
    if (deveCobrarSinal) {
      const somaServs = servicosSelecionados.reduce((acc, id) => {
        const s = servicos.find(item => item.id === id);
        if (!s) return acc;
        if (s.sinal_tipo === 'fixo') return acc + (s.sinal_valor || 0);
        if (s.sinal_tipo === 'porcentagem') return acc + (s.preco * (s.sinal_valor || 0) / 100);
        return acc;
      }, 0);

      // Se os serviços somaram > 0 usa esse valor, senão usa o sinal_padrao das configurações (ou 15)
      valorSinalFinal = somaServs > 0 ? somaServs : (configSalao.regras?.sinal_padrao || 15);
    }

    const statusFinal = valorSinalFinal > 0 ? 'pendente' : 'confirmado';

    // 2. Definir Profissional Atendente
    const dataInicioStr = `${dataSelecionada}T${horarioSelecionado}:00`;
    const dateInicio = new Date(dataInicioStr);
    const dateFim = new Date(dateInicio.getTime() + duracaoTotal * 60 * 1000);
    const anoF = dateFim.getFullYear();
    const mesF = String(dateFim.getMonth() + 1).padStart(2, '0');
    const diaF = String(dateFim.getDate()).padStart(2, '0');
    const horaF = String(dateFim.getHours()).padStart(2, '0');
    const minF = String(dateFim.getMinutes()).padStart(2, '0');
    const segF = String(dateFim.getSeconds()).padStart(2, '0');
    const dataFimStr = `${anoF}-${mesF}-${diaF}T${horaF}:${minF}:${segF}`;

    let profFinalId = profissionalId;
    if (planoVipEscolhido) {
      const profsDoPlano = obterProfissionaisDoPlanoVip(planoVipEscolhido, equipe);
      if (!profFinalId || !profsDoPlano.includes(profFinalId)) {
        const livre = profissionaisAptas.find(p => !checkConflitoHorario(dataInicioStr, dataFimStr, p.id));
        profFinalId = livre ? livre.id : (profsDoPlano[0] || 'u1');
      }
    } else if (!profFinalId) {
      const livre = profissionaisAptas.find(p => !checkConflitoHorario(dataInicioStr, dataFimStr, p.id));
      profFinalId = livre ? livre.id : (profissionaisAptas[0]?.id || 'u1');
    }

    const profNome = equipe.find(p => p.id === profFinalId)?.nome || profissionaisAptas.find(p => p.id === profFinalId)?.nome || 'Sheila Santos';
    const idPlanoEfetivo = isContratandoVip ? (planoVipEscolhido?.id || undefined) : undefined;
    const tagPlanoId = idPlanoEfetivo ? ` [PLANO_ID:${idPlanoEfetivo}]` : '';
    const nomePlanoVip = planoVipEscolhido?.nome || 'Clube VIP';
    const obsVip = isContratandoVip 
      ? `[👑 Adesão Clube VIP: ${nomePlanoVip}${tagPlanoId}] ` 
      : (isAssinanteVip ? `[Cliente VIP com serviço avulso] ` : '');
    const obsComProf = `${obsVip}[Atendente: ${profNome}]${observacoes ? ' ' + observacoes : ''}`;

    const precoPlanoVip = Number(planoVipEscolhido?.preco_mensal) || 0;
    const valorTotalParaSalvar = isContratandoVip ? (precoPlanoVip > 0 ? precoPlanoVip : precoTotal) : precoTotal;

    const res = addAgendamento({
      cliente_id: cId,
      profissional_id: profFinalId,
      inicio: dataInicioStr,
      status: statusFinal,
      valor_total: valorTotalParaSalvar,
      valor_sinal: valorSinalFinal,
      pago_com_clube: isContratandoVip,
      plano_id: isContratandoVip ? idPlanoEfetivo : undefined,
      observacoes: obsComProf,
      origem: 'cliente'
    }, servicosSelecionados, undefined, isContratandoVip ? (planoVipEscolhidoId || undefined) : undefined);

    if (res.success && res.agendamento) {
      // Garante persistência no Supabase com integridade referencial antes de mudar de etapa
      await salvarAgendamentoSupabase(res.agendamento, servicosSelecionados, clienteParaSalvar);

      setCodigoReserva(res.agendamento.id);
      setValorSinal(valorSinalFinal);
      setValorTotal(valorTotalParaSalvar);
      setProfissionalConfirmadaId(profFinalId);
      setStep(5);

      const dataFmt = formatarDataLocal(dataSelecionada);
      const servsText = servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean).join(' + ');

      // Notifica a profissional via WhatsApp (Meta API ou QR Code) e BroadcastChannel
      try {
        const profFinalObj = equipe.find(e => e.id === profFinalId);
        const telDest = profFinalObj?.telefone || profSelecionada?.telefone || configSalao.telefone;
        const tratamento = formatarTratamentoGenero(sexoFinal, nome);
        const artigo = tratamento.artigo;
        const msgProf = `🔔 *Novo Agendamento Online!*\n\nOlá! ${artigo} *${nome}* acabou de agendar *${servsText}* para o dia *${dataFmt} às ${horarioSelecionado}*.\n\nStatus: ${valorSinalFinal > 0 ? 'Aguardando pagamento do sinal Pix' : 'Confirmado'}\nCódigo: #${res.agendamento.id}\n\n👉 Acesse o app para conferir!`;

        // 1. Envio via Meta Cloud API Oficial
        if (telDest && configSalao?.meta_whatsapp?.ativo) {
          enviarMensagemTextoMeta(telDest, msgProf, configSalao?.meta_whatsapp).catch(() => {});
        }

        // 2. Envio via WhatsApp QR Code (Z-API / Evolution API)
        const cfgQr = configSalao?.qrcode_whatsapp;
        if (cfgQr?.ativo !== false) {
          const telProfissional = cfgQr?.numeroAlertaProfissional || telDest;
          if (telProfissional && cfgQr?.notificarProfissionalAoAgendar !== false) {
            enviarMensagemWhatsAppQrCode(telProfissional, msgProf, cfgQr).catch(() => {});
          }
          if (telefone && cfgQr?.notificarClienteAoAgendar !== false) {
            const saudacaoCliente = tratamento.isMasc ? 'seja bem-vindo' : 'seja bem-vinda';
            const msgCliente = `💅 Olá *${nome}*, ${saudacaoCliente}! Seu agendamento foi registrado com sucesso!\n\n📅 *Data:* ${dataFmt} às ${horarioSelecionado}\n💅 *Serviços:* ${servsText}\n💰 *Total:* ${formatarMoeda(precoTotal)}\n\nAgradecemos a preferência!`;
            enviarMensagemWhatsAppQrCode(telefone, msgCliente, cfgQr).catch(() => {});
          }
        }
      } catch (err) {}

      // Dispara notificação em tempo real para todos os celulares e aparelhos conectados à nuvem
      enviarNotificacaoRealtimeMultiDispositivos({
        tipo: 'agendamento',
        titulo: 'Novo Agendamento Recebido! 💅',
        mensagem: `${nome} agendou para ${dataFmt} às ${horarioSelecionado}.`,
        detalhes: `Código #${res.agendamento.id} • ${valorSinalFinal > 0 ? 'Aguardando sinal Pix' : 'Confirmado'}`,
        agendamentoId: res.agendamento.id,
        clienteId: cId,
        clienteNome: nome
      });

      // Dispara notificação na barra de status / notification tray do aparelho
      dispararNotificacaoBarraStatus(
        'Novo Agendamento Registrado! 💅',
        `${nome} agendou para ${dataFmt} às ${horarioSelecionado}.`,
        isContratandoVip ? `Plano VIP: ${planoVipEscolhido.nome}` : `${servsText} • ${formatarMoeda(precoTotal)}`,
        res.agendamento.id
      ).catch(() => {});
    }
  };

  // Finalizar Lista de Espera
  const handleFinalizarListaEspera = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWaitlist('');

    if (!nome || !telefone) {
      setErrorWaitlist('Preencha seu nome e telefone.');
      return;
    }

    let cId = '';
    let clienteParaSalvar: any = undefined;
    const telDigits = telefone.replace(/\D/g, '');
    const cliExistente = clientes.find(c => {
      const cDigits = c.telefone.replace(/\D/g, '');
      return cDigits === telDigits || (telDigits.length >= 8 && cDigits.endsWith(telDigits.slice(-8)));
    });

    const sexoFinal = obterGeneroEfetivo({
      sexoInformado: sexo,
      sexoClienteExistente: cliExistente?.sexo || cliExistente?.preferencias?.sexo,
      sexoModificadoManualmente,
      nome,
      fallback: 'feminino'
    });

    if (cliExistente) {
      cId = cliExistente.id;
      if (cliExistente.sexo !== sexoFinal) {
        cliExistente.sexo = sexoFinal;
        updateCliente(cId, { sexo: sexoFinal, preferencias: { ...(cliExistente.preferencias || {}), sexo: sexoFinal } });
      }
      clienteParaSalvar = cliExistente;
    } else {
      const novoCli = addCliente({
        nome,
        telefone,
        sexo: sexoFinal,
        preferencias: { sexo: sexoFinal },
        consentimento_imagem: true
      });
      cId = novoCli.id;
      clienteParaSalvar = novoCli;
      // Garante persistência imediata do cliente antes de registrar na fila
      await salvarClienteSupabase(novoCli);
    }

    // Adiciona na lista de espera
    const waitlistItem = addListaEspera({
      cliente_id: cId,
      servico_id: servicosSelecionados[0] || 's1', // Vincula ao primeiro serviço selecionado
      profissional_id: profissionalId || undefined,
      data_preferida: dataSelecionada,
      periodo_preferido: periodoPreferido
    });

    // Garante persistência no Supabase com integridade referencial
    await salvarListaEsperaSupabase(waitlistItem, clienteParaSalvar);

    // Notifica a profissional via WhatsApp (Meta API ou QR Code) e BroadcastChannel
    try {
      const profEspera = equipe.find(e => e.id === profissionalId);
      const telDest = profEspera?.telefone || configSalao.telefone;
      const dataFmt = formatarDataLocal(dataSelecionada);
      const tratamento = formatarTratamentoGenero(sexoFinal, nome);
      const artigo = tratamento.artigo;
      const msgProf = `🔔 *Nova Inscrição na Lista de Espera!*\n\nOlá! ${artigo} *${nome}* (${telefone}) acabou de entrar na fila de espera para o dia *${dataFmt}* (${periodoPreferido === 'qualquer' ? 'qualquer período' : periodoPreferido}).\n\n👉 Acesse o app para conferir!`;
      if (telDest) {
        if (configSalao?.meta_whatsapp?.ativo) {
          enviarMensagemTextoMeta(telDest, msgProf, configSalao?.meta_whatsapp).catch(() => {});
        }
        const cfgQr = configSalao?.qrcode_whatsapp;
        if (cfgQr?.ativo !== false) {
          const telProfissional = cfgQr?.numeroAlertaProfissional || telDest;
          if (telProfissional && cfgQr?.notificarProfissionalAoAgendar !== false) {
            enviarMensagemWhatsAppQrCode(telProfissional, msgProf, cfgQr).catch(() => {});
          }
        }
      }
    } catch (err) {}

    // Dispara notificação em tempo real para todos os celulares e aparelhos conectados à nuvem
    enviarNotificacaoRealtimeMultiDispositivos({
      tipo: 'espera',
      titulo: 'Nova Inscrição na Lista de Espera ⏳',
      mensagem: `${nome} entrou na fila para ${formatarDataLocal(dataSelecionada)}.`,
      detalhes: `Período: ${periodoPreferido === 'qualquer' ? 'Qualquer' : periodoPreferido}`,
      listaEsperaId: waitlistItem?.id,
      clienteId: cId,
      clienteNome: nome
    });

    setStep(7);
  };

  const handleCopiarPix = () => {
    if (!chavePixAtiva) return;
    navigator.clipboard.writeText(chavePixAtiva);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const formatarDataLocal = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between pb-12 font-sans relative overflow-hidden"
      style={{ backgroundImage: "url('bg_nail.jpg')" }}
    >
      
      {/* Background Pink/Rose overlay to ensure premium branding and readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5F7]/40 via-[#FFEBEF]/55 to-[#FAD0DC]/70 backdrop-blur-[1px] pointer-events-none" />

      {/* Decorative ambient glowing circles */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-[#FFD1DC] opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-[#E57399] opacity-20 blur-3xl pointer-events-none" />

      {/* Barra de Identificação Superior da Cliente */}
      <div className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white px-4 py-2 flex justify-center items-center text-xs relative z-20 shadow-sm">
        <span className="flex items-center gap-1.5 font-semibold">
          <Heart size={12} className="fill-white animate-pulse" />
          <span>Agendamento Online · {configSalao.nome || 'Salão de Beleza'}</span>
        </span>
      </div>

      {/* Conteúdo Principal do Fluxo */}
      <main className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-[#FAD0DC]/50 rounded-3xl p-6 shadow-xl mt-6 mx-4 relative z-10">
        
        {/* Header da Marca (Updated container background to match the black logo) */}
        <div className="text-center mb-6 border-b border-[#FFF0F4] pb-4">
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-white border-2 border-[#FCE4EC] mx-auto flex items-center justify-center mb-3 overflow-hidden shadow-lg p-0.5">
            <img 
              src="./logo.png?v=3" 
              alt={`Logo ${configSalao.nome || 'Salão de Beleza'}`} 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-2xl font-serif text-[#D48B70] font-extrabold';
                  span.innerText = 'SS';
                  parent.appendChild(span);
                }
              }}
            />
          </div>
          <h2 className="font-serif font-extrabold text-2xl text-[#5A3F45] tracking-wide">{configSalao.nome}</h2>
          <p className="text-xs text-[#A88690] mt-1 font-medium">{configSalao.endereco}</p>
        </div>

        {/* STEP 1: ESCOLHA DA PROFISSIONAL */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="font-serif font-bold text-base text-[#5A3F45]">Escolha a Profissional</h3>
              <p className="text-xs text-[#A88690] mt-0.5">Selecione quem irá realizar o seu atendimento</p>
            </div>

            {/* Banner de Procedimento Pré-selecionado pelo Catálogo */}
            {servicosSelecionados.length > 0 && !planoVipEscolhido && (
              <div className="bg-gradient-to-r from-[#FFF0F4] to-[#FCE4EC] border border-[#FAD0DC] rounded-2xl p-3 flex items-center justify-between text-xs text-[#5A3F45] shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#C71585] shadow-xs shrink-0">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-[#C71585] block text-[10px] uppercase tracking-wider">Procedimento Selecionado:</span>
                    <span className="font-semibold text-xs text-[#5A3F45]">
                      {servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean).join(' + ')}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-[#C71585] text-xs block">
                    {formatarMoeda(precoTotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => irParaStep(2)}
                    className="text-[10px] text-[#A88690] hover:text-[#C71585] underline"
                  >
                    Trocar
                  </button>
                </div>
              </div>
            )}

            {/* Banner de Plano VIP Pré-selecionado pelo Catálogo */}
            {planoVipEscolhido && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-950 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
                    <Crown size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 block text-[10px] uppercase tracking-wider">Plano VIP Selecionado:</span>
                    <span className="font-semibold text-xs text-amber-900">{planoVipEscolhido.nome}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-amber-900 text-xs block">
                    {formatarMoeda(planoVipEscolhido.preco_mensal)}/mês
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSubTabStep2('planos_vip');
                      irParaStep(2);
                    }}
                    className="text-[10px] text-amber-700 hover:text-amber-900 underline"
                  >
                    Trocar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Opção Qualquer Profissional */}
              <button
                type="button"
                onClick={() => {
                  setProfissionalId('');
                  setHorarioSelecionado('');
                }}
                className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                  profissionalId === ''
                    ? 'bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white border-[#DB7093] shadow-md'
                    : 'bg-white border-[#F2C2D0] text-[#5A3F45] hover:border-[#DB7093] shadow-xs hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    profissionalId === '' ? 'bg-white/20 text-white' : 'bg-[#FFF0F4] text-[#DB7093]'
                  }`}>
                    🌟
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Qualquer Profissional Disponível</h4>
                    <p className={`text-[10px] mt-0.5 ${profissionalId === '' ? 'text-pink-100' : 'text-[#A88690]'}`}>
                      Maior flexibilidade e horários livres
                    </p>
                  </div>
                </div>
                {profissionalId === '' && <Check size={18} className="text-white shrink-0" />}
              </button>

              {/* Lista das Profissionais da Equipe */}
              {profissionaisParaSelecaoStep1.map(p => {
                const isSelected = profissionalId === p.id;
                const totalProcedimentos = p.servicos_habilitados?.length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProfissionalId(p.id);
                      setHorarioSelecionado('');
                      if (planoVipEscolhido) {
                        const profsDoPlano = obterProfissionaisDoPlanoVip(planoVipEscolhido, equipe);
                        if (!profsDoPlano.includes(p.id)) {
                          setPlanoVipEscolhidoId('');
                        }
                      }
                    }}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white border-[#DB7093] shadow-md'
                        : 'bg-white border-[#F2C2D0] text-[#5A3F45] hover:border-[#DB7093] shadow-xs hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#FFF0F4] text-[#DB7093]'
                      }`}>
                        💅
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">{p.nome}</h4>
                        <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-pink-100' : 'text-[#A88690]'}`}>
                          {p.especialidade || (p.perfil === 'admin' ? 'Especialista Master' : 'Designer')} · {totalProcedimentos ? `${totalProcedimentos} procedimentos` : 'Todos os procedimentos'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check size={18} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                if (servicosSelecionados.length > 0 || planoVipEscolhidoId) {
                  irParaStep(3);
                } else {
                  irParaStep(2);
                }
              }}
              className="w-full mt-4 bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>
                {(servicosSelecionados.length > 0 || planoVipEscolhidoId)
                  ? 'Confirmar Profissional & Escolher Horário'
                  : 'Continuar para Escolha dos Serviços'}
              </span>
              <ChevronRight size={14} />
            </button>

            {(servicosSelecionados.length > 0 || planoVipEscolhidoId) && (
              <button
                type="button"
                onClick={() => irParaStep(2)}
                className="w-full text-center text-[11px] text-[#A88690] hover:text-[#DB7093] font-medium py-1 transition-colors"
              >
                Deseja adicionar outros serviços ou trocar? Clique aqui
              </button>
            )}
          </div>
        )}

        {/* STEP 2: SELEÇÃO DE SERVIÇOS (Filtrados pela profissional escolhida) */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#FAD0DC]/50 pb-3 mb-2">
              <button type="button" onClick={() => setStep(1)} className="p-1 rounded-full hover:bg-[#FFF0F4]/30 text-[#A88690]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Selecione os Serviços</h3>
                <p className="text-xs text-[#A88690] mt-0.5">
                  Atendente: <strong className="text-[#C71585]">{profSelecionada ? profSelecionada.nome : 'Qualquer Profissional'}</strong>
                </p>
              </div>
            </div>

            {/* Banner de Feedback do Serviço Selecionado */}
            {servicosSelecionados.length > 0 && subTabStep2 === 'servicos' && (
              <div className="bg-[#FFF0F4] border border-[#FAD0DC] rounded-xl p-2.5 flex items-center justify-between text-xs text-[#5A3F45]">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#C71585] shrink-0" />
                  <span className="font-medium text-[11px]">
                    Procedimento selecionado: <strong className="text-[#C71585]">{servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean).join(' + ')}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Seletor entre Procedimentos Avulsos e Planos do Clube VIP */}
            {planosDisponiveis.length > 0 && (
              <div className="flex bg-[#FFF0F4] p-1.5 rounded-2xl border-2 border-[#F7CFD9] mb-3 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSubTabStep2('servicos');
                    setPlanoVipEscolhidoId('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    subTabStep2 === 'servicos'
                      ? 'bg-white text-[#C71585] shadow-sm border border-[#FAD0DC]'
                      : 'text-[#8C7A6B] hover:text-[#5A3F45]'
                  }`}
                >
                  <span>💅 Procedimentos & Combos</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubTabStep2('planos_vip');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    subTabStep2 === 'planos_vip'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                      : 'text-amber-800 hover:text-amber-950 font-bold'
                  }`}
                >
                  <Crown size={14} />
                  <span>👑 Planos do Clube VIP</span>
                </button>
              </div>
            )}

            {subTabStep2 === 'planos_vip' ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950 text-left space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <Crown size={16} className="text-amber-600" />
                    <span>Como funcionam os Planos VIP?</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Ao assinar um plano VIP, você garante atendimento com horários reservados automaticamente no mesmo dia da semana e horário conforme a frequência do plano, com isenção total de taxa de sinal online.
                  </p>
                </div>

                <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 p-0.5">
                  {planosDisponiveis.map(p => {
                    const isSelected = planoVipEscolhidoId === p.id;
                    const servicosInclusos = (p.itens_servicos || [])
                      .map(item => {
                        const s = servicos.find(serv => serv.id === item.servico_id);
                        return s ? `${item.quantidade || 1}x ${s.nome}` : null;
                      })
                      .filter(Boolean);
                    const resumo = obterTextoResumoSessoesVip(p, servicos);

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left space-y-3 relative ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#FFFDF7] via-amber-50/70 to-orange-50/50 border-amber-500 shadow-lg ring-2 ring-amber-400/60'
                            : 'bg-gradient-to-b from-[#FFFDF9] via-white to-[#FFFBF5] border-amber-300 hover:border-amber-500 shadow-[0_2px_10px_rgba(217,119,6,0.08)] hover:shadow-[0_4px_16px_rgba(217,119,6,0.15)]'
                        }`}
                      >
                        {/* Top Bar with Crown Badge, Title and Price */}
                        <div className="flex items-start justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                                <Crown size={11} /> Clube VIP
                              </span>
                              <h4 className="font-serif font-bold text-sm text-amber-950">{p.nome}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-[11px] text-amber-900 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200/80">
                                {p.qtd_procedimentos_mes} sessões no mês · {(() => {
                                  const f = p.frequencia_dias || 7;
                                  const fNorm = Math.max(7, Math.round(f / 7) * 7);
                                  if (fNorm === 14) return 'a cada 14 dias (quinzenal)';
                                  if (fNorm === 21) return 'a cada 3 semanas';
                                  if (fNorm === 28) return 'a cada 4 semanas (mensal)';
                                  return '1 por semana (semanal)';
                                })()}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-200/60 px-2 py-0.5 rounded-md border border-amber-300/80">
                                <Clock size={11} className="text-amber-700" /> {resumo.duracaoResumo}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 bg-amber-100/60 px-2.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="text-base font-extrabold text-amber-950 block leading-tight">
                              {formatarMoeda(p.preco_mensal)}
                            </span>
                            <span className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">/ mês</span>
                          </div>
                        </div>

                        {/* Detalhe da Duração por Sessão */}
                        {resumo.detalhePorSessao && resumo.detalhePorSessao.includes('•') && (
                          <div className="text-[10px] text-amber-900 bg-amber-50/90 px-2.5 py-1.5 rounded-xl border border-amber-200/80 font-medium leading-relaxed">
                            {resumo.detalhePorSessao}
                          </div>
                        )}

                        {/* Itens Inclusos */}
                        {servicosInclusos.length > 0 && (
                          <div className="bg-amber-50/50 rounded-xl p-2.5 text-[10px] text-amber-950 border border-amber-200/80 space-y-1.5">
                            <span className="font-bold text-amber-950 flex items-center gap-1">
                              <Sparkles size={11} className="text-amber-600" /> Procedimentos Inclusos no Ciclo:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {servicosInclusos.map((itemStr, idx) => (
                                <span key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-amber-200 font-semibold text-amber-900 shadow-2xs">
                                  ✓ {itemStr}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const profsDoPlano = obterProfissionaisDoPlanoVip(p, equipe);
                            const sIds = (p.itens_servicos || []).map(i => i.servico_id);
                            setPlanoVipEscolhidoId(p.id);
                            setServicosSelecionados(sIds.length > 0 ? sIds : (servicos.length > 0 ? [servicos[0].id] : []));
                            if (profissionalId && !profsDoPlano.includes(profissionalId)) {
                              setProfissionalId(profsDoPlano.length === 1 ? profsDoPlano[0] : '');
                            }
                            irParaStep(3);
                          }}
                          className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Crown size={14} />
                          <span>Selecionar este Plano & Agendar 1ª Sessão →</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 p-0.5">
                  {servsDisponiveis.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#A88690] bg-[#FFF5F7]/30 rounded-2xl border-2 border-[#FAD0DC]">
                      Nenhum procedimento cadastrado para esta profissional.
                    </div>
                  ) : (
                    servsDisponiveis.map(s => {
                      const checked = servicosSelecionados.includes(s.id);
                      const descLimpa = (s.descricao || '').replace(/<!--NAIL_META:[\s\S]*?-->/g, '').trim();
                      const detalhesPacote = s.is_pacote 
                        ? (s.servicos_pacote_detalhes || (s.servicos_pacote || []).map(id => ({ servico_id: id, quantidade: 1 })))
                        : [];

                      return (
                        <label 
                          key={s.id}
                          className={`relative flex items-start justify-between p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left ${
                            checked 
                              ? 'bg-gradient-to-r from-[#FFF0F4] via-[#FFF5F8] to-[#FCE4EC] border-[#DB7093] shadow-md ring-2 ring-[#DB7093]/20 text-[#5A3F45]' 
                              : 'bg-white border-[#F2C2D0] hover:border-[#DB7093] shadow-[0_2px_8px_rgba(219,112,147,0.06)] hover:shadow-[0_4px_14px_rgba(219,112,147,0.12)] text-[#5A3F45]'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input 
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setServicosSelecionados(prev => [...prev, s.id]);
                                } else {
                                  setServicosSelecionados(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded text-[#DB7093] focus:ring-[#DB7093] h-4 w-4 mt-1 border-2 border-[#DB7093]/50 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              {s.is_pacote && (
                                <div className="mb-1.5">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                                    <Sparkles size={10} /> Combo Especial
                                  </span>
                                </div>
                              )}
                              <span className="font-serif font-bold text-xs block text-[#4A2E35] leading-tight">{s.nome}</span>
                              {descLimpa && (
                                <span className="text-[10.5px] text-[#8C6B75] block mt-1 max-w-[270px] leading-relaxed italic">
                                  "{descLimpa}"
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] text-[#A88690]">
                                <Clock size={11} className="text-[#DB7093]" />
                                <span>Duração total: <strong className="text-[#5A3F45]">{s.duracao_minutos} min</strong></span>
                              </div>
                              
                              {/* Se for Pacote, detalha os serviços internos para o cliente */}
                              {s.is_pacote && detalhesPacote.length > 0 && (
                                <div className="mt-2.5 bg-gradient-to-br from-[#FFF5F8] to-[#FFF0F4] p-3 rounded-xl border-2 border-[#F8CAD7] shadow-xs space-y-2 max-w-[290px] text-[10px] text-[#5A3F45] text-left">
                                  <div className="flex items-center gap-1.5 font-bold text-[#C71585] border-b border-[#FAD0DC] pb-1">
                                    <Sparkles size={12} />
                                    <span>Composição do Combo:</span>
                                  </div>
                                  {detalhesPacote.map((det, idx) => {
                                    const sub = servicos.find(item => item.id === det.servico_id);
                                    const subDesc = sub ? (sub.descricao || '').replace(/<!--NAIL_META:[\s\S]*?-->/g, '').trim() : '';
                                    return sub ? (
                                      <div key={idx} className="flex flex-col pl-2 border-l-2 border-[#DB7093] py-0.5 space-y-0.5">
                                        <div className="flex justify-between font-bold text-[#5A3F45]">
                                          <span>{det.quantidade}x {sub.nome}</span>
                                        </div>
                                        {subDesc && (
                                          <span className="text-[8.5px] text-[#8C6B75] leading-snug italic">"{subDesc}"</span>
                                        )}
                                        <span className="text-[8.5px] text-[#C71585] font-semibold flex items-center gap-1">
                                          <span>⏱️ Retorno recomendado: a cada {sub.intervalo_manutencao_dias > 0 ? `${sub.intervalo_manutencao_dias} dias` : 'Não exige'}</span>
                                        </span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3 pt-0.5">
                            <span className="inline-block font-extrabold text-xs text-[#9E2A54] bg-[#FFF0F4] px-2.5 py-1 rounded-xl border border-[#F8C8D4] shadow-2xs">
                              {formatarMoeda(s.preco)}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Sumário */}
                {servicosSelecionados.length > 0 && (
                  <div className="bg-gradient-to-r from-[#FFF5F8] to-[#FFF0F4] p-3.5 rounded-2xl border-2 border-[#F7CFD9] text-xs text-[#5A3F45] space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8C6B75]">Duração Total:</span>
                      <span className="font-bold text-[#5A3F45] bg-white px-2 py-0.5 rounded-md border border-[#FAD0DC]">{duracaoTotal} minutos</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1.5 border-t border-[#FAD0DC]">
                      <span className="font-bold text-[#5A3F45]">Valor Total:</span>
                      <span className="font-extrabold text-base text-[#C71585]">{formatarMoeda(precoTotal)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => irParaStep(3)}
                  disabled={servicosSelecionados.length === 0}
                  className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Avançar para Data & Horário</span>
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 3: DATA E HORA */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3 mb-2">
              <button onClick={() => setStep(2)} className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Escolha a Data & Horário</h3>
                <p className="text-xs text-[#A88690] mt-0.5">
                  Profissional: <strong className="text-[#C71585]">{profSelecionada ? profSelecionada.nome : 'Qualquer Profissional'}</strong>
                </p>
              </div>
            </div>

            {/* Aviso de Recorrência do Plano VIP */}
            {planoVipEscolhido && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 text-left animate-in fade-in duration-200">
                <Crown size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950">1ª Sessão do Plano {planoVipEscolhido.nome}</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                    Escolha a data e o horário da sua 1ª sessão. As demais {planoVipEscolhido.qtd_procedimentos_mes - 1} semanas serão reservadas <strong>automaticamente no mesmo dia da semana e horário</strong>!
                  </p>
                </div>
              </div>
            )}

            {/* Input de Data */}
            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Selecione a Data</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-[#FFF5F7]/50">
                <CalendarIcon size={14} className="text-[#DB7093]" />
                <input 
                  type="date" 
                  min={new Date().toLocaleDateString('en-CA')}
                  value={dataSelecionada}
                  onChange={(e) => {
                    setDataSelecionada(e.target.value);
                    setHorarioSelecionado('');
                  }}
                  className="text-xs font-bold text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            {/* Grid de Horários Livres */}
            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-2">Horários Disponíveis</label>
              {horariosDisponiveis.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-[#C71585] bg-[#FFF0F4] p-3 rounded-xl border border-[#FAD0DC]/30 text-center font-medium">
                    {(() => {
                      const diaIdx = dataSelecionada ? new Date(dataSelecionada + 'T12:00:00').getDay() : -1;
                      const exp = diaIdx >= 0 ? configSalao.horarios_trabalho?.[diaIdx] : null;
                      const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                      if (exp && !exp.ativo) {
                        return `O salão não abre aos ${diasNomes[diaIdx]}s (Fechado). Por favor, escolha um dia útil em que atendemos ou entre na lista de espera.`;
                      }
                      return 'Sem horários livres nesta data para os serviços escolhidos.';
                    })()}
                  </p>
                  <button
                    type="button"
                    onClick={() => irParaStep(6)}
                    className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Users size={14} />
                    <span>Entrar na Lista de Espera</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {horariosDisponiveis.map(slot => {
                    const selected = horarioSelecionado === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setHorarioSelecionado(slot)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          selected 
                            ? 'bg-gradient-to-r from-[#DB7093] to-[#C71585] text-white shadow-sm' 
                            : 'bg-white border border-[#FAD0DC]/30 hover:bg-[#FFF0F4]/30 text-[#5A3F45]'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card de Resumo de Duração, Horário e Retorno */}
            {horarioSelecionado && (
              planoVipEscolhido && detalhesSessoesPlano ? (
                <div className="bg-[#FFF5F7] border border-[#FAD0DC] rounded-2xl p-4 space-y-3 shadow-sm text-left animate-in fade-in duration-200 mt-2">
                  <div className="flex items-center justify-between text-xs text-[#5A3F45] border-b border-[#FAD0DC]/60 pb-2">
                    <span className="flex items-center gap-1.5 font-bold text-amber-900 uppercase text-[10px]">
                      <Crown size={14} className="text-amber-600" />
                      Tempo e Duração do Atendimento • {planoVipEscolhido.nome}
                    </span>
                    <span className="font-extrabold text-[11px] text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      👑 {detalhesSessoesPlano.totalSessoes} Sessões no Mês
                    </span>
                  </div>

                  {/* Detalhamento das Sessões */}
                  <div className="space-y-2">
                    {/* 1ª Sessão (Data e Horário Selecionados) */}
                    <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                          📌 1ª Sessão (Data Selecionada)
                        </span>
                        <span className="font-extrabold text-xs text-amber-950">
                          ⏱️ {formatarDuracaoMinutos(detalhesSessoesPlano.sessao1.duracao)}
                        </span>
                      </div>
                      <div className="text-xs text-[#5A3F45] mt-1 space-y-0.5">
                        <p className="font-bold text-[#5A3F45]">{detalhesSessoesPlano.sessao1.procedimentos}</p>
                        <p className="text-[11px] text-[#8C7A6B]">
                          Horário marcado: <strong className="text-[#C71585]">{horarioSelecionado} às {calcularHorarioFinal(horarioSelecionado, detalhesSessoesPlano.sessao1.duracao)}</strong> ({formatarDataLocal(dataSelecionada)})
                        </p>
                      </div>
                    </div>

                    {/* Próximas Sessões */}
                    {detalhesSessoesPlano.gruposProximas.length > 0 && (
                      <div className="bg-gradient-to-r from-pink-50/70 to-rose-50/70 p-3 rounded-xl border border-[#FAD0DC]/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide bg-[#FFF0F4] text-[#C71585] px-2 py-0.5 rounded-full border border-[#FAD0DC]">
                            🔁 Próximas Sessões ({detalhesSessoesPlano.proximasSessoes.length} sessões restantes)
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {detalhesSessoesPlano.gruposProximas.map((g, idx) => (
                            <div key={idx} className="bg-white/90 p-2.5 rounded-lg border border-[#FAD0DC]/50 text-xs text-[#5A3F45]">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-[#5A3F45]">
                                  {g.titulo}: <span className="font-medium text-[#8C6D58]">{g.procedimentos}</span>
                                </span>
                                <span className="font-extrabold text-[#C71585] text-[11px] shrink-0">
                                  ⏱️ {formatarDuracaoMinutos(g.duracao)}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-[#8C7A6B] mt-0.5">
                                Horário previsto na agenda: <strong className="text-[#5A3F45]">{horarioSelecionado} às {calcularHorarioFinal(horarioSelecionado, g.duracao)}</strong>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Informação sobre a Frequência e Garantia de Vaga */}
                    <div className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px]">
                      <Crown size={14} className="text-amber-600 shrink-0" />
                      <p className="text-amber-900 leading-snug">
                        <strong>Horário VIP Garantido:</strong> {(() => {
                          const f = planoVipEscolhido.frequencia_dias || 7;
                          const fNorm = Math.max(7, Math.round(f / 7) * 7);
                          if (fNorm === 14) return 'Suas sessões ocorrem a cada 14 dias sempre no mesmo dia da semana e horário reservado.';
                          if (fNorm === 21) return 'Suas sessões ocorrem a cada 3 semanas sempre no mesmo dia da semana e horário reservado.';
                          if (fNorm === 28) return 'Suas sessões ocorrem a cada 4 semanas sempre no mesmo dia da semana e horário reservado.';
                          return 'Suas sessões ocorrem toda semana sempre no mesmo dia da semana e horário reservado.';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FFF5F7] border border-[#FAD0DC] rounded-2xl p-3.5 space-y-2.5 shadow-sm text-left animate-in fade-in duration-200 mt-2">
                  <div className="flex items-center justify-between text-xs text-[#5A3F45] border-b border-[#FAD0DC]/60 pb-2">
                    <span className="flex items-center gap-1.5 font-bold text-[#A88690] uppercase text-[10px]">
                      <Clock size={14} className="text-[#DB7093]" />
                      Tempo e Duração do Atendimento
                    </span>
                    <span className="font-extrabold text-[#C71585]">
                      {Math.floor(duracaoTotal / 60) > 0 ? `${Math.floor(duracaoTotal / 60)}h ` : ''}{duracaoTotal % 60 > 0 ? `${duracaoTotal % 60}min ` : ''}({duracaoTotal} min)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5A3F45]">
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#FAD0DC]/50">
                      <Clock size={14} className="text-[#DB7093] shrink-0" />
                      <div>
                        <span className="text-[#A88690] block text-[9px] uppercase font-bold">Horário de Atendimento</span>
                        <strong className="text-xs text-[#5A3F45]">
                          {horarioSelecionado} às {calcularHorarioFinal(horarioSelecionado, duracaoTotal)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#FAD0DC]/50">
                      <RotateCcw size={14} className="text-[#DB7093] shrink-0" />
                      <div>
                        <span className="text-[#A88690] block text-[9px] uppercase font-bold">Sugestão de Retorno</span>
                        <strong className="text-xs text-[#5A3F45]">
                          {(() => {
                            const diasRetornoArr = servicos
                              .filter(s => servicosSelecionados.includes(s.id))
                              .map(s => Number(s.intervalo_manutencao_dias || (s as any).retorno_dias) || 0)
                              .filter(d => d > 0);
                            const menorRetorno = diasRetornoArr.length > 0 ? Math.min(...diasRetornoArr) : 0;
                            if (menorRetorno > 0 && dataSelecionada) {
                              const d = new Date(dataSelecionada + 'T12:00:00');
                              d.setDate(d.getDate() + menorRetorno);
                              const diaF = String(d.getDate()).padStart(2, '0');
                              const mesF = String(d.getMonth() + 1).padStart(2, '0');
                              const anoF = d.getFullYear();
                              return `${menorRetorno} dias (${diaF}/${mesF}/${anoF})`;
                            }
                            return 'Não exige retorno';
                          })()}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {horariosDisponiveis.length > 0 && (
              <div className="space-y-3 mt-3">
                <button
                  onClick={() => irParaStep(4)}
                  disabled={!horarioSelecionado}
                  className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Avançar para Identificação</span>
                  <ChevronRight size={14} />
                </button>
                
                <button
                  type="button"
                  onClick={() => irParaStep(6)}
                  className="w-full bg-white border border-dashed border-[#DB7093] text-[#C71585] hover:bg-[#FFF0F4]/30 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Users size={13} />
                  <span>Não encontrou seu horário? Entrar na lista de espera</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: IDENTIFICAÇÃO DO CLIENTE */}
        {step === 4 && (
          <form onSubmit={handleFinalizarAgendamento} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#FAD0DC]/50 pb-3 mb-2">
              <button type="button" onClick={() => setStep(3)} className="p-1 rounded-full hover:bg-[#FFF0F4]/30 text-[#A88690]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Seus Dados</h3>
                <p className="text-xs text-[#A88690] mt-0.5">Preencha com suas informações de contato</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Seu Nome Completo</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <User size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: Amanda Santos..."
                  value={nome} 
                  onChange={(e) => {
                    const novoNome = e.target.value;
                    setNome(novoNome);
                    // Detecção automática de gênero pelo primeiro nome se ainda não foi selecionado manualmente
                    if (!sexoModificadoManualmente && !clienteIdentificado) {
                      const gen = detectarGeneroPorNome(novoNome);
                      if (gen) setSexo(gen);
                    }
                  }}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">WhatsApp de Contato</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <Phone size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: (35) 99999-9999"
                  value={telefone} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setTelefone(val);
                    const telDigits = val.replace(/\D/g, '');
                    if (telDigits.length >= 8) {
                      const cli = clientes.find(c => {
                        const cDigits = c.telefone.replace(/\D/g, '');
                        return cDigits === telDigits || cDigits.endsWith(telDigits.slice(-8)) || telDigits.endsWith(cDigits.slice(-8));
                      });
                      if (cli) {
                        setClienteIdentificado(cli);
                        if (!nome.trim() && cli.nome) {
                          setNome(cli.nome);
                        }
                        const cliSexo = cli.sexo || cli.preferencias?.sexo;
                        if (!sexoModificadoManualmente) {
                          if (cliSexo === 'masculino' || cliSexo === 'feminino') {
                            setSexo(cliSexo);
                          } else {
                            const gen = detectarGeneroPorNome(cli.nome || nome);
                            if (gen) setSexo(gen);
                          }
                        }
                      } else {
                        setClienteIdentificado(null);
                      }
                    } else {
                      setClienteIdentificado(null);
                    }
                  }}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
              {clienteIdentificado && (
                <div className="flex items-center gap-1.5 p-2 bg-[#FFF0F5] border border-[#FAD0DC] rounded-xl text-[11px] text-[#8C6D58] mt-1.5 animate-in fade-in">
                  <span>✨</span>
                  <span>
                    Olá, <strong>{clienteIdentificado.nome}</strong>! Identificamos seu cadastro ({clienteIdentificado.sexo === 'masculino' ? '👨 Masculino' : '👩 Feminino'}).
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Como prefere ser tratada(o)?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSexo('feminino');
                    setSexoModificadoManualmente(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    sexo === 'feminino'
                      ? 'bg-[#FFF0F5] text-[#DB7093] border-[#DB7093] ring-1 ring-[#DB7093]/30 shadow-2xs'
                      : 'bg-white text-stone-500 border-[#FAD0DC]/50 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-sm">👩</span>
                  <span>Feminino <small className="font-normal opacity-75">(Bem-vinda)</small></span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSexo('masculino');
                    setSexoModificadoManualmente(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    sexo === 'masculino'
                      ? 'bg-[#FFF0F5] text-[#DB7093] border-[#DB7093] ring-1 ring-[#DB7093]/30 shadow-2xs'
                      : 'bg-white text-stone-500 border-[#FAD0DC]/50 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-sm">👨</span>
                  <span>Masculino <small className="font-normal opacity-75">(Bem-vindo)</small></span>
                </button>
              </div>

              {/* Plano VIP Escolhido nesta Reserva */}
              {planoVipEscolhido && (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl text-xs text-[#5A3F45] flex items-start gap-2.5 animate-in fade-in duration-200 mt-2">
                  <Crown size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 block">
                      👑 Adesão ao Clube VIP: {planoVipEscolhido.nome}
                    </span>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                      Plano mensal de <strong>{formatarMoeda(planoVipEscolhido.preco_mensal)}</strong> com <strong>{planoVipEscolhido.qtd_procedimentos_mes} sessões {(() => {
                        const f = planoVipEscolhido.frequencia_dias || 7;
                        const fNorm = Math.max(7, Math.round(f / 7) * 7);
                        if (fNorm === 14) return 'quinzenais (a cada 14 dias)';
                        if (fNorm === 21) return 'a cada 3 semanas';
                        if (fNorm === 28) return 'a cada 4 semanas';
                        return 'semanais';
                      })()}</strong> garantidas no mesmo horário. Agendamento isento de sinal online!
                    </p>
                  </div>
                </div>
              )}

              {/* Reconhecimento automático de Cliente VIP para Serviços Avulsos */}
              {(() => {
                if (planoVipEscolhido) return null;
                const telLimpo = telefone.replace(/\D/g, '');
                if (telLimpo.length < 8) return null;
                const cliVip = clientes.find(c => c.telefone.replace(/\D/g, '').endsWith(telLimpo.slice(-8)) && c.assinatura?.status === 'ativo');
                if (!cliVip) return null;

                const servsNomes = servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean).join(' + ');
                const isMasc = (cliVip.sexo || cliVip.preferencias?.sexo || (detectarGeneroPorNome(cliVip.nome) === 'masculino') || sexo) === 'masculino';

                return (
                  <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl text-xs text-[#5A3F45] flex items-start gap-2.5 animate-in fade-in duration-200 mt-2">
                    <Crown size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-950 block">
                        👑 {isMasc ? 'Bem-vindo' : 'Bem-vinda'}, {cliVip.nome}! Assinante VIP Reconhecid{isMasc ? 'o' : 'a'}
                      </span>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                        Identificamos seu plano <strong>{cliVip.assinatura?.nome_plano}</strong> ativo. Mantivemos seu procedimento avulso <strong>({servsNomes || 'serviço escolhido'})</strong> com isenção de sinal Pix online! O valor será acertado no salão.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Alguma Observação? (Opcional)</label>
              <textarea 
                rows={2} placeholder="Se tiver preferências de cores, formatos ou alergias..."
                value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                className="w-full border border-[#FAD0DC]/50 rounded-xl p-2.5 text-xs text-[#5A3F45] focus:outline-none focus:border-[#DB7093] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Concluir Agendamento</span>
              <Check size={14} />
            </button>
          </form>
        )}

        {/* STEP 5: CONFIRMAÇÃO DO AGENDAMENTO */}
        {step === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-[#5A3F45]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center mx-auto">
                <Check size={24} />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#5A3F45]">
                {valorSinal > 0 ? 'Agendamento Pré-Reservado!' : 'Agendamento Confirmado com Sucesso!'}
              </h3>
              <p className="text-xs text-[#A88690]">
                {valorSinal > 0 
                  ? `Olá, ${nome}! Seu horário está garantido. Siga as orientações Pix abaixo para confirmá-lo:`
                  : `Olá, ${nome}! Seu horário foi confirmado com sucesso. Te esperamos no salão! 💕`}
              </p>
            </div>

            {/* Banner de Sucesso do Plano VIP */}
            {planoVipEscolhido && (
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1.5 text-left animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Crown size={16} className="text-amber-600" />
                  <span>Vaga VIP Garantida!</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Você agora é assinante do <strong>{planoVipEscolhido.nome}</strong>! Suas <strong>{planoVipEscolhido.qtd_procedimentos_mes} sessões {(() => {
                    const f = planoVipEscolhido.frequencia_dias || 7;
                    const fNorm = Math.max(7, Math.round(f / 7) * 7);
                    if (fNorm === 14) return 'quinzenais (a cada 14 dias)';
                    if (fNorm === 21) return 'a cada 3 semanas';
                    if (fNorm === 28) return 'a cada 4 semanas';
                    return 'semanais';
                  })()}</strong> foram reservadas no mesmo dia da semana e horário até o fim do ciclo mensal.
                </p>
              </div>
            )}

            {/* Ficha Resumo */}
            <div className="bg-[#FFF5F7]/30 border border-[#FAD0DC]/50 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A88690]">Código da Reserva:</span>
                <span className="font-bold tracking-wider text-[#C71585]">{codigoReserva}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A88690]">Data & Horário:</span>
                <span className="font-bold">{formatarDataLocal(dataSelecionada)} às {horarioSelecionado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A88690]">Atendente:</span>
                <span className="font-bold">{profSelecionada ? profSelecionada.nome : 'Sheila Santos'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A88690]">Procedimento(s):</span>
                <span className="font-bold text-right max-w-[180px] truncate">
                  {servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).join(' + ')}
                </span>
              </div>
              {planoVipEscolhido && detalhesSessoesPlano ? (
                <div className="space-y-1 py-1.5 border-t border-b border-[#FAD0DC]/50 my-1 text-xs">
                  <div className="flex justify-between text-amber-950 font-bold">
                    <span>⏱️ Duração 1ª Sessão ({detalhesSessoesPlano.sessao1.procedimentos}):</span>
                    <span>{formatarDuracaoMinutos(detalhesSessoesPlano.sessao1.duracao)}</span>
                  </div>
                  {detalhesSessoesPlano.gruposProximas.map((g, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-[#5A3F45]">
                      <span className="text-[#8C7A6B]">🔁 Duração {g.titulo} ({g.procedimentos}):</span>
                      <span className="font-semibold">{formatarDuracaoMinutos(g.duracao)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-[#A88690]">Duração Prevista:</span>
                  <span className="font-bold">{duracaoTotal} minutos</span>
                </div>
              )}
              {planoVipEscolhido ? (
                <div className="flex justify-between text-amber-800 pt-1">
                  <span className="font-semibold flex items-center gap-1">
                    <Crown size={12} className="text-amber-600" />
                    Frequência VIP:
                  </span>
                  <span className="font-bold">
                    {(() => {
                      const f = planoVipEscolhido.frequencia_dias || 7;
                      const fNorm = Math.max(7, Math.round(f / 7) * 7);
                      if (fNorm === 14) return 'Sessões quinzenais garantidas (a cada 14 dias)';
                      if (fNorm === 21) return 'Sessões a cada 3 semanas garantidas';
                      if (fNorm === 28) return 'Sessões a cada 4 semanas garantidas';
                      return 'Sessões semanais garantidas';
                    })()}
                  </span>
                </div>
              ) : (() => {
                const diasRetornoArr = servicos
                  .filter(s => servicosSelecionados.includes(s.id))
                  .map(s => Number(s.intervalo_manutencao_dias || (s as any).retorno_dias) || 0)
                  .filter(d => d > 0);
                const menorRetorno = diasRetornoArr.length > 0 ? Math.min(...diasRetornoArr) : 0;
                if (menorRetorno > 0 && dataSelecionada) {
                  const d = new Date(dataSelecionada + 'T12:00:00');
                  d.setDate(d.getDate() + menorRetorno);
                  const diaF = String(d.getDate()).padStart(2, '0');
                  const mesF = String(d.getMonth() + 1).padStart(2, '0');
                  const anoF = d.getFullYear();
                  return (
                    <div className="flex justify-between text-[#C71585] pt-1">
                      <span className="font-semibold flex items-center gap-1">
                        <RotateCcw size={12} />
                        Sugestão de Retorno:
                      </span>
                      <span className="font-bold">{menorRetorno} dias ({diaF}/{mesF}/{anoF})</span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex justify-between pt-2 border-t border-[#FAD0DC]/50 text-sm">
                <span className="font-bold">Total do Atendimento:</span>
                <span className="font-extrabold text-[#C71585]">
                  {planoVipEscolhido ? `${formatarMoeda(planoVipEscolhido.preco_mensal)}/mês (Clube VIP)` : formatarMoeda(valorTotal)}
                </span>
              </div>
            </div>

            {/* Regras de Sinal */}
            {valorSinal > 0 && (
              <div className="bg-[#FFF9E6] border border-[#FFEBAA] rounded-2xl p-4 text-xs space-y-3">
                <h4 className="font-bold text-[#856404] flex items-center gap-1.5">
                  <Sparkles size={14} className="fill-[#856404]" />
                  <span>Sinal de Confirmação Exigido</span>
                </h4>
                
                <p className="text-[11px] text-[#856404] leading-relaxed">
                  Para confirmar sua reserva, efetue o pagamento do sinal de <strong>{formatarMoeda(valorSinal)}</strong> via Pix. O restante do valor será quitado no dia do procedimento.
                </p>

                <div className="flex items-center justify-between bg-white border border-[#FFEBAA] rounded-xl px-3 py-2">
                  <div className="overflow-hidden pr-2">
                    <p className="text-[9px] font-bold text-[#A88690] uppercase">
                      Chave Pix Copia-e-Cola ({titularPixAtivo})
                    </p>
                    <p className="font-semibold truncate text-[11px] mt-0.5">{chavePixAtiva}</p>
                  </div>
                  <button
                    onClick={handleCopiarPix}
                    className="bg-[#FFF5F7]/30 border border-[#FAD0DC]/50 text-xs font-bold text-[#C71585] px-3 py-1.5 rounded-lg shrink-0 active:bg-gray-100 transition-colors"
                  >
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <p className="text-[9px] text-[#A1813A] italic">
                  {configSalao.instrucoes_pix}
                </p>

                <div className="pt-2 border-t border-[#FFEBAA] text-[10px] text-[#856404] leading-relaxed">
                  <span className="font-bold text-[#634a02] block mb-0.5">📌 Política de Devolução do Sinal:</span>
                  {(configSalao.regra_devolucao_sinal || 'Cancelamentos realizados com até {horas} horas de antecedência têm devolução integral do sinal via Pix. Após esse prazo, o valor não é reembolsável.').replace('{horas}', String(configSalao.regras?.cancelamento_limite_horas || 24))}
                </div>

                <div className="bg-amber-100/70 p-2.5 rounded-xl border border-amber-300 text-[10px] text-amber-900 flex items-center gap-2">
                  <Clock size={13} className="shrink-0 text-amber-700" />
                  <span>Envie seu comprovante em até <strong>{configSalao.regras?.limite_horas_sinal || 2} horas</strong> para garantir seu horário antes da liberação da vaga.</span>
                </div>
              </div>
            )}

            {valorSinal > 0 && codigoReserva && (
              <a
                href={getConfirmationUrl(codigoReserva)}
                className="w-full flex items-center justify-center gap-2 bg-[#8C6D58] hover:bg-[#725743] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <span>Acompanhar Reserva & Enviar Comprovante</span>
                <ChevronRight size={14} />
              </a>
            )}

            <button
              onClick={() => {
                setStep(1);
                setServicosSelecionados([]);
                setHorarioSelecionado('');
                setNome('');
                setTelefone('');
                setObservacoes('');
              }}
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Fazer outro Agendamento
            </button>
          </div>
        )}

        {/* STEP 6: FORMULÁRIO DE LISTA DE ESPERA (Waitlist Form) */}
        {step === 6 && (
          <form onSubmit={handleFinalizarListaEspera} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 border-b border-[#FAD0DC]/50 pb-3 mb-2">
              <button type="button" onClick={() => setStep(3)} className="p-1 rounded-full hover:bg-[#FFF0F4]/30 text-[#A88690]">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A3F45]">Entrar na Lista de Espera</h3>
                <p className="text-xs text-[#A88690] mt-0.5">Avise-nos de sua preferência caso surja alguma vaga</p>
              </div>
            </div>

            {errorWaitlist && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorWaitlist}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Seu Nome Completo</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <User size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: Amanda Santos..."
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">WhatsApp de Contato</label>
              <div className="flex items-center gap-2 p-2.5 border border-[#FAD0DC]/50 rounded-xl bg-white">
                <Phone size={14} className="text-[#DB7093]" />
                <input 
                  type="text" required placeholder="Ex: (35) 99999-9999"
                  value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs text-[#5A3F45] bg-transparent outline-none w-full border-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Profissional de Preferência</label>
              <select
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="w-full border border-[#FAD0DC]/50 bg-white rounded-xl p-2.5 text-xs text-[#5A3F45] focus:outline-none focus:border-[#DB7093]"
              >
                <option value="">Qualquer profissional disponível</option>
                {profissionaisParaSelecaoStep1.map(p => (
                  <option key={p.id} value={p.id}>💅 {p.nome} ({p.especialidade || (p.perfil === 'admin' ? 'Master' : 'Designer')})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A88690] uppercase mb-1">Período de Preferência</label>
              <select
                value={periodoPreferido}
                onChange={(e: any) => setPeriodoPreferido(e.target.value)}
                className="w-full border border-[#FAD0DC]/50 bg-white rounded-xl p-2.5 text-xs text-[#5A3F45] focus:outline-none focus:border-[#DB7093]"
              >
                <option value="qualquer">Qualquer período</option>
                <option value="manha">Período da Manhã</option>
                <option value="tarde">Período da Tarde</option>
                <option value="noite">Período da Noite</option>
              </select>
            </div>

            <div className="bg-[#FFF5F7]/30 p-3 rounded-xl border border-[#FAD0DC]/50 text-xs text-[#A88690]">
              <p>Data pretendida: <strong>{formatarDataLocal(dataSelecionada)}</strong></p>
              <p className="mt-1">Serviço: <strong>{servicosSelecionados.map(id => servicos.find(s => s.id === id)?.nome).join(', ')}</strong></p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Confirmar na Lista de Espera</span>
              <Check size={14} />
            </button>
          </form>
        )}

        {/* STEP 7: CONFIRMAÇÃO DA LISTA DE ESPERA (Waitlist Confirmation) */}
        {step === 7 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-[#5A3F45] text-center">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] border border-[#C2EAD0] text-[#2B7A4B] flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#5A3F45]">Inscrição Realizada com Sucesso!</h3>
            <p className="text-xs text-[#A88690] leading-relaxed">
              Olá, <strong>{nome}</strong>! Você está na lista de espera para o dia <strong>{formatarDataLocal(dataSelecionada)}</strong> no período <strong>{periodoPreferido === 'qualquer' ? 'qualquer' : periodoPreferido}</strong>.
            </p>
            
            <p className="text-xs text-[#A88690] leading-relaxed">
              Entraremos em contato via WhatsApp caso haja alguma desistência de horário.
            </p>

            <button
              onClick={() => {
                setStep(1);
                setServicosSelecionados([]);
                setHorarioSelecionado('');
                setNome('');
                setTelefone('');
                setObservacoes('');
              }}
              className="w-full bg-gradient-to-r from-[#DB7093] to-[#C71585] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Voltar ao Início
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#A88690] mt-6 flex items-center justify-center gap-1 relative z-10">
        <span>{configSalao.nome || 'Salão de Beleza'} © {new Date().getFullYear()}</span>
        <Heart size={10} className="fill-[#DB7093] text-[#DB7093]" />
      </footer>
    </div>
  );
};
