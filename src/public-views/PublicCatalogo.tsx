import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  Crown, 
  ArrowRight, 
  Check, 
  Info, 
  X, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  Heart, 
  ChevronRight, 
  Instagram, 
  Flame, 
  Award,
  ArrowLeft
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico, PlanoAssinatura } from '../types';
import { gerarLinkWhatsApp, getCatalogoUrl } from '../utils/urlHelper';

interface ExtraItem {
  id: string;
  nome: string;
  duracao: number;
  preco: number;
  descricao: string;
}

const EXTRAS_PADRAO: ExtraItem[] = [
  {
    id: 'extra_nailart',
    nome: 'Nail Art Exclusiva',
    duracao: 20,
    preco: 25,
    descricao: 'Decoração artística personalizada, francesinha, encapsulada ou efeito cromado.'
  },
  {
    id: 'extra_spa',
    nome: 'Spa das Mãos & Hidratação Profunda',
    duracao: 15,
    preco: 35,
    descricao: 'Esfoliação revigorante com massagem relaxante e máscara de nutrição intensiva.'
  },
  {
    id: 'extra_remocao',
    nome: 'Remoção Segura de Alongamento Anterior',
    duracao: 30,
    preco: 40,
    descricao: 'Remoção técnica cuidadosa sem agredir a lâmina ungueal natural.'
  }
];

// Fotos temáticas em alta resolução como fallback
const FOTOS_FALLBACK: Record<string, string> = {
  alongamento: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=80',
  manutencao: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
  esmaltacao: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=80',
  mao: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&auto=format&fit=crop&q=80',
  pe: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
  decoracao: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80',
  geral: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=80'
};

export const PublicCatalogo: React.FC = () => {
  const { 
    servicos, 
    planosAssinatura, 
    configSalao,
    currentUser
  } = useAppState();

  const [busca, setBusca] = useState('');
  const [chipAtivo, setChipAtivo] = useState<string>('todos');
  const [copiadoLink, setCopiadoLink] = useState(false);

  // Modal / Drawer de Detalhes do Serviço
  const [servicoDetalhe, setServicoDetalhe] = useState<Servico | null>(null);
  const [extrasSelecionados, setExtrasSelecionados] = useState<string[]>([]);
  const [extraFeedback, setExtraFeedback] = useState<string | null>(null);

  const personalizacao = configSalao?.catalogo_personalizacao || {};
  const heroSelo = personalizacao.hero_selo || 'Atendimento com hora marcada';
  const heroTitulo = personalizacao.hero_titulo || 'Unhas impecáveis,\nno seu estilo.';
  const heroSubtitulo = personalizacao.hero_subtitulo || 'Escolha seu serviço, veja o tempo estimado e encontre o melhor horário para você com atendimento exclusivo e técnicas modernas de alta durabilidade.';
  const heroFotoUrl = personalizacao.hero_foto_url || 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900&auto=format&fit=crop&q=85';
  const heroCardSub = personalizacao.hero_card_subtitulo || 'Alongamentos & Cuidados';
  const heroCardTag = personalizacao.hero_card_tag || 'Alta Durabilidade';
  const badge1 = personalizacao.badge_confianca_1 || 'Materiais 100% esterilizados';
  const badge2 = personalizacao.badge_confianca_2 || 'Atendimento personalizado';
  const badge3 = personalizacao.badge_confianca_3 || 'Confirmação pelo WhatsApp';

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarDuracao = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto > 0 ? `~ ${horas}h${resto}` : `~ ${horas}h00`;
  };

  const limparTextoDescricao = (texto?: string) => {
    if (!texto) return '';
    return texto.replace(/<!--[\s\S]*?-->/g, '').trim();
  };

  const obterFotoServico = (s: Servico) => {
    if (s.foto && s.foto.trim() !== '') return s.foto;
    const cat = (s.categoria || '').toLowerCase();
    const nome = (s.nome || '').toLowerCase();
    if (nome.includes('alongamento') || cat.includes('alongamento') || nome.includes('molde') || nome.includes('fibra')) {
      return FOTOS_FALLBACK.alongamento;
    }
    if (nome.includes('manutenção') || nome.includes('manutencao') || cat.includes('manutencao')) {
      return FOTOS_FALLBACK.manutencao;
    }
    if (nome.includes('esmaltação') || nome.includes('banho') || cat.includes('gel')) {
      return FOTOS_FALLBACK.esmaltacao;
    }
    if (nome.includes('spa') || nome.includes('pé') || cat.includes('pe')) {
      return FOTOS_FALLBACK.pe;
    }
    if (nome.includes('nail art') || nome.includes('decora') || cat.includes('decoracao')) {
      return FOTOS_FALLBACK.decoracao;
    }
    return FOTOS_FALLBACK.mao;
  };

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && servicoDetalhe) {
        setServicoDetalhe(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [servicoDetalhe]);

  // Filtro de Serviços
  const servicosFiltrados = useMemo(() => {
    return servicos
      .filter(s => s.ativo !== false)
      .filter(s => {
        const cat = (s.categoria || '').toLowerCase();
        const nome = (s.nome || '').toLowerCase();

        if (chipAtivo !== 'todos') {
          if (chipAtivo === 'alongamentos') {
            if (!cat.includes('alongamento') && !nome.includes('alongamento') && !nome.includes('molde') && !nome.includes('fibra')) return false;
          } else if (chipAtivo === 'manutencao') {
            if (!cat.includes('manutencao') && !nome.includes('manutenção') && !nome.includes('manutencao')) return false;
          } else if (chipAtivo === 'esmalte_gel') {
            if (!nome.includes('gel') && !cat.includes('gel') && !nome.includes('banho')) return false;
          } else if (chipAtivo === 'mao_simples') {
            if (!nome.includes('manicure') && !nome.includes('simples') && !cat.includes('mao')) return false;
          } else if (chipAtivo === 'spa_cuidado') {
            if (!nome.includes('spa') && !nome.includes('pedicure') && !cat.includes('pe')) return false;
          } else if (chipAtivo === 'combos') {
            if (!s.is_pacote && !nome.includes('combo') && !nome.includes('pé e mão')) return false;
          }
        }

        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const desc = limparTextoDescricao(s.descricao).toLowerCase();
          return nome.includes(termo) || desc.includes(termo) || cat.includes(termo);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.destaque_catalogo && !b.destaque_catalogo) return -1;
        if (!a.destaque_catalogo && b.destaque_catalogo) return 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [servicos, chipAtivo, busca]);

  const planosAtivos = useMemo(() => {
    const defaultPlans: PlanoAssinatura[] = [
      {
        id: 'vip_manicure',
        nome: 'Clube VIP Manicure Semanal',
        descricao: '4 atendimentos de Manicure Tradicional ou Mão Simples no mês. Horário semanal garantido na sua rotina.',
        preco_mensal: 150,
        qtd_procedimentos_mes: 4,
        validade_dias: 30,
        servicos_permitidos_ids: ['s9', 's8'],
        ativo: true
      },
      {
        id: 'vip_manutencao',
        nome: 'Clube Manutenção de Alongamento',
        descricao: '2 manutenções mensais completas com esmaltação e garantia contra quebras acidentais.',
        preco_mensal: 190,
        qtd_procedimentos_mes: 2,
        validade_dias: 30,
        servicos_permitidos_ids: ['s3'],
        ativo: true
      },
      {
        id: 'vip_pe_mao',
        nome: 'Clube VIP Pé & Mão Completo',
        descricao: '4 atendimentos de Pé e Mão com cutilagem fina, hidratação profunda e acabamento impecável.',
        preco_mensal: 280,
        qtd_procedimentos_mes: 4,
        validade_dias: 30,
        servicos_permitidos_ids: ['s4', 's8'],
        ativo: true
      }
    ];

    if (planosAssinatura && planosAssinatura.length > 0) {
      const ativ = planosAssinatura.filter(p => p.ativo !== false);
      if (ativ.length > 0) return ativ;
    }
    return defaultPlans;
  }, [planosAssinatura]);

  const handleIrParaAgendamento = (servicoId?: string) => {
    if (servicoId) {
      window.location.hash = `agendar?servico=${encodeURIComponent(servicoId)}`;
    } else {
      window.location.hash = 'agendar';
    }
  };

  const handleIrParaAgendamentoVip = (planoId: string) => {
    window.location.hash = `agendar?plano_vip=${encodeURIComponent(planoId)}`;
  };

  const extrasList = useMemo(() => {
    const custom = configSalao.catalogo_personalizacao?.extras;
    if (custom && custom.length > 0) {
      const ativ = custom.filter(e => e.ativo !== false);
      if (ativ.length > 0) return ativ;
    }
    return EXTRAS_PADRAO;
  }, [configSalao.catalogo_personalizacao]);

  const handleAbrirDetalhes = (s: Servico) => {
    setServicoDetalhe(s);
    setExtrasSelecionados([]);
    setExtraFeedback(null);
  };

  const handleToggleExtra = (extraId: string) => {
    setExtrasSelecionados(prev => {
      const existe = prev.includes(extraId);
      const novo = existe ? prev.filter(id => id !== extraId) : [...prev, extraId];
      if (!existe) {
        setExtraFeedback(extraId);
        setTimeout(() => setExtraFeedback(null), 1200);
      }
      return novo;
    });
  };

  // Cálculo ao vivo de tempo e valor total no modal
  const calculoTotalModal = useMemo(() => {
    if (!servicoDetalhe) return { preco: 0, duracao: 0 };
    let preco = servicoDetalhe.preco;
    let duracao = servicoDetalhe.duracao_minutos;

    extrasSelecionados.forEach(eId => {
      const extra = extrasList.find(e => e.id === eId);
      if (extra) {
        preco += extra.preco;
        duracao += extra.duracao;
      }
    });

    return { preco, duracao };
  }, [servicoDetalhe, extrasSelecionados, extrasList]);

  const handleContinuarParaHorariosComExtras = () => {
    if (!servicoDetalhe) return;
    const idsToPass = [servicoDetalhe.id];
    if (extrasSelecionados.includes('extra_nailart')) {
      const sNail = servicos.find(s => s.nome.toLowerCase().includes('nail art') || s.categoria === 'decoracao');
      if (sNail) idsToPass.push(sNail.id);
    }
    handleIrParaAgendamento(idsToPass.join(','));
  };

  const handleCopiarLinkCatalogo = () => {
    const url = getCatalogoUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiadoLink(true);
        setTimeout(() => setCopiadoLink(false), 2500);
      }).catch(() => {});
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F8] text-[#2B2426] font-sans antialiased flex flex-col selection:bg-[#F7E6EA] selection:text-[#B85C78]">
      
      {/* 1. CABEÇALHO FIXO E COMPACTO */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EEDDE1] px-4 py-3 sm:px-8 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo e Nome do Estúdio */}
          <a href="#inicio" className="flex items-center gap-3 group">
            <img 
              src="/logo.png" 
              alt={configSalao.nome || 'Sheila Santos Nails'} 
              className="w-10 h-10 rounded-full object-cover shadow-xs border border-[#EEDDE1] transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <span className="font-serif font-bold text-base sm:text-lg text-[#2B2426] leading-tight block">
                {configSalao.nome || 'Sheila Santos Nails Designer'}
              </span>
              <span className="text-[11px] text-[#756B6D] flex items-center gap-1 font-medium">
                <Sparkles size={11} className="text-[#B85C78]" />
                <span>Estúdio Especializado</span>
              </span>
            </div>
          </a>

          {/* Links Centrais (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#756B6D]">
            <button onClick={() => scrollToSection('inicio')} className="hover:text-[#B85C78] transition-colors">
              Início
            </button>
            <button onClick={() => scrollToSection('servicos')} className="hover:text-[#B85C78] transition-colors">
              Serviços
            </button>
            <button onClick={() => scrollToSection('clube-vip')} className="hover:text-[#B85C78] transition-colors">
              Clube VIP
            </button>
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#B85C78] transition-colors">
              Como Funciona
            </button>
            <button onClick={() => scrollToSection('contato')} className="hover:text-[#B85C78] transition-colors">
              Contato
            </button>
          </nav>

          {/* Botões de Ação no Header */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  window.location.hash = 'admin';
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF6F0] hover:bg-[#EFECE6] text-[#5A4535] text-xs font-bold rounded-xl border border-[#EEDDE1] transition-all cursor-pointer shadow-2xs shrink-0"
                title="Voltar ao Painel Administrativo"
              >
                <ArrowLeft size={14} className="text-[#8C6D58]" />
                <span className="hidden sm:inline">Voltar ao App</span>
              </button>
            )}

            <button
              onClick={handleCopiarLinkCatalogo}
              title="Compartilhar Link do Catálogo"
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F7E6EA]/50 text-[#756B6D] hover:text-[#B85C78] text-xs font-semibold rounded-xl border border-[#EEDDE1] transition-all"
            >
              {copiadoLink ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copiadoLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              onClick={() => handleIrParaAgendamento()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#B85C78] hover:bg-[#98455F] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Calendar size={14} />
              <span>Agendar Horário</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO DE CONVERSÃO */}
      <section id="inicio" className="bg-gradient-to-b from-white via-[#FFF9F8] to-[#FFF9F8] border-b border-[#EEDDE1] pt-8 sm:pt-14 pb-10 sm:pb-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Coluna Texto / Conversão */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            {/* Selo */}
            <div className="inline-flex items-center gap-1.5 bg-[#F7E6EA] text-[#B85C78] px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#EEDDE1]">
              <Sparkles size={13} />
              <span>{heroSelo}</span>
            </div>

            {/* Título Principal */}
            <h1 className="font-serif font-bold text-3xl sm:text-5xl text-[#2B2426] leading-[1.15] tracking-tight whitespace-pre-line">
              {heroTitulo}
            </h1>

            {/* Subtítulo */}
            <p className="text-sm sm:text-base text-[#756B6D] max-w-xl leading-relaxed font-normal">
              {heroSubtitulo}
            </p>

            {/* Ações Primárias */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => scrollToSection('servicos')}
                className="px-6 py-3.5 bg-[#B85C78] hover:bg-[#98455F] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all duration-200 active:scale-95 flex items-center gap-2"
              >
                <span>Ver Serviços</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => scrollToSection('como-funciona')}
                className="px-5 py-3.5 bg-white hover:bg-[#F7E6EA]/50 text-[#2B2426] hover:text-[#B85C78] text-xs sm:text-sm font-semibold rounded-2xl border border-[#EEDDE1] transition-all duration-200"
              >
                Como Funciona
              </button>
            </div>

            {/* Prova de Confiança */}
            <div className="pt-4 border-t border-[#EEDDE1]/60 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-[#756B6D]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#B85C78]" />
                {badge1}
              </span>
              <span className="text-[#EEDDE1] hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <Heart size={14} className="text-[#B85C78]" />
                {badge2}
              </span>
              <span className="text-[#EEDDE1] hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={14} className="text-emerald-600" />
                {badge3}
              </span>
            </div>
          </div>

          {/* Coluna Imagem de Impacto / Destaque */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#EEDDE1] bg-white">
                <img 
                  src={heroFotoUrl} 
                  alt={`Unhas impecáveis ${configSalao.nome || 'Sheila Santos'}`} 
                  className="w-full h-80 sm:h-96 object-cover object-center transform hover:scale-102 transition-transform duration-500"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900&auto=format&fit=crop&q=85';
                  }}
                />
                
                {/* Badge Flutuante no Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#EEDDE1] shadow-md flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#B85C78] tracking-wider block">Procedimento Especialista</span>
                    <span className="font-serif font-bold text-sm text-[#2B2426]">{heroCardSub}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#F7E6EA] text-[#B85C78] text-[11px] font-bold rounded-lg whitespace-nowrap">
                    {heroCardTag}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. ATALHOS POR NECESSIDADE (CHIPS DE FILTRO & BUSCA) */}
      <section className="sticky top-[61px] z-30 bg-[#FFF9F8]/95 backdrop-blur-md border-b border-[#EEDDE1] py-3.5 px-4 sm:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto space-y-3">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Campo de Busca Rápida */}
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756B6D]" />
              <input 
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou procedimento..."
                className="w-full bg-white border border-[#EEDDE1] rounded-2xl pl-10 pr-9 py-2 text-xs text-[#2B2426] placeholder-[#756B6D]/60 focus:outline-none focus:border-[#B85C78] transition-all"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756B6D] hover:text-[#2B2426] p-1"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Contador Dinâmico de Serviços */}
            <div className="text-xs text-[#756B6D] font-medium hidden md:block">
              {servicosFiltrados.length} {servicosFiltrados.length === 1 ? 'opção disponível' : 'opções disponíveis'}
            </div>
          </div>

          {/* Linha de Chips de Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'alongamentos', label: 'Alongamentos' },
              { id: 'manutencao', label: 'Manutenção' },
              { id: 'esmalte_gel', label: 'Esmaltação em Gel' },
              { id: 'mao_simples', label: 'Mão Simples' },
              { id: 'spa_cuidado', label: 'Spa / Cuidado' },
              { id: 'combos', label: 'Combos' }
            ].map(chip => {
              const isActive = chipAtivo === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setChipAtivo(chip.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                    isActive
                      ? 'bg-[#B85C78] text-white shadow-xs'
                      : 'bg-white border border-[#EEDDE1] text-[#756B6D] hover:text-[#2B2426] hover:border-[#B85C78]/50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}

            {/* Chip Direto para o Clube VIP */}
            <button
              onClick={() => scrollToSection('clube-vip')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 bg-[#F7E6EA] border border-[#EEDDE1] text-[#B85C78] hover:bg-[#B85C78] hover:text-white transition-all flex items-center gap-1.5"
            >
              <Crown size={13} />
              <span>Clube VIP</span>
            </button>
          </div>

        </div>
      </section>

      {/* 4. CATÁLOGO DE SERVIÇOS — SEÇÃO PRINCIPAL */}
      <main id="servicos" className="max-w-6xl mx-auto px-4 sm:px-8 py-10 flex-1 w-full space-y-12">
        
        {/* Título da Seção */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#2B2426]">
            Escolha o cuidado que combina com você
          </h2>
          <p className="text-xs sm:text-sm text-[#756B6D]">
            Toque em um serviço para ver detalhes, duração e opções de personalização.
          </p>
        </div>

        {/* Grade de Cards de Serviço */}
        {servicosFiltrados.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-[#EEDDE1] text-center max-w-md mx-auto space-y-3 shadow-xs">
            <Search size={32} className="mx-auto text-[#756B6D]/60" />
            <h3 className="font-serif font-bold text-base text-[#2B2426]">Nenhum serviço encontrado</h3>
            <p className="text-xs text-[#756B6D]">Tente buscar com outro termo ou selecione a categoria "Todos".</p>
            <button
              onClick={() => { setBusca(''); setChipAtivo('todos'); }}
              className="px-4 py-2 bg-[#F7E6EA] text-[#B85C78] text-xs font-bold rounded-xl hover:bg-[#B85C78] hover:text-white transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicosFiltrados.map((s, index) => {
              const foto = obterFotoServico(s);
              const isMaisEscolhido = index === 0 || s.destaque_catalogo;
              const isPrimeiraVez = s.nome.toLowerCase().includes('papel') || s.nome.toLowerCase().includes('fibra');

              return (
                <div 
                  key={s.id}
                  onClick={() => handleAbrirDetalhes(s)}
                  className="bg-white rounded-3xl border border-[#EEDDE1] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group cursor-pointer hover:-translate-y-1"
                >
                  {/* Foto Real do Procedimento com Tag */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#F7E6EA]/30">
                    <img 
                      src={foto} 
                      alt={s.nome} 
                      className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500"
                      loading="lazy"
                    />
                    
                    {/* Tags Flutuantes */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {isMaisEscolhido ? (
                        <span className="px-2.5 py-1 bg-[#B85C78] text-white text-[10px] font-bold rounded-lg shadow-xs flex items-center gap-1">
                          <Flame size={11} />
                          <span>Mais Escolhido</span>
                        </span>
                      ) : isPrimeiraVez ? (
                        <span className="px-2.5 py-1 bg-white/95 text-[#2B2426] text-[10px] font-bold rounded-lg shadow-xs border border-[#EEDDE1]">
                          Ideal para 1ª vez
                        </span>
                      ) : null}

                      {s.intervalo_manutencao_dias > 0 && (
                        <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium rounded-lg">
                          Retorno: {s.intervalo_manutencao_dias} dias
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#B85C78] tracking-wider">
                          {s.categoria || 'Procedimento'}
                        </span>
                        
                        {/* Tempo Estimado Visível Sem Clique */}
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#756B6D] bg-[#FFF9F8] px-2 py-0.5 rounded-md border border-[#EEDDE1]">
                          <Clock size={12} className="text-[#B85C78]" />
                          <span>{formatarDuracao(s.duracao_minutos)}</span>
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-base sm:text-lg text-[#2B2426] leading-snug group-hover:text-[#B85C78] transition-colors">
                        {s.nome}
                      </h3>

                      <p className="text-xs text-[#756B6D] line-clamp-2 leading-relaxed">
                        {limparTextoDescricao(s.descricao) || 'Atendimento com produtos certificados, assepsia completa e acabamento profissional.'}
                      </p>
                    </div>

                    {/* Preço e Botões de Ação */}
                    <div className="pt-3 border-t border-[#EEDDE1]/60 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-[#756B6D] block font-medium">A partir de</span>
                        <span className="text-base sm:text-lg font-bold text-[#B85C78]">
                          {formatarMoeda(s.preco)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleAbrirDetalhes(s)}
                          className="px-3 py-2 bg-white hover:bg-[#F7E6EA] text-[#2B2426] text-xs font-semibold rounded-xl border border-[#EEDDE1] transition-all"
                        >
                          Ver Detalhes
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleIrParaAgendamento(s.id)}
                          className="px-3.5 py-2 bg-[#B85C78] hover:bg-[#98455F] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1"
                        >
                          <span>Agendar</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 7. CLUBE VIP — PROPOSTA DE RECORRÊNCIA MAIS PERSUASIVA */}
        <section id="clube-vip" className="bg-[#FAF2F4] border border-[#EEDDE1] rounded-3xl p-6 sm:p-10 space-y-8 scroll-mt-24">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-white text-[#B85C78] px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#EEDDE1] shadow-2xs">
              <Crown size={13} className="text-amber-500" />
              <span>Assinatura Mensal & Vantagens Exclusivas</span>
            </div>
            
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#2B2426]">
              Seu cuidado em dia. Seu horário garantido.
            </h2>
            
            <p className="text-xs sm:text-sm text-[#756B6D]">
              Escolha um plano, economize no mês e tenha prioridade para reservar sem disputar vagas na agenda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planosAtivos.map((plano, idx) => {
              const temMarcado = planosAtivos.some(p => p.destaque_catalogo);
              const isRecomendado = temMarcado
                ? !!plano.destaque_catalogo
                : (plano.nome.toLowerCase().includes('alongamento') || idx === 1);
              const valorPorSessao = plano.qtd_procedimentos_mes > 0 ? (plano.preco_mensal / plano.qtd_procedimentos_mes) : null;

              return (
                <div 
                  key={plano.id}
                  className={`bg-white rounded-3xl p-6 sm:p-7 border flex flex-col justify-between space-y-5 transition-all duration-200 relative ${
                    isRecomendado 
                      ? 'border-[#B85C78] shadow-md ring-2 ring-[#B85C78]/20' 
                      : 'border-[#EEDDE1] shadow-xs hover:shadow-md'
                  }`}
                >
                  {isRecomendado && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B85C78] text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      Plano Recomendado
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#B85C78] uppercase tracking-wider">
                        {plano.validade_dias} dias de validade
                      </span>
                      <span className="px-2 py-0.5 bg-[#F7E6EA] text-[#B85C78] text-[10px] font-bold rounded-md">
                        {plano.qtd_procedimentos_mes} Sessões
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-[#2B2426] leading-tight">
                      {plano.nome}
                    </h3>

                    <p className="text-xs text-[#756B6D] leading-relaxed">
                      {plano.descricao}
                    </p>

                    {/* Vantagens / Benefícios Transparentes */}
                    <div className="pt-3 border-t border-[#EEDDE1]/60 space-y-2 text-xs text-[#756B6D]">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-[#B85C78] shrink-0" />
                        <span>Horário fixo garantido na semana/quinzena</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-[#B85C78] shrink-0" />
                        <span>Prioridade máxima para encaixes</span>
                      </div>
                      {valorPorSessao && (
                        <div className="flex items-center gap-2 font-medium text-[#2B2426]">
                          <Award size={14} className="text-amber-500 shrink-0" />
                          <span>Equivalente a <strong>{formatarMoeda(valorPorSessao)}</strong> por sessão</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preço e Ação */}
                  <div className="pt-4 border-t border-[#EEDDE1]/60 space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#2B2426]">
                        {formatarMoeda(plano.preco_mensal)}
                      </span>
                      <span className="text-xs text-[#756B6D]">/ mês</span>
                    </div>

                    <button
                      onClick={() => handleIrParaAgendamentoVip(plano.id)}
                      className={`w-full py-3 rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 ${
                        isRecomendado
                          ? 'bg-[#B85C78] hover:bg-[#98455F] text-white'
                          : 'bg-white hover:bg-[#F7E6EA] text-[#2B2426] border border-[#EEDDE1]'
                      }`}
                    >
                      <Crown size={14} />
                      <span>Quero Fazer Parte do VIP</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </section>

        {/* 8. BLOCO DE VENDA CRUZADA ("DEIXE SEU MOMENTO AINDA MAIS ESPECIAL") */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold text-[#B85C78] uppercase tracking-wider">Cuidados Adicionais</span>
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#2B2426]">
              Deixe seu momento ainda mais especial
            </h2>
            <p className="text-xs text-[#756B6D]">
              Adicione estes toques de carinho e proteção ao seu atendimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {extrasList.map(extra => (
              <div 
                key={extra.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EEDDE1] shadow-xs flex flex-col justify-between space-y-3 hover:border-[#B85C78]/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[#2B2426]">{extra.nome}</span>
                    <span className="text-[10px] text-[#756B6D] font-medium">+{extra.duracao} min</span>
                  </div>
                  <p className="text-[11px] text-[#756B6D] leading-relaxed">{extra.descricao}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#EEDDE1]/60">
                  <span className="text-xs font-bold text-[#B85C78]">+{formatarMoeda(extra.preco)}</span>
                  <button
                    onClick={() => {
                      if (extra.id === 'extra_nailart') {
                        const sNail = servicos.find(s => s.nome.toLowerCase().includes('nail art') || s.categoria === 'decoracao');
                        if (sNail) {
                          handleIrParaAgendamento(sNail.id);
                          return;
                        }
                      }
                      handleIrParaAgendamento();
                    }}
                    className="px-3 py-1.5 bg-[#F7E6EA] hover:bg-[#B85C78] text-[#B85C78] hover:text-white text-[11px] font-bold rounded-xl transition-all"
                  >
                    Adicionar ao Atendimento
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. COMO FUNCIONA (3 PASSOS SIMPLES) */}
        <section id="como-funciona" className="py-8 border-t border-[#EEDDE1]/70 space-y-8 scroll-mt-24">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold text-[#B85C78] uppercase tracking-wider">Passo a Passo</span>
            <h2 className="font-serif font-bold text-2xl text-[#2B2426]">
              Como funciona o seu agendamento
            </h2>
            <p className="text-xs text-[#756B6D]">Tudo rápido, sem filas e com confirmação em tempo real.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-6 border border-[#EEDDE1] text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F7E6EA] text-[#B85C78] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                1
              </div>
              <h3 className="font-bold text-sm text-[#2B2426]">Escolha</h3>
              <p className="text-xs text-[#756B6D] leading-relaxed">
                Selecione o serviço principal e adicione os extras ou nail arts que combinam com seu estilo.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#EEDDE1] text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F7E6EA] text-[#B85C78] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                2
              </div>
              <h3 className="font-bold text-sm text-[#2B2426]">Agende</h3>
              <p className="text-xs text-[#756B6D] leading-relaxed">
                Escolha o dia e o horário disponíveis que melhor se encaixam na sua rotina diária.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#EEDDE1] text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F7E6EA] text-[#B85C78] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                3
              </div>
              <h3 className="font-bold text-sm text-[#2B2426]">Confirme</h3>
              <p className="text-xs text-[#756B6D] leading-relaxed">
                Receba o comprovante e os lembretes automáticos diretamente no seu WhatsApp.
              </p>
            </div>
          </div>
        </section>

        {/* 10. BLOCO DE CONFIANÇA & HIGIENIZAÇÃO */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EEDDE1] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-[#F7E6EA] border border-[#EEDDE1] flex items-center justify-center text-[#B85C78] font-serif font-bold text-2xl shrink-0 shadow-inner">
              SS
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif font-bold text-lg text-[#2B2426]">
                Atendimento pensado para você se sentir bonita e tranquila
              </h3>
              <p className="text-xs text-[#756B6D] leading-relaxed">
                Nosso compromisso é com a saúde da sua unha natural aliada à estética impecável e de máxima resistência.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#EEDDE1]/60 text-xs text-[#756B6D]">
            <div className="space-y-1">
              <span className="font-bold text-[#2B2426] block">✦ Esterilização</span>
              <span>Autoclave hospitalar e kits descartáveis de lixa e palito.</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-[#2B2426] block">✦ Produtos Premium</span>
              <span>Géis, bases e esmaltes com certificação Anvisa.</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-[#2B2426] block">✦ Pontualidade</span>
              <span>Horários respeitados para uma experiência sem pressa.</span>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-[#2B2426] block">✦ Pagamento Fácil</span>
              <span>Pix, dinheiro e cartões de crédito/débito aceitos.</span>
            </div>
          </div>
        </section>

        {/* 11. CTA FINAL */}
        <section className="bg-[#B85C78] text-white rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <h2 className="font-serif font-bold text-2xl sm:text-4xl leading-tight">
            Pronta para reservar seu horário?
          </h2>
          
          <p className="text-xs sm:text-sm text-white/85 max-w-lg mx-auto leading-relaxed">
            Escolha seu serviço agora e garanta um momento exclusivo de autocuidado e beleza para suas mãos.
          </p>

          <button
            onClick={() => handleIrParaAgendamento()}
            className="px-8 py-4 bg-white hover:bg-[#FFF9F8] text-[#B85C78] text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <Calendar size={16} />
            <span>Agendar Meu Horário</span>
          </button>
        </section>

      </main>

      {/* 6. MODAL / DRAWER DE DETALHES DO SERVIÇO COM VENDA CRUZADA */}
      {servicoDetalhe && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setServicoDetalhe(null)}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl border border-[#EEDDE1] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header da Imagem */}
            <div className="relative aspect-[16/9] w-full bg-[#F7E6EA] shrink-0">
              <img 
                src={obterFotoServico(servicoDetalhe)} 
                alt={servicoDetalhe.nome} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setServicoDetalhe(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#2B2426] flex items-center justify-center shadow-md transition-all"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>

              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Clock size={13} />
                <span>Duração: {formatarDuracao(servicoDetalhe.duracao_minutos)}</span>
              </div>
            </div>

            {/* Conteúdo do Detalhe */}
            <div className="p-6 space-y-6 flex-1 text-left">
              
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#B85C78] uppercase tracking-wider">
                  {servicoDetalhe.categoria || 'Procedimento'}
                </span>
                <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#2B2426]">
                  {servicoDetalhe.nome}
                </h3>
                <p className="text-xs text-[#756B6D] leading-relaxed pt-1">
                  {limparTextoDescricao(servicoDetalhe.descricao) || 'Atendimento completo com produtos de alta durabilidade e acabamento técnico impecável.'}
                </p>
              </div>

              {/* O que está incluso */}
              {(() => {
                const itens = (servicoDetalhe.itens_inclusos && servicoDetalhe.itens_inclusos.length > 0)
                  ? servicoDetalhe.itens_inclusos
                  : (configSalao.catalogo_personalizacao?.itens_inclusos_padrao && configSalao.catalogo_personalizacao.itens_inclusos_padrao.length > 0)
                    ? configSalao.catalogo_personalizacao.itens_inclusos_padrao
                    : [
                        'Higienização e assepsia completa das mãos e unhas',
                        'Cutilagem russa ou combinada sem machucar',
                        'Preparação química e mecânica da lâmina natural',
                        'Finalização com óleo nutritivo hidratante de cutículas'
                      ];

                return (
                  <div className="bg-[#FFF9F8] rounded-2xl p-4 border border-[#EEDDE1] space-y-2">
                    <h4 className="text-xs font-bold text-[#2B2426] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#B85C78]" />
                      <span>O que está incluso neste atendimento:</span>
                    </h4>
                    <ul className="text-xs text-[#756B6D] space-y-1.5 pl-1">
                      {itens.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Antes de agendar (dicas e orientações) */}
              {(() => {
                const orientacao = servicoDetalhe.orientacoes_agendamento?.trim() ||
                  configSalao.catalogo_personalizacao?.orientacao_padrao?.trim() ||
                  'Se você já estiver com alongamento de outro salão, recomendamos selecionar o extra de Remoção Segura para garantir a aderência perfeita.';

                return (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs leading-relaxed">
                    <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong>Antes de agendar:</strong> {orientacao}
                    </div>
                  </div>
                );
              })()}

              {/* Venda Cruzada de Extras no Modal */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#2B2426] flex items-center justify-between">
                  <span>Personalize seu atendimento:</span>
                  <span className="text-[10px] text-[#756B6D] font-normal">Opcional</span>
                </h4>

                <div className="space-y-2">
                  {extrasList.map(extra => {
                    const isSelected = extrasSelecionados.includes(extra.id);
                    const isJustAdded = extraFeedback === extra.id;

                    return (
                      <div
                        key={extra.id}
                        onClick={() => handleToggleExtra(extra.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#F7E6EA]/50 border-[#B85C78]'
                            : 'bg-white border-[#EEDDE1] hover:border-[#B85C78]/40'
                        }`}
                      >
                        <div className="space-y-0.5 text-left">
                          <span className="font-bold text-xs text-[#2B2426] block">{extra.nome}</span>
                          <span className="text-[10px] text-[#756B6D] block">+{extra.duracao} min · {extra.descricao}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-[#B85C78]">+{formatarMoeda(extra.preco)}</span>
                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                              isSelected
                                ? 'bg-[#B85C78] text-white'
                                : 'bg-[#F7E6EA] text-[#B85C78]'
                            }`}
                          >
                            {isJustAdded ? 'Adicionado ✓' : isSelected ? 'Remover' : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo do Pedido Atualizado em Tempo Real */}
              <div className="p-4 rounded-2xl bg-[#2B2426] text-white space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Tempo Total Estimado:</span>
                  <span className="font-bold flex items-center gap-1">
                    <Clock size={12} className="text-[#B85C78]" />
                    <span>{formatarDuracao(calculoTotalModal.duracao)}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                  <span className="font-bold">Valor Estimado:</span>
                  <span className="text-lg font-bold text-[#F7E6EA]">
                    {formatarMoeda(calculoTotalModal.preco)}
                  </span>
                </div>

                <p className="text-[10px] text-white/50 text-center leading-tight">
                  O valor final pode variar conforme avaliação e personalização no atendimento.
                </p>

                <button
                  type="button"
                  onClick={handleContinuarParaHorariosComExtras}
                  className="w-full py-3.5 bg-[#B85C78] hover:bg-[#98455F] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Continuar para Horários</span>
                  <ArrowRight size={15} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 12. BARRA FIXA DE AGENDAMENTO NO RODAPÉ DO CELULAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EEDDE1] p-3 shadow-lg flex items-center justify-between gap-3">
        <div className="pl-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#B85C78] block">Atendimento com Hora</span>
          <span className="font-serif font-bold text-xs text-[#2B2426]">Sheila Santos Nails</span>
        </div>
        <button
          onClick={() => handleIrParaAgendamento()}
          className="px-5 py-2.5 bg-[#B85C78] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 flex items-center gap-1.5"
        >
          <Calendar size={14} />
          <span>Agendar Horário</span>
        </button>
      </div>

      {/* RODAPÉ ELEGANTE & MINIMALISTA (SEM ACESSO PROFISSIONAL) */}
      <footer id="contato" className="bg-white border-t border-[#EEDDE1] py-10 px-4 sm:px-8 mt-12 text-center text-xs text-[#756B6D] space-y-6 pb-20 sm:pb-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="font-serif font-bold text-base text-[#2B2426]">
              {configSalao.nome || 'Sheila Santos Nails Designer'}
            </h4>
            <p className="text-[11px] text-[#756B6D]">
              {configSalao.endereco || 'Atendimento exclusivo com hora marcada'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {configSalao.telefone && (
              <a
                href={gerarLinkWhatsApp(configSalao.telefone, 'Olá Sheila! Gostaria de agendar um horário.')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#2B2426] hover:text-[#B85C78] font-medium transition-colors"
              >
                <Phone size={14} className="text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}

            {configSalao.instagram && (
              <a
                href={`https://instagram.com/${configSalao.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#2B2426] hover:text-[#B85C78] font-medium transition-colors"
              >
                <Instagram size={14} className="text-pink-600" />
                <span>Instagram</span>
              </a>
            )}

            <button
              onClick={() => handleIrParaAgendamento()}
              className="text-xs text-[#B85C78] font-bold hover:underline"
            >
              Agendar Horário
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-[#EEDDE1]/60 text-[11px] text-[#756B6D]/80">
          © {new Date().getFullYear()} {configSalao.nome || 'Sheila Santos Nails Designer'}. Todos os direitos reservados.
        </div>
      </footer>

    </div>
  );
};
