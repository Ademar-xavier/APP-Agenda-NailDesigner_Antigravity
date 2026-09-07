import React, { useState, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico } from '../types';
import { AlicateIcon } from '../components/AlicateIcon';
import { gerarLinkWhatsApp, getCatalogoUrl } from '../utils/urlHelper';

export const PublicCatalogo: React.FC = () => {
  const { 
    servicos, 
    planosAssinatura, 
    configSalao 
  } = useAppState();

  const [busca, setBusca] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas');
  const [copiadoLink, setCopiadoLink] = useState(false);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const limparTextoDescricao = (texto?: string) => {
    if (!texto) return '';
    return texto.replace(/<!--[\s\S]*?-->/g, '').trim();
  };

  // Extrai categorias ativas que possuem pelo menos 1 serviço cadastrado e ativo
  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set<string>();
    servicos.filter(s => s.ativo !== false).forEach(s => {
      if (s.categoria) cats.add(s.categoria);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [servicos]);

  // Filtra serviços
  const servicosFiltrados = useMemo(() => {
    return servicos
      .filter(s => s.ativo !== false)
      .filter(s => {
        if (categoriaSelecionada !== 'todas') {
          if (categoriaSelecionada === 'combos') {
            if (!s.is_pacote) return false;
          } else if (s.categoria !== categoriaSelecionada) {
            return false;
          }
        }
        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const desc = limparTextoDescricao(s.descricao).toLowerCase();
          const nome = s.nome.toLowerCase();
          const cat = s.categoria.toLowerCase();
          return nome.includes(termo) || desc.includes(termo) || cat.includes(termo);
        }
        return true;
      })
      .sort((a, b) => {
        // Destaques primeiro
        if (a.destaque_catalogo && !b.destaque_catalogo) return -1;
        if (!a.destaque_catalogo && b.destaque_catalogo) return 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [servicos, categoriaSelecionada, busca]);

  const planosAtivos = useMemo(() => {
    return (planosAssinatura || []).filter(p => p.ativo !== false);
  }, [planosAssinatura]);

  const handleIrParaAgendamento = (servicoId?: string) => {
    if (servicoId) {
      window.location.hash = `agendar?servico=${encodeURIComponent(servicoId)}`;
    } else {
      window.location.hash = 'agendar';
    }
  };

  const handleChamarWhatsAppServico = (s: Servico) => {
    const msg = `Olá ${configSalao.nome || 'Sheila Santos Nails'}! Vi o serviço "${s.nome}" no seu catálogo e gostaria de mais informações / verificar horários.`;
    const url = gerarLinkWhatsApp(configSalao.telefone, msg);
    if (url) window.open(url, '_blank');
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5A4535] font-sans antialiased flex flex-col selection:bg-[#EFECE6]">
      {/* Top Bar Fixa de Navegação */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#EFECE6] px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt={configSalao.nome || 'Sheila Santos Nails'} 
              className="w-10 h-10 rounded-full object-cover shadow-2xs border border-[#EFECE6]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="font-serif font-bold text-base sm:text-lg text-[#5A4535] leading-tight">
                {configSalao.nome || 'Sheila Santos Nails'}
              </h1>
              <p className="text-[10px] text-[#8C7A6B] flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                <span>Catálogo Oficial de Procedimentos</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopiarLinkCatalogo}
              title="Copiar Link do Catálogo"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#FAF9F6] hover:bg-[#EFECE6] text-[#8C6D58] text-xs font-bold rounded-xl border border-[#EFECE6] transition-all"
            >
              {copiadoLink ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              <span>{copiadoLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              onClick={() => handleIrParaAgendamento()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Calendar size={14} />
              <span>Agendar Horário</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header do Salão */}
      <section className="bg-gradient-to-b from-white to-[#FAF9F6] border-b border-[#EFECE6] py-8 sm:py-12 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-[#F6ECE8] text-[#8C6D58] px-3 py-1 rounded-full text-xs font-bold border border-[#F3ECE0]">
            <Crown size={13} className="text-amber-500" />
            <span>Design de Unhas & Cuidado Especializado</span>
          </div>

          <h2 className="font-serif font-bold text-2xl sm:text-4xl text-[#5A4535] leading-tight">
            Descubra Nossos Procedimentos e Realce Sua Beleza
          </h2>

          <p className="text-xs sm:text-sm text-[#8C7A6B] max-w-2xl mx-auto leading-relaxed">
            Alongamentos em gel, decorações exclusivas, esmaltação em gel e planos recorrentes com atendimento personalizado e materiais de altíssima durabilidade.
          </p>

          {/* Informações de Localização e Contato Rápido */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#8C7A6B] pt-2">
            {configSalao.endereco && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#EFECE6]">
                <MapPin size={13} className="text-[#8C6D58]" />
                <span>{configSalao.endereco}</span>
              </div>
            )}
            {configSalao.telefone && (
              <a 
                href={gerarLinkWhatsApp(configSalao.telefone, 'Olá! Vim pelo catálogo e gostaria de tirar uma dúvida.')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-[#EFECE6] hover:border-emerald-200 text-[#5A4535] hover:text-emerald-700 transition-colors"
              >
                <Phone size={13} className="text-emerald-600" />
                <span>WhatsApp: {configSalao.telefone}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Barra de Busca e Filtros de Categoria */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Campo de Busca */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
              <input 
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar por nome do serviço ou detalhe..."
                className="w-full bg-white border border-[#EFECE6] rounded-2xl pl-10 pr-10 py-2.5 text-xs text-[#5A4535] placeholder-[#C2B7AE] focus:outline-none focus:border-[#8C6D58] shadow-2xs"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#5A4535] p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-xs text-[#8C7A6B] font-semibold whitespace-nowrap">
              {servicosFiltrados.length} {servicosFiltrados.length === 1 ? 'serviço disponível' : 'serviços disponíveis'}
            </div>
          </div>

          {/* Categorias - Pílulas de Seleção */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setCategoriaSelecionada('todas')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                categoriaSelecionada === 'todas'
                  ? 'bg-[#5A4535] text-white shadow-xs'
                  : 'bg-white border border-[#EFECE6] text-[#8C7A6B] hover:bg-[#FAF9F6]'
              }`}
            >
              Todos os Serviços
            </button>

            {/* Se houver pacotes/combos */}
            {servicos.some(s => s.ativo !== false && s.is_pacote) && (
              <button
                onClick={() => setCategoriaSelecionada('combos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  categoriaSelecionada === 'combos'
                    ? 'bg-[#8C6D58] text-white shadow-xs'
                    : 'bg-white border border-[#EFECE6] text-[#8C7A6B] hover:bg-[#FAF9F6]'
                }`}
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>Combos & Pacotes</span>
              </button>
            )}

            {categoriasDisponiveis.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaSelecionada(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  categoriaSelecionada === cat
                    ? 'bg-[#5A4535] text-white shadow-xs'
                    : 'bg-white border border-[#EFECE6] text-[#8C7A6B] hover:bg-[#FAF9F6]'
                }`}
              >
                {cat}
              </button>
            ))}

            {planosAtivos.length > 0 && (
              <a
                href="#clube-vip"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 flex items-center gap-1"
              >
                <Crown size={12} className="text-amber-600" />
                <span>Clube VIP Assinatura</span>
              </a>
            )}
          </div>
        </div>

        {/* Grid de Cards de Serviços */}
        {servicosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EFECE6] p-12 text-center text-[#8C7A6B] space-y-3">
            <Search size={40} className="mx-auto text-[#E8DEC9]" />
            <h3 className="font-serif font-bold text-base text-[#5A4535]">Nenhum procedimento encontrado</h3>
            <p className="text-xs text-[#8C7A6B] max-w-sm mx-auto">
              Nenhum serviço corresponde à sua pesquisa ou categoria selecionada. Tente limpar os filtros.
            </p>
            <button
              onClick={() => { setBusca(''); setCategoriaSelecionada('todas'); }}
              className="px-4 py-2 bg-[#8C6D58] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#725743] transition-colors"
            >
              Ver Todos os Procedimentos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicosFiltrados.map(s => {
              const desc = limparTextoDescricao(s.descricao);
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-[#EFECE6] hover:border-[#8C6D58]/60 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Foto do Serviço / Banner */}
                  <div className="relative aspect-4/3 w-full bg-[#FAF9F6] overflow-hidden">
                    {s.foto ? (
                      <img 
                        src={s.foto} 
                        alt={s.nome} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#8C7A6B] bg-gradient-to-br from-[#FAF6F0] to-[#F3ECE0] p-6 text-center">
                        <div className="p-3 bg-white/80 rounded-2xl shadow-2xs mb-2 text-[#8C6D58]">
                          <AlicateIcon size={28} />
                        </div>
                        <span className="text-[11px] font-bold text-[#8C6D58] uppercase tracking-wider">
                          {s.categoria}
                        </span>
                      </div>
                    )}

                    {/* Badges Flutuantes */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      {s.destaque_catalogo && (
                        <span className="bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 uppercase tracking-wide">
                          <Sparkles size={10} />
                          <span>Destaque</span>
                        </span>
                      )}
                      {s.is_pacote && (
                        <span className="bg-[#8C6D58] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wide">
                          Combo
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Clock size={11} />
                        <span>{s.duracao_minutos} min</span>
                      </span>
                    </div>
                  </div>

                  {/* Informações do Serviço */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                          {s.categoria}
                        </span>
                        {s.intervalo_manutencao_dias > 0 && (
                          <span className="text-[9px] text-[#8C6D58] bg-[#F6ECE8] px-1.5 py-0.5 rounded font-medium">
                            Retorno: {s.intervalo_manutencao_dias} dias
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif font-bold text-base text-[#5A4535] leading-snug group-hover:text-[#8C6D58] transition-colors">
                        {s.nome}
                      </h3>

                      {desc ? (
                        <p className="text-xs text-[#8C7A6B] line-clamp-3 leading-relaxed">
                          {desc}
                        </p>
                      ) : (
                        <p className="text-xs text-[#C2B7AE] italic">
                          Procedimento executado com produtos profissionais de alta performance.
                        </p>
                      )}
                    </div>

                    {/* Preço & Regra de Sinal */}
                    <div className="pt-3 border-t border-[#FAF9F6] space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-[#8C7A6B]">Valor do investimento:</span>
                        <span className="font-serif font-extrabold text-xl text-[#5A4535]">
                          {formatarMoeda(s.preco)}
                        </span>
                      </div>

                      {s.sinal_tipo && s.sinal_tipo !== 'nenhum' && Number(s.sinal_valor) > 0 ? (
                        <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                          <Info size={11} className="shrink-0 text-amber-600" />
                          <span>
                            Reserva com sinal de {s.sinal_tipo === 'fixo' ? formatarMoeda(Number(s.sinal_valor)) : `${s.sinal_valor}%`}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                          <Check size={11} className="shrink-0 text-emerald-600" />
                          <span>Pagamento realizado no dia do atendimento</span>
                        </p>
                      )}

                      {/* Botões de Ação */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleChamarWhatsAppServico(s)}
                          className="py-2.5 px-3 rounded-xl border border-[#EFECE6] bg-white hover:bg-emerald-50 hover:border-emerald-200 text-[#5A4535] hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <MessageCircle size={14} className="text-emerald-600" />
                          <span>Dúvidas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleIrParaAgendamento(s.id)}
                          className="py-2.5 px-3 rounded-xl bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <span>Agendar</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ======================================================== */}
        {/* SEÇÃO DO CLUBE DE ASSINATURA VIP (Se houver planos) */}
        {/* ======================================================== */}
        {planosAtivos.length > 0 && (
          <section id="clube-vip" className="mt-14 pt-10 border-t border-[#EFECE6] space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">
                <Crown size={14} className="text-amber-600" />
                <span>Clube VIP de Assinatura Recorrente</span>
              </div>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#5A4535]">
                Suas Unhas Impecáveis o Mês Inteiro
              </h2>
              <p className="text-xs sm:text-sm text-[#8C7A6B]">
                Garanta horários fixos toda semana, prioridade máxima de agendamento e descontos exclusivos nos nossos planos de assinatura.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planosAtivos.map(plano => (
                <div 
                  key={plano.id}
                  className="bg-white rounded-2xl border-2 border-amber-200/80 p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-bl-full pointer-events-none -mr-6 -mt-6" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                        VIP Club
                      </span>
                      <span className="text-xs text-[#8C7A6B]">Validade: {plano.validade_dias || 30} dias</span>
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#5A4535]">{plano.nome}</h3>
                      {plano.descricao && (
                        <p className="text-xs text-[#8C7A6B] mt-1 leading-relaxed">
                          {plano.descricao}
                        </p>
                      )}
                    </div>

                    <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#EFECE6] space-y-1.5 text-xs text-[#5A4535]">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span><strong>{plano.qtd_procedimentos_mes} sessões</strong> inclusas no período</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Horário garantido semana a semana</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0" />
                        <span>Prioridade exclusiva na escolha de datas</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#EFECE6] space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[#8C7A6B]">Mensalidade:</span>
                      <span className="font-serif font-extrabold text-2xl text-[#5A4535]">
                        {formatarMoeda(plano.preco_mensal)}
                        <span className="text-xs font-normal text-[#8C7A6B]">/mês</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleIrParaAgendamento()}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-[#8C6D58] hover:from-amber-700 hover:to-[#725743] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Crown size={14} className="text-amber-200" />
                      <span>Quero Fazer Parte do VIP</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Rodapé Elegante */}
      <footer className="bg-white border-t border-[#EFECE6] py-8 px-4 sm:px-8 mt-12 text-center text-xs text-[#8C7A6B] space-y-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="font-serif font-bold text-sm text-[#5A4535]">{configSalao.nome || 'Sheila Santos Nails'}</h4>
            <p className="text-[11px] text-[#8C7A6B] mt-0.5">{configSalao.endereco || 'Atendimento com horário marcado'}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.location.hash = 'admin';
              }}
              className="text-[10px] text-[#8C7A6B] hover:text-[#5A4535] hover:underline"
            >
              Acesso Profissional
            </button>
            <span>·</span>
            <button
              onClick={() => handleIrParaAgendamento()}
              className="text-[10px] text-[#8C6D58] font-bold hover:underline"
            >
              Agendar Horário
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#FAF9F6] text-[10px] text-[#C2B7AE]">
          © {new Date().getFullYear()} {configSalao.nome || 'Sheila Santos Nails'}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};
